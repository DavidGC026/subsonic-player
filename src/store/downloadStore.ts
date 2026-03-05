import { create } from 'zustand/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager } from '../services/CacheManager';
import { subsonicApi } from '../api/subsonic';
import type { Song } from '../types';

const DOWNLOADS_KEY = '@downloaded_songs';

export interface DownloadedSong {
    song: Song;
    downloadedAt: number; // timestamp
    fileSize: number; // bytes
}

interface DownloadProgress {
    songId: string;
    songTitle: string;
}

interface PlaylistDownloadProgress {
    playlistId: string;
    total: number;
    completed: number;
    currentSongTitle: string;
}

export interface DownloadedPlaylist {
    playlist: import('../types').Playlist;
    songs: Song[];
    downloadedAt: number;
}

interface DownloadStore {
    // State
    downloadedSongs: Record<string, DownloadedSong>;
    downloadedPlaylists: Record<string, DownloadedPlaylist>;
    currentDownload: DownloadProgress | null;
    playlistDownloadProgress: PlaylistDownloadProgress | null;

    // Actions
    loadDownloads: () => Promise<void>;
    downloadSong: (song: Song) => Promise<void>;
    downloadPlaylist: (playlist: import('../types').Playlist, songs: Song[]) => Promise<void>;
    removeDownload: (songId: string) => Promise<void>;
    removePlaylistDownload: (playlistId: string) => Promise<void>;
    removeAllDownloads: () => Promise<void>;
    isDownloaded: (songId: string) => boolean;
    validateDownload: (songId: string) => boolean;
    getTotalSize: () => number;
    cancelPlaylistDownload: () => void;
}

let playlistDownloadCancelled = false;
const PLAYLISTS_KEY = '@downloaded_playlists';

