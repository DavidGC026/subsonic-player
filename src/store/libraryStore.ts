import { create } from 'zustand/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Artist, Album, Playlist, Song, SearchResult } from '../types';
import { subsonicApi } from '../api/subsonic';

// ---- Types ----

interface LibraryStore {
    // Data
    artists: Artist[];
    albums: Album[];
    playlists: Playlist[];
    customPlaylistImages: Record<string, string>;

    // Loading states
    isLoadingArtists: boolean;
    isLoadingAlbums: boolean;
    isLoadingPlaylists: boolean;

    // Setters
    setArtists: (artists: Artist[]) => void;
    setAlbums: (albums: Album[]) => void;
    setPlaylists: (playlists: Playlist[]) => void;

    // Fetch actions
    fetchArtists: () => Promise<void>;
    fetchAlbums: () => Promise<void>;
    fetchPlaylists: () => Promise<void>;
    fetchAlbumSongs: (albumId: string) => Promise<Song[]>;
    fetchArtistAlbums: (artistId: string) => Promise<Album[]>;
    search: (query: string) => Promise<SearchResult>;

    // Playlist actions
    createPlaylist: (name: string) => Promise<void>;
    deletePlaylist: (playlistId: string) => Promise<void>;
    updatePlaylistName: (playlistId: string, newName: string) => Promise<void>;
    addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
    addSongsToPlaylist: (playlistId: string, songIds: string[]) => Promise<void>;
    removeSongFromPlaylist: (playlistId: string, songIndex: number) => Promise<void>;
    setCustomPlaylistImage: (playlistId: string, uri: string | null) => Promise<void>;
    loadCustomPlaylistImages: () => Promise<void>;
}

// ---- Store ----

export const useLibraryStore = create<LibraryStore>((set, get) => ({
    artists: [],
    albums: [],
    playlists: [],
    customPlaylistImages: {},

    isLoadingArtists: false,
    isLoadingAlbums: false,
    isLoadingPlaylists: false,

    setArtists: (artists: Artist[]) => {
        set({ artists });
    },

    setAlbums: (albums: Album[]) => {
        set({ albums });
    },

    setPlaylists: (playlists: Playlist[]) => {
        set({ playlists });
    },

    // ---- Fetch actions ----

    fetchArtists: async () => {
        set({ isLoadingArtists: true });
        try {
            const artists = await subsonicApi.getArtists();
            set({ artists });
        } catch (error) {
            console.error('Error fetching artists:', error);
        } finally {
            set({ isLoadingArtists: false });
        }
    },

    fetchAlbums: async () => {
        set({ isLoadingAlbums: true });
        try {
            const albums = await subsonicApi.getAlbums('newest', 50);
            set({ albums });
        } catch (error) {
            console.error('Error fetching albums:', error);
        } finally {
            set({ isLoadingAlbums: false });
        }
    },

    fetchPlaylists: async () => {
        set({ isLoadingPlaylists: true });
        try {
            const playlists = await subsonicApi.getPlaylists();
            set({ playlists });
        } catch (error) {
            console.error('Error fetching playlists:', error);
        } finally {
            set({ isLoadingPlaylists: false });
        }
    },

    fetchAlbumSongs: async (albumId: string): Promise<Song[]> => {
        try {
            const { songs } = await subsonicApi.getAlbum(albumId);
            return songs;
        } catch (error) {
            console.error('Error fetching album songs:', error);
            return [];
        }
    },

    fetchArtistAlbums: async (artistId: string): Promise<Album[]> => {
        try {
            const { albums } = await subsonicApi.getArtist(artistId);
            return albums;
        } catch (error) {
            console.error('Error fetching artist albums:', error);
            return [];
        }
    },

    search: async (query: string): Promise<SearchResult> => {
        try {
            return await subsonicApi.search(query);
        } catch (error) {
            console.error('Error searching:', error);
            return {};
        }
    },

    // ---- Playlist actions ----

    createPlaylist: async (name: string) => {
        try {
            await subsonicApi.createPlaylist(name);
            await get().fetchPlaylists();
        } catch (error) {
            console.error('Error creating playlist:', error);
        }
    },

    deletePlaylist: async (playlistId: string) => {
        try {
            await subsonicApi.deletePlaylist(playlistId);
            await get().fetchPlaylists();
        } catch (error) {
            console.error('Error deleting playlist:', error);
        }
    },

    updatePlaylistName: async (playlistId: string, newName: string) => {
        try {
            await subsonicApi.updatePlaylist(playlistId, undefined, newName);
            await get().fetchPlaylists();
        } catch (error) {
            console.error('Error updating playlist name:', error);
        }
    },

    addSongToPlaylist: async (playlistId: string, songId: string) => {
        try {
            await subsonicApi.updatePlaylist(playlistId, songId);
            await get().fetchPlaylists();
        } catch (error) {
            console.error('Error adding song to playlist:', error);
        }
    },

    addSongsToPlaylist: async (playlistId: string, songIds: string[]) => {
        try {
            await subsonicApi.updatePlaylist(playlistId, songIds);
            await get().fetchPlaylists();
        } catch (error) {
            console.error('Error adding songs to playlist:', error);
        }
    },

    removeSongFromPlaylist: async (playlistId: string, songIndex: number) => {
        try {
            await subsonicApi.updatePlaylist(playlistId, undefined, undefined, undefined, songIndex);
            await get().fetchPlaylists();
        } catch (error) {
            console.error('Error removing song from playlist:', error);
        }
    },

    setCustomPlaylistImage: async (playlistId: string, uri: string | null) => {
        try {
            const currentImages = get().customPlaylistImages;
            const newImages = { ...currentImages };
            if (uri) {
                newImages[playlistId] = uri;
            } else {
                delete newImages[playlistId];
            }
            set({ customPlaylistImages: newImages });
            await AsyncStorage.setItem('customPlaylistImages', JSON.stringify(newImages));
        } catch (error) {
            console.error('Error saving custom playlist image:', error);
        }
    },

    loadCustomPlaylistImages: async () => {
        try {
            const stored = await AsyncStorage.getItem('customPlaylistImages');
            if (stored) {
                set({ customPlaylistImages: JSON.parse(stored) });
            }
        } catch (error) {
            console.error('Error loading custom playlist images:', error);
        }
    },
}));

export default useLibraryStore;
