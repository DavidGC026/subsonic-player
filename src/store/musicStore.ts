import { create } from 'zustand/react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song, Artist, Album, Playlist, SearchResult } from '../types';
import { subsonicApi } from '../api/subsonic';

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  repeatMode: 'none' | 'all' | 'one';
  shuffleMode: boolean;
  volume: number;
}

interface MusicStore {
  // Player state
  player: PlayerState;
  sound: Audio.Sound | null;

  // Library data
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  customPlaylistImages: Record<string, string>;

  // Loading states
  isLoadingArtists: boolean;
  isLoadingAlbums: boolean;
  isLoadingPlaylists: boolean;

  // Actions
  setCurrentSong: (song: Song | null) => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setRepeatMode: (mode: 'none' | 'all' | 'one') => void;
  toggleShuffle: () => void;
  setVolume: (volume: number) => void;
  loadAndPlaySong: (song: Song) => Promise<void>;
  playSong: (song: Song, queue?: Song[]) => Promise<void>;

  // Library actions
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
  setCustomPlaylistImage: (playlistId: string, uri: string | null) => Promise<void>;
  loadCustomPlaylistImages: () => Promise<void>;

  // Star actions
  toggleStar: (id: string, type: 'song' | 'album' | 'artist', currentlyStarred: boolean) => Promise<void>;

  // Modal states
  optionsModalSong: Song | null;
  playlistModalSong: Song | null;
  setOptionsModalSong: (song: Song | null) => void;
  setPlaylistModalSong: (song: Song | null) => void;
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  // Player state
  player: {
    currentSong: null,
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    position: 0,
    duration: 0,
    repeatMode: 'none',
    shuffleMode: false,
    volume: 1.0,
  },
  sound: null,

  // Library data
  artists: [],
  albums: [],
  playlists: [],
  customPlaylistImages: {},

  // Loading states
  isLoadingArtists: false,
  isLoadingAlbums: false,
  isLoadingPlaylists: false,

  // Modal states
  optionsModalSong: null,
  playlistModalSong: null,

  // Player actions
  setCurrentSong: (song: Song | null) => {
    set((state) => ({
      player: { ...state.player, currentSong: song },
    }));
  },

  setQueue: (songs: Song[]) => {
    set((state) => ({
      player: { ...state.player, queue: songs, currentIndex: songs.length > 0 ? 0 : -1 },
    }));
  },

  addToQueue: (song: Song) => {
    set((state) => ({
      player: { ...state.player, queue: [...state.player.queue, song] },
    }));
  },

  removeFromQueue: (index: number) => {
    set((state) => {
      const newQueue = [...state.player.queue];
      newQueue.splice(index, 1);
      let newIndex = state.player.currentIndex;

      if (index < state.player.currentIndex) {
        newIndex--;
      } else if (index === state.player.currentIndex) {
        return {
          player: {
            ...state.player,
            queue: newQueue,
            currentIndex: newQueue.length > 0 ? 0 : -1,
            currentSong: newQueue.length > 0 ? newQueue[0] : null,
            isPlaying: false,
          },
        };
      }

      return {
        player: { ...state.player, queue: newQueue, currentIndex: newIndex },
      };
    });
  },

