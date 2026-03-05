import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '../types';

const CACHE_DIR_NAME = 'music_cache';
const CACHE_INDEX_KEY = '@music_cache_index_v2';
const MAX_CACHE_SIZE_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

// Minimum valid file size in bytes — anything smaller is considered corrupt
const MIN_VALID_FILE_SIZE = 1024; // 1 KB

// Maximum number of retry attempts for a download
const MAX_DOWNLOAD_RETRIES = 2;

// --- Index types ---
interface CacheEntry {
    songId: string;
    extension: string; // e.g. 'mp3', 'flac', 'ogg', '' (no extension)
    fileSize: number; // bytes
    lastAccessed: number; // epoch ms
}

// --- Active downloads tracking for race-condition prevention ---
const activeDownloads = new Map<string, AbortController>();
// Track download promises so concurrent callers can await the same download
const activeDownloadPromises = new Map<string, Promise<number>>();

// --- Protected song IDs (downloaded songs that must NEVER be evicted by LRU) ---
const protectedSongIds = new Set<string>();

// Lazily resolved cache directory
let cacheDir: Directory | null = null;

function getCacheDir(): Directory {
    if (!cacheDir) {
        cacheDir = new Directory(Paths.document, CACHE_DIR_NAME);
    }
    return cacheDir;
}

/**
 * Determine the file extension to use for a cached song.
 * Uses Song.suffix if available, otherwise falls back to no extension.
 */
function getExtension(song: Song): string {
    if (song.suffix) {
        return song.suffix; // e.g. 'mp3', 'flac', 'ogg'
    }
    return ''; // no extension — TrackPlayer reads headers
}

/**
 * Build the filename for a cached song.
 */
function getFileName(songId: string, extension: string): string {
    return extension ? `${songId}.${extension}` : songId;
}

/**
 * All common audio extensions to check when searching for a cached file.
 * The caller's known suffix (if any) is always prepended to this list.
 */
const COMMON_EXTENSIONS = ['mp3', 'flac', 'ogg', 'm4a', 'opus', 'aac', 'wav', 'wma', 'alac', 'webm', 'mp4', ''];

/**
 * Build a de-duplicated extension search list, putting `knownSuffix` first.
 */
function buildExtensionList(knownSuffix?: string): string[] {
    if (!knownSuffix) return COMMON_EXTENSIONS;
    // Put the known suffix first, then the rest (skip duplicates)
    return [knownSuffix, ...COMMON_EXTENSIONS.filter(e => e !== knownSuffix)];
}

/**
 * Validate that a file exists and has a valid size (not empty / corrupt).
 */
function isFileValid(file: File): boolean {
    try {
        return file.exists && file.size >= MIN_VALID_FILE_SIZE;
    } catch {
        return false;
    }
}

// --- Cover art cache ---
const COVER_ART_DIR_NAME = 'cover_art_cache';
let coverArtDir: Directory | null = null;

function getCoverArtDir(): Directory {
    if (!coverArtDir) {
        coverArtDir = new Directory(Paths.document, COVER_ART_DIR_NAME);
    }
    return coverArtDir;
}

