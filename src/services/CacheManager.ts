import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '../types';

const CACHE_DIR_NAME = 'music_cache';
const CACHE_INDEX_KEY = '@music_cache_index';

// Lazily resolved cache directory
let cacheDir: Directory | null = null;

function getCacheDir(): Directory {
    if (!cacheDir) {
        cacheDir = new Directory(Paths.document, CACHE_DIR_NAME);
    }
    return cacheDir;
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
     * and starts a background download to cache the song for future plays.
     */
    getPlaybackUri: async (song: Song, remoteUrl: string): Promise<string> => {
        const file = new File(getCacheDir(), `${song.id}.mp3`);

        if (file.exists) {
            console.log(`[Cache] Serving local: ${song.title}`);
            return file.uri;
        }

        // File not cached — stream remotely and start background download
        console.log(`[Cache] Streaming remote: ${song.title}`);
        CacheManager.downloadSong(song, remoteUrl);
        return remoteUrl;
    },

    /**
     * Download a song to the local cache folder using expo-file-system's
     * native download mechanism. Runs silently in the background.
     */
    downloadSong: async (song: Song, remoteUrl: string) => {
        const destination = new File(getCacheDir(), `${song.id}.mp3`);
        try {
            await File.downloadFileAsync(remoteUrl, destination, { idempotent: true });
            await CacheManager.addToIndex(song.id);
            console.log(`[Cache] Downloaded: ${song.title}`);
        } catch (error) {
            console.error('[Cache Error] Download failed:', error);
        }
    },

    /**
     * Add a song ID to the AsyncStorage cache index for fast lookups.
     */
    addToIndex: async (songId: string) => {
        const index = await CacheManager.getIndex();
        if (!index.includes(songId)) {
            index.push(songId);
            await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
        }
    },

    /**
     * Retrieve the full list of cached song IDs from AsyncStorage.
     */
    getIndex: async (): Promise<string[]> => {
        const data = await AsyncStorage.getItem(CACHE_INDEX_KEY);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Check if a specific song is cached (index-based, no disk I/O).
     */
    isCached: async (songId: string): Promise<boolean> => {
        const index = await CacheManager.getIndex();
        return index.includes(songId);
    },

    /**
     * Remove a specific song from the cache (both file and index).
     */
    removeSong: async (songId: string) => {
        const file = new File(getCacheDir(), `${songId}.mp3`);
        try {
            if (file.exists) {
                file.delete();
            }
            const index = await CacheManager.getIndex();
            const newIndex = index.filter((id) => id !== songId);
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
        const index = await CacheManager.getIndex();
        return index.length;
    },
};