export const useDownloadStore = create<DownloadStore>((set, get) => ({
    downloadedSongs: {},
    downloadedPlaylists: {},
    currentDownload: null,
    playlistDownloadProgress: null,

    loadDownloads: async () => {
        try {
            const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
            const storedPlaylists = await AsyncStorage.getItem(PLAYLISTS_KEY);

            let downloadedSongs: Record<string, DownloadedSong> = {};
            let downloadedPlaylists: Record<string, DownloadedPlaylist> = {};

            if (stored) {
                const parsed = JSON.parse(stored) as Record<string, DownloadedSong>;

                // Validate all downloads on load — remove entries whose files are
                // missing or corrupt (0 bytes, too small, etc.)
                const validEntries: Record<string, DownloadedSong> = {};
                const invalidIds: string[] = [];

                for (const [id, entry] of Object.entries(parsed)) {
                    const suffix = entry.song?.suffix;
                    if (CacheManager.validateDownload(id, suffix)) {
                        // Re-read actual file size from disk (in case it differs from stored)
                        const actualSize = CacheManager.getFileSize(id, suffix);
                        validEntries[id] = {
                            ...entry,
                            fileSize: actualSize > 0 ? actualSize : entry.fileSize,
                        };
                    } else {
                        invalidIds.push(id);
                        console.warn(`[Downloads] Removing invalid download: ${entry.song?.title || id} (file missing or corrupt)`);
                    }
                }

                if (invalidIds.length > 0) {
                    console.log(`[Downloads] Cleaned up ${invalidIds.length} invalid download(s)`);
                    // Persist the cleaned-up list
                    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(validEntries));
                }

                downloadedSongs = validEntries;
            }

            if (storedPlaylists) {
                downloadedPlaylists = JSON.parse(storedPlaylists) as Record<string, DownloadedPlaylist>;
            }

            set({ downloadedSongs, downloadedPlaylists });

            // Register all valid downloaded songs as protected from LRU eviction
            CacheManager.setProtectedIds(Object.keys(downloadedSongs));

            // Backfill cover art for existing downloads (in background)
            // This ensures songs downloaded before the cover art cache feature
            // also have their artwork available offline.
            const songsNeedingArt = Object.values(downloadedSongs).filter(
                (d) => d.song?.coverArt
            );
            if (songsNeedingArt.length > 0) {
                (async () => {
                    for (const d of songsNeedingArt) {
                        const coverUrl = subsonicApi.getCoverArtUrl(d.song.coverArt, 600);
                        if (coverUrl) {
                            // downloadCoverArt skips if already cached
                            await CacheManager.downloadCoverArt(d.song.coverArt!, coverUrl).catch(() => { });
                        }
                    }
                })();
            }
        } catch (error) {
            console.error('[Downloads] Error loading downloads:', error);
        }
    },

    downloadSong: async (song: Song) => {
        const { downloadedSongs } = get();

        // Already downloaded — but verify the file is actually valid
        if (downloadedSongs[song.id]) {
            if (CacheManager.validateDownload(song.id, song.suffix)) {
                console.log(`[Downloads] Already downloaded and valid: ${song.title}`);
                return;
            } else {
                // File is corrupt or missing — remove the stale entry and re-download
                console.warn(`[Downloads] Stale download entry for "${song.title}", re-downloading...`);
                const newDownloads = { ...get().downloadedSongs };
                delete newDownloads[song.id];
                set({ downloadedSongs: newDownloads });
                await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));
            }
        }

        set({ currentDownload: { songId: song.id, songTitle: song.title } });

        // Protect BEFORE downloading so LRU eviction never touches this song
        CacheManager.addProtectedId(song.id);

        try {
            const remoteUrl = subsonicApi.getStreamUrl(song.id);
            // downloadSong returns the validated file size directly (0 on failure)
            const fileSize = await CacheManager.downloadSong(song, remoteUrl);

            if (fileSize === 0) {
                console.error(`[Downloads] Download failed for: ${song.title}`);
                CacheManager.removeProtectedId(song.id); // Unprotect on failure
                set({ currentDownload: null });
                return;
            }

            const downloadedSong: DownloadedSong = {
                song,
                downloadedAt: Date.now(),
                fileSize,
            };

            const newDownloads = { ...get().downloadedSongs, [song.id]: downloadedSong };
            set({ downloadedSongs: newDownloads, currentDownload: null });
            await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));

            // Cache cover art for offline use
            if (song.coverArt) {
                const coverUrl = subsonicApi.getCoverArtUrl(song.coverArt, 600);
                if (coverUrl) {
                    CacheManager.downloadCoverArt(song.coverArt, coverUrl).catch(() => { });
                }
            }

            console.log(`[Downloads] Saved: ${song.title} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
        } catch (error) {
            console.error('[Downloads] Error downloading song:', error);
            CacheManager.removeProtectedId(song.id); // Unprotect on failure
            set({ currentDownload: null });
        }
    },

    downloadPlaylist: async (playlist: import('../types').Playlist, songs: Song[]) => {
        const { downloadedSongs } = get();
        playlistDownloadCancelled = false;

        // Always try to cache the playlist info itself when 'download' is issued
        const downloadedPlaylist: DownloadedPlaylist = {
            playlist,
            songs,
            downloadedAt: Date.now()
        };

        const newPlaylists = { ...get().downloadedPlaylists, [playlist.id]: downloadedPlaylist };
        set({ downloadedPlaylists: newPlaylists });
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(newPlaylists));

        // Filter out already downloaded songs (but validate them first)
        const songsToDownload = songs.filter((s) => {
            if (!downloadedSongs[s.id]) return true;
            // Verify the existing download is still valid
            if (!CacheManager.validateDownload(s.id, s.suffix)) {
                console.warn(`[Downloads] Playlist: stale download for "${s.title}", will re-download`);
                return true;
            }
            return false;
        });

        if (songsToDownload.length === 0) return;

        set({
            playlistDownloadProgress: {
                playlistId: playlist.id,
                total: songsToDownload.length,
                completed: 0,
                currentSongTitle: songsToDownload[0].title,
            },
        });

        for (let i = 0; i < songsToDownload.length; i++) {
            if (playlistDownloadCancelled) {
                set({ playlistDownloadProgress: null });
                return;
            }

            const song = songsToDownload[i];

            set({
                playlistDownloadProgress: {
                    playlistId: playlist.id,
                    total: songsToDownload.length,
                    completed: i,
                    currentSongTitle: song.title,
                },
            });

            try {
                // Protect BEFORE downloading so LRU never evicts this song
                CacheManager.addProtectedId(song.id);

                const remoteUrl = subsonicApi.getStreamUrl(song.id);
                // downloadSong returns validated file size directly (0 on failure)
                const fileSize = await CacheManager.downloadSong(song, remoteUrl);

                if (fileSize === 0) {
                    console.error(`[Downloads] Playlist download failed for: ${song.title}, skipping`);
                    CacheManager.removeProtectedId(song.id); // Unprotect on failure
                    continue;
                }

                const downloadedSong: DownloadedSong = {
                    song,
                    downloadedAt: Date.now(),
                    fileSize,
                };

                const newDownloads = { ...get().downloadedSongs, [song.id]: downloadedSong };
                set({ downloadedSongs: newDownloads });
                await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));

                // Cache cover art for offline use
                if (song.coverArt) {
                    const coverUrl = subsonicApi.getCoverArtUrl(song.coverArt, 600);
                    if (coverUrl) {
                        CacheManager.downloadCoverArt(song.coverArt, coverUrl).catch(() => { });
                    }
                }
            } catch (error) {
                console.error(`[Downloads] Error downloading ${song.title}:`, error);
                CacheManager.removeProtectedId(song.id); // Unprotect on failure
            }
        }

        set({ playlistDownloadProgress: null });
    },

    removeDownload: async (songId: string) => {
        try {
            // Unprotect before removing so LRU can reclaim if needed
            CacheManager.removeProtectedId(songId);
            await CacheManager.removeSong(songId);

            const newDownloads = { ...get().downloadedSongs };
            delete newDownloads[songId];
            set({ downloadedSongs: newDownloads });
            await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));
        } catch (error) {
            console.error('[Downloads] Error removing download:', error);
        }
    },

    removePlaylistDownload: async (playlistId: string) => {
        try {
            const newPlaylists = { ...get().downloadedPlaylists };
            delete newPlaylists[playlistId];
            set({ downloadedPlaylists: newPlaylists });
            await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(newPlaylists));
        } catch (error) {
            console.error('[Downloads] Error removing playlist info:', error);
        }
    },

    removeAllDownloads: async () => {
        try {
            CacheManager.clearProtectedIds();
            await CacheManager.clearAll();
            set({ downloadedSongs: {}, downloadedPlaylists: {} });
            await AsyncStorage.removeItem(DOWNLOADS_KEY);
            await AsyncStorage.removeItem(PLAYLISTS_KEY);
        } catch (error) {
            console.error('[Downloads] Error removing all downloads:', error);
        }
    },

    isDownloaded: (songId: string) => {
        return !!get().downloadedSongs[songId];
    },

    /**
     * Validate that a downloaded song is still valid on disk.
     * If not, removes the stale entry from the store.
     */
    validateDownload: (songId: string) => {
        const { downloadedSongs } = get();
        if (!downloadedSongs[songId]) return false;

        const suffix = downloadedSongs[songId].song?.suffix;
        const isValid = CacheManager.validateDownload(songId, suffix);
        if (!isValid) {
            // Clean up stale entry
            console.warn(`[Downloads] validateDownload: removing stale entry for ${songId}`);
            const newDownloads = { ...downloadedSongs };
            delete newDownloads[songId];
            set({ downloadedSongs: newDownloads });
            AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads)).catch(() => { });
        }
        return isValid;
    },

    getTotalSize: () => {
        const { downloadedSongs } = get();
        return Object.values(downloadedSongs).reduce((total, d) => total + d.fileSize, 0);
    },

    cancelPlaylistDownload: () => {
        playlistDownloadCancelled = true;
    },
}));
