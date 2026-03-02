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
            if (stored) {
                const parsed = JSON.parse(stored) as Record<string, DownloadedSong>;
                set({ downloadedSongs: parsed });
            }
            if (storedPlaylists) {
                const parsedPlaylists = JSON.parse(storedPlaylists) as Record<string, DownloadedPlaylist>;
                set({ downloadedPlaylists: parsedPlaylists });
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

        // Filter out already downloaded songs
        const songsToDownload = songs.filter((s) => !downloadedSongs[s.id]);

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

    getTotalSize: () => {
        const { downloadedSongs } = get();
        return Object.values(downloadedSongs).reduce((total, d) => total + d.fileSize, 0);
    },

    cancelPlaylistDownload: () => {
        playlistDownloadCancelled = true;
    },
}));
