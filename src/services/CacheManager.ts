import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '../types';

const CACHE_DIR_NAME = 'music_cache';
const CACHE_INDEX_KEY = '@music_cache_index_v2';
const MAX_CACHE_SIZE_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

// --- Index types ---
interface CacheEntry {
    songId: string;
    extension: string; // e.g. 'mp3', 'flac', 'ogg', '' (no extension)
    fileSize: number; // bytes
    lastAccessed: number; // epoch ms
}

// --- Active downloads tracking for race-condition prevention ---
const activeDownloads = new Map<string, AbortController>();

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
        console.log('[Cache] Initialized at:', dir.uri);
    },

    /**
     * Get the playback URI for a song.
     * Returns the local cached file URI if available, otherwise returns the remote URL
     * and optionally starts a background download to cache the song for future plays.
     */
    getPlaybackUri: async (song: Song, remoteUrl: string, startDownload: boolean = true): Promise<string> => {
        const ext = getExtension(song);
        const fileName = getFileName(song.id, ext);
        const file = new File(getCacheDir(), fileName);

        if (file.exists) {
            console.log(`[Cache] Serving local: ${song.title}`);
            // Update lastAccessed in the LRU index
            CacheManager._touchEntry(song.id).catch(() => { });
            return file.uri;
        }

        // File not cached — stream remotely
        if (startDownload) {
            console.log(`[Cache] Streaming remote and caching: ${song.title}`);
            CacheManager.downloadSong(song, remoteUrl);
        } else {
            console.log(`[Cache] Streaming remote without caching: ${song.title}`);
        }
        return remoteUrl;
    },

    /**
     * Download a song to the local cache folder using expo-file-system's
     * native download mechanism. Runs silently in the background.
     *
     * Includes race-condition prevention: if a download for the same song
     * is already in progress, the previous one is cancelled.
     */
    downloadSong: async (song: Song, remoteUrl: string) => {
        // Cancel any in-flight download for this song
        const existing = activeDownloads.get(song.id);
        if (existing) {
            existing.abort();
            activeDownloads.delete(song.id);
        }

        const controller = new AbortController();
        activeDownloads.set(song.id, controller);

        const ext = getExtension(song);
        const fileName = getFileName(song.id, ext);
        const destination = new File(getCacheDir(), fileName);

        try {
            // Check if aborted before starting
            if (controller.signal.aborted) return;

            await File.downloadFileAsync(remoteUrl, destination, { idempotent: true });

            // Check if aborted during download
            if (controller.signal.aborted) {
                // Clean up partially downloaded file
                if (destination.exists) destination.delete();
                return;
            }

            const fileSize = destination.exists ? destination.size : 0;
            await CacheManager._addToIndex(song.id, ext, fileSize);
            console.log(`[Cache] Downloaded: ${song.title} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

            // Enforce cache size limit after each download
            await CacheManager._enforceLimit();
        } catch (error: any) {
            if (error?.name === 'AbortError' || controller.signal.aborted) {
                console.log(`[Cache] Download cancelled: ${song.title}`);
                if (destination.exists) destination.delete();
            } else {
                console.error('[Cache Error] Download failed:', error);
            }
        } finally {
            activeDownloads.delete(song.id);
        }
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
     */
    _enforceLimit: async () => {
        const index = await CacheManager._getIndex();
        let totalSize = index.reduce((sum, e) => sum + e.fileSize, 0);

        if (totalSize <= MAX_CACHE_SIZE_BYTES) return;

        // Sort by lastAccessed ascending (oldest first)
        const sorted = [...index].sort((a, b) => a.lastAccessed - b.lastAccessed);
        const toRemove: string[] = [];

        for (const entry of sorted) {
            if (totalSize <= MAX_CACHE_SIZE_BYTES) break;
            toRemove.push(entry.songId);
            totalSize -= entry.fileSize;
        }

        // Delete files and update index
        for (const songId of toRemove) {
            const entry = index.find(e => e.songId === songId);
            if (entry) {
                const fileName = getFileName(songId, entry.extension);
                const file = new File(getCacheDir(), fileName);
                if (file.exists) file.delete();
                console.log(`[Cache LRU] Evicted: ${songId}`);
            }
        }

        const newIndex = index.filter(e => !toRemove.includes(e.songId));
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(newIndex));
        console.log(`[Cache LRU] Evicted ${toRemove.length} songs to stay under limit`);
    },

    // ---- Public query methods ----

    /**
     * Check if a specific song is cached (index-based, no disk I/O).
     */
    isCached: async (songId: string): Promise<boolean> => {
        const index = await CacheManager._getIndex();
        return index.some(e => e.songId === songId);
    },

    /**
     * Remove a specific song from the cache (both file and index).
     */
    removeSong: async (songId: string) => {
        try {
            const index = await CacheManager._getIndex();
            const entry = index.find(e => e.songId === songId);

            if (entry) {
                const fileName = getFileName(songId, entry.extension);
                const file = new File(getCacheDir(), fileName);
                if (file.exists) file.delete();
            } else {
                // Fallback: try common extensions if entry not in index
                for (const ext of ['mp3', 'flac', 'ogg', '']) {
                    const fileName = getFileName(songId, ext);
                    const file = new File(getCacheDir(), fileName);
                    if (file.exists) {
                        file.delete();
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
            await AsyncStorage.removeItem(CACHE_INDEX_KEY);
            console.log('[Cache] All cache cleared');
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
     * Returns 0 if the file does not exist.
     */
    getFileSize: (songId: string): number => {
        // Try common extensions for backwards compat
        for (const ext of ['mp3', 'flac', 'ogg', '']) {
            const fileName = getFileName(songId, ext);
            const file = new File(getCacheDir(), fileName);
            if (file.exists) return file.size;
        }
        return 0;
    },

    /**
     * Get the local file URI for a cached song.
     * Returns null if the file does not exist.
     */
    getLocalUri: (songId: string): string | null => {
        for (const ext of ['mp3', 'flac', 'ogg', '']) {
            const fileName = getFileName(songId, ext);
            const file = new File(getCacheDir(), fileName);
            if (file.exists) return file.uri;
        }
        return null;
    },
};
