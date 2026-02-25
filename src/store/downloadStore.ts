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

interface DownloadStore {
    // State
    downloadedSongs: Record<string, DownloadedSong>;
    currentDownload: DownloadProgress | null;
    playlistDownloadProgress: PlaylistDownloadProgress | null;

    // Actions
    loadDownloads: () => Promise<void>;
    downloadSong: (song: Song) => Promise<void>;
    downloadPlaylist: (playlistId: string, songs: Song[]) => Promise<void>;
    removeDownload: (songId: string) => Promise<void>;
    removeAllDownloads: () => Promise<void>;
    isDownloaded: (songId: string) => boolean;
    getTotalSize: () => number;
    cancelPlaylistDownload: () => void;
}

let playlistDownloadCancelled = false;

export const useDownloadStore = create<DownloadStore>((set, get) => ({
    downloadedSongs: {},
    currentDownload: null,
    playlistDownloadProgress: null,

    loadDownloads: async () => {
        try {
            const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Record<string, DownloadedSong>;
                set({ downloadedSongs: parsed });
            }
        } catch (error) {
            console.error('[Downloads] Error loading downloads:', error);
        }
    },

    downloadSong: async (song: Song) => {
        const { downloadedSongs } = get();

        // Already downloaded
        if (downloadedSongs[song.id]) return;

        set({ currentDownload: { songId: song.id, songTitle: song.title } });

        try {
            const remoteUrl = subsonicApi.getStreamUrl(song.id);
            await CacheManager.downloadSong(song, remoteUrl);

            // Get file size from the cached file
            const fileSize = CacheManager.getFileSize(song.id);

            const downloadedSong: DownloadedSong = {
                song,
                downloadedAt: Date.now(),
                fileSize,
            };

            const newDownloads = { ...get().downloadedSongs, [song.id]: downloadedSong };
            set({ downloadedSongs: newDownloads, currentDownload: null });
            await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));

            console.log(`[Downloads] Saved: ${song.title}`);
        } catch (error) {
            console.error('[Downloads] Error downloading song:', error);
            set({ currentDownload: null });
        }
    },

    downloadPlaylist: async (playlistId: string, songs: Song[]) => {
        const { downloadedSongs } = get();
        playlistDownloadCancelled = false;

        // Filter out already downloaded songs
        const songsToDownload = songs.filter((s) => !downloadedSongs[s.id]);

        if (songsToDownload.length === 0) return;

        set({
            playlistDownloadProgress: {
                playlistId,
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
                    playlistId,
                    total: songsToDownload.length,
                    completed: i,
                    currentSongTitle: song.title,
                },
            });

            try {
                const remoteUrl = subsonicApi.getStreamUrl(song.id);
                await CacheManager.downloadSong(song, remoteUrl);

                const fileSize = CacheManager.getFileSize(song.id);

                const downloadedSong: DownloadedSong = {
                    song,
                    downloadedAt: Date.now(),
                    fileSize,
                };

                const newDownloads = { ...get().downloadedSongs, [song.id]: downloadedSong };
                set({ downloadedSongs: newDownloads });
                await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));
            } catch (error) {
                console.error(`[Downloads] Error downloading ${song.title}:`, error);
            }
        }

        set({ playlistDownloadProgress: null });
    },

    removeDownload: async (songId: string) => {
        try {
            await CacheManager.removeSong(songId);

            const newDownloads = { ...get().downloadedSongs };
            delete newDownloads[songId];
            set({ downloadedSongs: newDownloads });
            await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));
        } catch (error) {
            console.error('[Downloads] Error removing download:', error);
        }
    },

    removeAllDownloads: async () => {
        try {
            await CacheManager.clearAll();
            set({ downloadedSongs: {} });
            await AsyncStorage.removeItem(DOWNLOADS_KEY);
        } catch (error) {
            console.error('[Downloads] Error removing all downloads:', error);
        }
    },

    isDownloaded: (songId: string) => {
        return !!get().downloadedSongs[songId];
    },

    getTotalSize: () => {
        const { downloadedSongs } = get();
        return Object.values(downloadedSongs).reduce((total, d) => total + d.fileSize, 0);
    },

    cancelPlaylistDownload: () => {
        playlistDownloadCancelled = true;
    },
}));