  playNext: async () => {
    const { player, sound } = get();
    const { queue, currentIndex, repeatMode, shuffleMode } = player;

    if (queue.length === 0) return;

    let nextIndex: number;

    if (shuffleMode) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;

      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          set((state) => ({
            player: { ...state.player, isPlaying: false },
          }));
          return;
        }
      }
    }

    const nextSong = queue[nextIndex];

    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }

    set((state) => ({
      player: { ...state.player, currentSong: nextSong, currentIndex: nextIndex },
    }));

    await get().loadAndPlaySong(nextSong);
  },

  playPrevious: async () => {
    const { player, sound } = get();
    const { queue, currentIndex, shuffleMode } = player;

    if (queue.length === 0) return;

    let prevIndex: number;

    if (shuffleMode) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = currentIndex - 1;

      if (prevIndex < 0) {
        prevIndex = queue.length - 1;
      }
    }

    const prevSong = queue[prevIndex];

    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }

    set((state) => ({
      player: { ...state.player, currentSong: prevSong, currentIndex: prevIndex },
    }));

    await get().loadAndPlaySong(prevSong);
  },

  togglePlay: () => {
    const { player, sound } = get();

    if (!sound) return;

    if (player.isPlaying) {
      sound.pauseAsync();
    } else {
      sound.playAsync();
    }

    set((state) => ({
      player: { ...state.player, isPlaying: !player.isPlaying },
    }));
  },

  setIsPlaying: (playing: boolean) => {
    set((state) => ({
      player: { ...state.player, isPlaying: playing },
    }));
  },

  setPosition: (position: number) => {
    set((state) => ({
      player: { ...state.player, position },
    }));
  },

  setDuration: (duration: number) => {
    set((state) => ({
      player: { ...state.player, duration },
    }));
  },

  setRepeatMode: (mode: 'none' | 'all' | 'one') => {
    set((state) => ({
      player: { ...state.player, repeatMode: mode },
    }));
  },

  toggleShuffle: () => {
    set((state) => ({
      player: { ...state.player, shuffleMode: !state.player.shuffleMode },
    }));
  },

  setVolume: (volume: number) => {
    const { sound } = get();

    if (sound) {
      sound.setVolumeAsync(volume);
    }

    set((state) => ({
      player: { ...state.player, volume },
    }));
  },

  // Load and play a song
  loadAndPlaySong: async (song: Song) => {
    try {
      const streamUrl = subsonicApi.getStreamUrl(song.id);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true, volume: get().player.volume },
        (status) => {
          if (status.isLoaded) {
            set((state) => ({
              player: {
                ...state.player,
                position: status.positionMillis || 0,
                duration: status.durationMillis || 0,
                isPlaying: status.isPlaying,
              },
            }));

            if (status.didJustFinish) {
              const { player } = get();

              if (player.repeatMode === 'one') {
                get().loadAndPlaySong(song);
              } else {
                get().playNext();
              }
            }
          }
        }
      );

      set({ sound: newSound });

      setTimeout(() => {
        subsonicApi.scrobble(song.id);
      }, Math.min(30000, (song.duration * 1000) / 2));

    } catch (error) {
      console.error('Error loading song:', error);
    }
  },

  // Play a song immediately
  playSong: async (song: Song, queue?: Song[]) => {
    const { sound } = get();

    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }

    if (queue) {
      const songIndex = queue.findIndex((s) => s.id === song.id);
      set((state) => ({
        player: {
          ...state.player,
          queue,
          currentIndex: songIndex >= 0 ? songIndex : 0,
          currentSong: song,
        },
      }));
    } else {
      set((state) => ({
        player: {
          ...state.player,
          currentSong: song,
        },
      }));
    }

    await get().loadAndPlaySong(song);
  },

  // Library actions
  setArtists: (artists: Artist[]) => {
    set({ artists });
  },

  setAlbums: (albums: Album[]) => {
    set({ albums });
  },

  setPlaylists: (playlists: Playlist[]) => {
    set({ playlists });
  },

  // Fetch actions
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

  toggleStar: async (id: string, type: 'song' | 'album' | 'artist', currentlyStarred: boolean) => {
    try {
      if (currentlyStarred) {
        await subsonicApi.unstar(id, type);
      } else {
        await subsonicApi.star(id, type);
      }

      // Update local state for songs in queue and current
      const { player } = get();
      if (type === 'song') {
        if (player.currentSong?.id === id) {
          set((state) => ({
            player: {
              ...state.player,
              currentSong: {
                ...state.player.currentSong!,
                starred: currentlyStarred ? undefined : new Date().toISOString()
              }
            }
          }));
        }

        const queueIndex = player.queue.findIndex(s => s.id === id);
        if (queueIndex >= 0) {
          const newQueue = [...player.queue];
          newQueue[queueIndex] = {
            ...newQueue[queueIndex],
            starred: currentlyStarred ? undefined : new Date().toISOString()
          };
          set((state) => ({
            player: { ...state.player, queue: newQueue }
          }));
        }
      }
    } catch (error) {
      console.error(`Error toggling star for ${type}:`, error);
    }
  },

  setOptionsModalSong: (song: Song | null) => set({ optionsModalSong: song }),
  setPlaylistModalSong: (song: Song | null) => set({ playlistModalSong: song }),
}));

export default useMusicStore;