export const CacheManager = {
    /**
     * Initialize the cache folder on the device.
     * Must be called once at app startup before any cache operations.
     */
    init: async () => {
        const dir = getCacheDir();
        if (!dir.exists) {
            dir.create();
        }
        const artDir = getCoverArtDir();
        if (!artDir.exists) {
            artDir.create();
        }
        console.log('[Cache] Initialized at:', dir.uri);
    },

    /**
     * Get the playback URI for a song.
     * 
     * PRIORITY ORDER:
     * 1. Local cached file (if it exists AND is valid — not 0 bytes)
     * 2. Remote URL (streamed), with optional background download
     * 
     * If a cached file exists but is invalid (0 bytes or too small),
     * it is deleted and a fresh download is triggered.
     */
    getPlaybackUri: async (song: Song, remoteUrl: string, startDownload: boolean = true): Promise<string> => {
        const ext = getExtension(song);
        const fileName = getFileName(song.id, ext);
        const file = new File(getCacheDir(), fileName);

        if (file.exists) {
            if (isFileValid(file)) {
                console.log(`[Cache] Serving local (${(file.size / 1024 / 1024).toFixed(1)} MB): ${song.title}`);
                // Update lastAccessed in the LRU index
                CacheManager._touchEntry(song.id).catch(() => { });
                return file.uri;
            } else {
                // File exists but is corrupt/empty — delete it and re-download
                console.warn(`[Cache] Corrupt file detected (${file.size} bytes), deleting: ${song.title}`);
                try {
                    file.delete();
                } catch (e) {
                    console.error('[Cache] Error deleting corrupt file:', e);
                }
                // Remove from index too
                CacheManager._removeFromIndex(song.id).catch(() => { });
            }
        }

        // File not cached or was corrupt — stream remotely
        if (startDownload) {
            // If a download is already in progress for this song, don't start another
            if (activeDownloadPromises.has(song.id)) {
                console.log(`[Cache] Download already in progress, streaming remote: ${song.title}`);
            } else {
                console.log(`[Cache] Streaming remote and caching: ${song.title}`);
                CacheManager.downloadSong(song, remoteUrl);
            }
        } else {
            console.log(`[Cache] Streaming remote without caching: ${song.title}`);
        }
        return remoteUrl;
    },

    /**
     * Download a song to the local cache folder using expo-file-system's
     * native download mechanism. Runs silently in the background.
     *
     * Race-condition safe: if a download for the same song is already in
     * progress, the existing promise is returned instead of starting a
     * duplicate download.
     * 
     * Returns the file size in bytes if successful, 0 on failure.
     * The file size is captured at the moment of validation (before LRU
     * eviction), so it's always accurate.
     */
    downloadSong: async (song: Song, remoteUrl: string): Promise<number> => {
        // If a download for this song is already in progress, reuse it
        const existingPromise = activeDownloadPromises.get(song.id);
        if (existingPromise) {
            console.log(`[Cache] Reusing existing download for: ${song.title}`);
            return existingPromise;
        }

        const controller = new AbortController();
        activeDownloads.set(song.id, controller);

        const ext = getExtension(song);
        const fileName = getFileName(song.id, ext);
        const destination = new File(getCacheDir(), fileName);

        const downloadPromise = (async (): Promise<number> => {
            try {
                // Check if aborted before starting
                if (controller.signal.aborted) return 0;

                // Double-check: file might have been cached between the caller's
                // check and the actual start of this download
                if (destination.exists) {
                    if (isFileValid(destination)) {
                        console.log(`[Cache] File already exists and valid, skipping download: ${song.title}`);
                        CacheManager._touchEntry(song.id).catch(() => { });
                        return destination.size;
                    } else {
                        // Delete corrupt existing file before re-downloading
                        console.warn(`[Cache] Existing file is corrupt (${destination.size} bytes), re-downloading: ${song.title}`);
                        try {
                            destination.delete();
                        } catch (e) {
                            console.error('[Cache] Error deleting corrupt file before re-download:', e);
                        }
                    }
                }

                // Download with retries
                let validFileSize = 0;
                for (let attempt = 0; attempt <= MAX_DOWNLOAD_RETRIES; attempt++) {
                    if (controller.signal.aborted) return 0;

                    try {
                        if (attempt > 0) {
                            console.log(`[Cache] Retry attempt ${attempt}/${MAX_DOWNLOAD_RETRIES} for: ${song.title}`);
                            // Clean up failed attempt
                            if (destination.exists) {
                                try { destination.delete(); } catch { }
                            }
                        }

                        await File.downloadFileAsync(remoteUrl, destination, { idempotent: true });

                        // Check if aborted during download
                        if (controller.signal.aborted) {
                            if (destination.exists) {
                                try { destination.delete(); } catch { }
                            }
                            return 0;
                        }

                        // **CRITICAL**: Validate the downloaded file
                        if (!destination.exists) {
                            console.error(`[Cache] Download completed but file doesn't exist: ${song.title}`);
                            continue; // retry
                        }

                        const fileSize = destination.size;
                        if (fileSize < MIN_VALID_FILE_SIZE) {
                            console.error(`[Cache] Download completed but file is too small (${fileSize} bytes): ${song.title}`);
                            try { destination.delete(); } catch { }
                            continue; // retry
                        }

                        // Download is valid! Capture the size NOW before any eviction
                        validFileSize = fileSize;
                        await CacheManager._addToIndex(song.id, ext, fileSize);
                        console.log(`[Cache] Downloaded: ${song.title} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
                        break;
                    } catch (innerError: any) {
                        if (innerError?.name === 'AbortError' || controller.signal.aborted) {
                            console.log(`[Cache] Download cancelled: ${song.title}`);
                            if (destination.exists) {
                                try { destination.delete(); } catch { }
                            }
                            return 0;
                        }
                        console.error(`[Cache Error] Download attempt ${attempt + 1} failed for ${song.title}:`, innerError);
                        // Clean up on failure
                        if (destination.exists) {
                            try { destination.delete(); } catch { }
                        }
                    }
                }

                if (validFileSize > 0) {
                    // Enforce cache size limit after each download
                    await CacheManager._enforceLimit();
                } else {
                    console.error(`[Cache] All download attempts failed for: ${song.title}`);
                }

                return validFileSize;
            } catch (error: any) {
                if (error?.name === 'AbortError' || controller.signal.aborted) {
                    console.log(`[Cache] Download cancelled: ${song.title}`);
                    if (destination.exists) {
                        try { destination.delete(); } catch { }
                    }
                } else {
                    console.error('[Cache Error] Download failed:', error);
                    // Clean up on error
                    if (destination.exists) {
                        try { destination.delete(); } catch { }
                    }
                }
                return 0;
            } finally {
                activeDownloads.delete(song.id);
                activeDownloadPromises.delete(song.id);
            }
        })();

        activeDownloadPromises.set(song.id, downloadPromise);
        return downloadPromise;
    },

    /**
     * Cancel an active download for a specific song.
     * Useful when the user skips a song before the download completes.
     */
    cancelDownload: (songId: string) => {
        const controller = activeDownloads.get(songId);
        if (controller) {
            controller.abort();
            activeDownloads.delete(songId);
            activeDownloadPromises.delete(songId);
            console.log(`[Cache] Cancelled download for: ${songId}`);
        }
    },

    /**
     * Cancel all active downloads.
     */
    cancelAllDownloads: () => {
        for (const [songId, controller] of activeDownloads) {
            controller.abort();
            console.log(`[Cache] Cancelled download for: ${songId}`);
        }
        activeDownloads.clear();
        activeDownloadPromises.clear();
    },

    // ---- Internal index methods (LRU) ----

    /** Add or update a song entry in the cache index. */
    _addToIndex: async (songId: string, extension: string, fileSize: number) => {
        const index = await CacheManager._getIndex();
        const existingIdx = index.findIndex(e => e.songId === songId);
        const entry: CacheEntry = {
            songId,
            extension,
            fileSize,
            lastAccessed: Date.now(),
        };

        if (existingIdx >= 0) {
            index[existingIdx] = entry;
        } else {
            index.push(entry);
        }
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    },

    /** Remove a song entry from the cache index. */
    _removeFromIndex: async (songId: string) => {
        const index = await CacheManager._getIndex();
        const newIndex = index.filter(e => e.songId !== songId);
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(newIndex));
    },

    /** Update the lastAccessed timestamp for a song (LRU touch). */
    _touchEntry: async (songId: string) => {
        const index = await CacheManager._getIndex();
        const entry = index.find(e => e.songId === songId);
        if (entry) {
            entry.lastAccessed = Date.now();
            await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
        }
    },

    /** Retrieve the full cache index. */
    _getIndex: async (): Promise<CacheEntry[]> => {
        const data = await AsyncStorage.getItem(CACHE_INDEX_KEY);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Enforce the max cache size using LRU eviction.
     * Removes least-recently-accessed songs until total size is under limit.
     * 
     * IMPORTANT: Songs in the protectedSongIds set (i.e. explicitly downloaded
     * by the user) are NEVER evicted. Only auto-cached streaming songs are
     * eligible for eviction.
     */
    _enforceLimit: async () => {
        const index = await CacheManager._getIndex();
        let totalSize = index.reduce((sum, e) => sum + e.fileSize, 0);

        if (totalSize <= MAX_CACHE_SIZE_BYTES) return;

        // Sort by lastAccessed ascending (oldest first), but only consider
        // songs that are NOT protected (not explicitly downloaded)
        const evictable = [...index]
            .filter(e => !protectedSongIds.has(e.songId))
            .sort((a, b) => a.lastAccessed - b.lastAccessed);

        const toRemove: string[] = [];

        for (const entry of evictable) {
            if (totalSize <= MAX_CACHE_SIZE_BYTES) break;
            toRemove.push(entry.songId);
            totalSize -= entry.fileSize;
        }

        if (toRemove.length === 0) {
            console.log(`[Cache LRU] All cached songs are protected (downloaded), cannot evict`);
            return;
        }

        // Delete files and update index
        for (const songId of toRemove) {
            const entry = index.find(e => e.songId === songId);
            if (entry) {
                const fileName = getFileName(songId, entry.extension);
                const file = new File(getCacheDir(), fileName);
                if (file.exists) {
                    try { file.delete(); } catch { }
                }
                console.log(`[Cache LRU] Evicted: ${songId}`);
            }
        }

        const newIndex = index.filter(e => !toRemove.includes(e.songId));
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(newIndex));
        console.log(`[Cache LRU] Evicted ${toRemove.length} songs to stay under limit (${protectedSongIds.size} protected)`);
    },

    // ---- Public query methods ----

    /**
     * Check if a specific song is cached AND valid (file exists with valid size).
     * This performs actual disk I/O to verify the file, not just index lookup.
     */
    isCached: async (songId: string): Promise<boolean> => {
        // If currently downloading, consider it "in progress" but not yet cached
        if (activeDownloadPromises.has(songId)) return true;

        // Check the actual file on disk, not just the index
        const index = await CacheManager._getIndex();
        const entry = index.find(e => e.songId === songId);
        if (!entry) return false;

        const fileName = getFileName(songId, entry.extension);
        const file = new File(getCacheDir(), fileName);
        if (!isFileValid(file)) {
            // Index says it's cached but file is missing or corrupt — clean up
            console.warn(`[Cache] isCached: stale index entry for ${songId}, cleaning up`);
            CacheManager._removeFromIndex(songId).catch(() => { });
            return false;
        }

        return true;
    },

    /**
     * Validate that a downloaded song file is actually usable.
     * Returns true if the file exists and has valid size.
     * If the file is corrupt, it is cleaned up automatically.
     * @param suffix - Optional known file suffix (e.g. from song.suffix)
     */
    validateDownload: (songId: string, suffix?: string): boolean => {
        const extensions = buildExtensionList(suffix);
        for (const ext of extensions) {
            const fileName = getFileName(songId, ext);
            const file = new File(getCacheDir(), fileName);
            if (file.exists) {
                if (isFileValid(file)) {
                    return true;
                } else {
                    // File is corrupt — clean it up
                    console.warn(`[Cache] validateDownload: corrupt file (${file.size} bytes) for ${songId}, deleting`);
                    try { file.delete(); } catch { }
                    CacheManager._removeFromIndex(songId).catch(() => { });
                    return false;
                }
            }
        }
        return false;
    },

    /**
     * Remove a specific song from the cache (both file and index).
     */
    removeSong: async (songId: string) => {
        try {
            // Cancel any active download first
            CacheManager.cancelDownload(songId);

            const index = await CacheManager._getIndex();
            const entry = index.find(e => e.songId === songId);

            if (entry) {
                const fileName = getFileName(songId, entry.extension);
                const file = new File(getCacheDir(), fileName);
                if (file.exists) {
                    try { file.delete(); } catch { }
                }
            } else {
                // Fallback: try all common extensions if entry not in index
                for (const ext of COMMON_EXTENSIONS) {
                    const fileName = getFileName(songId, ext);
                    const file = new File(getCacheDir(), fileName);
                    if (file.exists) {
                        try { file.delete(); } catch { }
                        break;
                    }
                }
            }

            const newIndex = index.filter(e => e.songId !== songId);
            await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(newIndex));
        } catch (error) {
            console.error('[Cache Error] Remove failed:', error);
        }
    },

    /**
     * Clear the entire music cache (all files and the index).
     */
    clearAll: async () => {
        try {
            CacheManager.cancelAllDownloads();
            const dir = getCacheDir();
            if (dir.exists) {
                dir.delete();
                dir.create();
            }
            // Also clear cover art cache
            const artDir = getCoverArtDir();
            if (artDir.exists) {
                artDir.delete();
                artDir.create();
            }
            await AsyncStorage.removeItem(CACHE_INDEX_KEY);
            console.log('[Cache] All cache cleared (including cover art)');
        } catch (error) {
            console.error('[Cache Error] Clear failed:', error);
        }
    },

    /**
     * Get the number of cached songs.
     */
    getCachedCount: async (): Promise<number> => {
        const index = await CacheManager._getIndex();
        return index.length;
    },

    /**
     * Get the total cache size in bytes.
     */
    getTotalSize: async (): Promise<number> => {
        const index = await CacheManager._getIndex();
        return index.reduce((sum, e) => sum + e.fileSize, 0);
    },

    /**
     * Get the file size of a cached song in bytes.
     * Returns 0 if the file does not exist or is invalid.
     * @param suffix - Optional known file suffix (e.g. from song.suffix)
     */
    getFileSize: (songId: string, suffix?: string): number => {
        const extensions = buildExtensionList(suffix);
        for (const ext of extensions) {
            const fileName = getFileName(songId, ext);
            const file = new File(getCacheDir(), fileName);
            if (file.exists && isFileValid(file)) return file.size;
        }
        return 0;
    },

    /**
     * Get the local file URI for a cached song.
     * Returns null if the file does not exist or is invalid.
     * @param suffix - Optional known file suffix (e.g. from song.suffix)
     */
    getLocalUri: (songId: string, suffix?: string): string | null => {
        const extensions = buildExtensionList(suffix);
        for (const ext of extensions) {
            const fileName = getFileName(songId, ext);
            const file = new File(getCacheDir(), fileName);
            if (file.exists && isFileValid(file)) return file.uri;
        }
        return null;
    },

    // ---- Protected song IDs (downloaded songs) ----

    /**
     * Set the full set of protected song IDs (songs explicitly downloaded
     * by the user). Protected songs are NEVER evicted by LRU cache cleanup.
     * Called by downloadStore.loadDownloads() at app startup.
     */
    setProtectedIds: (ids: string[]) => {
        protectedSongIds.clear();
        for (const id of ids) {
            protectedSongIds.add(id);
        }
        console.log(`[Cache] Protected ${protectedSongIds.size} downloaded song(s) from LRU eviction`);
    },

    /**
     * Add a single song ID to the protected set (after a new download).
     */
    addProtectedId: (songId: string) => {
        protectedSongIds.add(songId);
    },

    /**
     * Remove a single song ID from the protected set (after removing a download).
     */
    removeProtectedId: (songId: string) => {
        protectedSongIds.delete(songId);
    },

    /**
     * Clear all protected IDs (e.g. when removing all downloads).
     */
    clearProtectedIds: () => {
        protectedSongIds.clear();
    },

    // ---- Cover art caching ----

    /**
     * Download and cache a cover art image for offline use.
     * @param coverArtId - The Subsonic cover art ID
     * @param remoteUrl  - The full remote URL to the cover art
     */
    downloadCoverArt: async (coverArtId: string, remoteUrl: string): Promise<void> => {
        if (!coverArtId) return;

        const fileName = `${coverArtId}.jpg`;
        const destination = new File(getCoverArtDir(), fileName);

        // Already cached
        if (destination.exists && destination.size > 100) return;

        try {
            await File.downloadFileAsync(remoteUrl, destination, { idempotent: true });
            if (destination.exists && destination.size > 100) {
                console.log(`[Cache] Cover art cached: ${coverArtId}`);
            } else {
                // Invalid download — clean up
                if (destination.exists) {
                    try { destination.delete(); } catch { }
                }
            }
        } catch (error) {
            console.warn(`[Cache] Cover art download failed for ${coverArtId}:`, error);
            if (destination.exists) {
                try { destination.delete(); } catch { }
            }
        }
    },

    /**
     * Get the URI for a cover art image.
     * Returns the local cached file if available, otherwise returns the remote URL.
     * @param coverArtId - The Subsonic cover art ID
     * @param remoteUrl  - The full remote URL (fallback)
     */
    getCoverArtUri: (coverArtId: string | undefined, remoteUrl: string | null): string | null => {
        if (!coverArtId) return remoteUrl;

        const fileName = `${coverArtId}.jpg`;
        const file = new File(getCoverArtDir(), fileName);

        if (file.exists && file.size > 100) {
            return file.uri;
        }

        return remoteUrl;
    },

    /**
     * Clear all cached cover art images.
     */
    clearCoverArtCache: async () => {
        try {
            const dir = getCoverArtDir();
            if (dir.exists) {
                dir.delete();
                dir.create();
            }
            console.log('[Cache] Cover art cache cleared');
        } catch (error) {
            console.error('[Cache Error] Clear cover art failed:', error);
        }
    },
};
