import { create } from 'zustand/react';
import TrackPlayer, {
  State,
  Capability,
  RepeatMode,
  Event,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song, Artist, Album, Playlist, SearchResult } from '../types';
import { subsonicApi } from '../api/subsonic';
import { CacheManager } from '../services/CacheManager';

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
  isTrackPlayerReady: boolean;

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
  initTrackPlayer: () => Promise<void>;
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
  seekTo: (positionMs: number) => Promise<void>;

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

/**
 * Build a Track object for react-native-track-player from a Song and its resolved URI.
 */
function buildTrack(song: Song, uri: string) {
  const artworkUrl = subsonicApi.getCoverArtUrl(song.coverArt, 600);
  return {
    id: song.id,
    url: uri,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    artwork: artworkUrl || undefined,
  };
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
  isTrackPlayerReady: false,

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

  // Initialize TrackPlayer
  initTrackPlayer: async () => {
    try {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
      });

      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        progressUpdateEventInterval: 1,
      });

      // Listen for playback state changes
      TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        const isPlaying = event.state === State.Playing;
        set((state) => ({
          player: { ...state.player, isPlaying },
        }));
      });

      // Listen for track changes
      TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        if (event.track) {
          const { player, loadAndPlaySong } = get();
          const songIndex = player.queue.findIndex((s) => s.id === event.track?.id);

          if (songIndex >= 0 && songIndex !== player.currentIndex) {
            set((state) => ({
              player: {
                ...state.player,
                currentSong: state.player.queue[songIndex],
                currentIndex: songIndex,
              },
            }));

            // Auto-advanced to a new track, so let's cache it and scrobble it
            const newSong = player.queue[songIndex];
            const remoteUrl = subsonicApi.getStreamUrl(newSong.id);
            await CacheManager.getPlaybackUri(newSong, remoteUrl, true);

            setTimeout(() => {
              subsonicApi.scrobble(newSong.id);
            }, Math.min(30000, (newSong.duration * 1000) / 2));
          }
        }
      });

      // Listen for track ending to handle repeat/shuffle
      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
        const { player } = get();
        if (player.repeatMode === 'all' && player.queue.length > 0) {
          // Restart from beginning
          await TrackPlayer.skip(0);
          await TrackPlayer.play();
        }
      });

      // Listen for progress updates
      TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
        set((state) => ({
          player: {
            ...state.player,
            position: (event.position || 0) * 1000, // Convert to ms for UI compatibility
            duration: (event.duration || 0) * 1000,
          },
        }));
      });

      // Listen for error events
      TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[TrackPlayer] Error:', event);
        // Alert can be handled globally, but we definitely log it 
        // and let the user know if they are stuck
        set((state) => ({
          player: { ...state.player, isPlaying: false }
        }));
      });

      set({ isTrackPlayerReady: true });
      console.log('[TrackPlayer] Initialized successfully');
    } catch (error) {
      console.error('[TrackPlayer] Setup error:', error);
    }
  },

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
    const addTrackToQueue = async () => {
      const remoteUrl = subsonicApi.getStreamUrl(song.id);
      const finalUri = await CacheManager.getPlaybackUri(song, remoteUrl);
      const track = buildTrack(song, finalUri);
      await TrackPlayer.add(track);
    };
    addTrackToQueue().catch(console.error);

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
    const { player } = get();
    const { queue, currentIndex, repeatMode, shuffleMode } = player;

    if (queue.length === 0) return;

    let nextIndex: number;

    if (shuffleMode) {
      nextIndex = Math.floor(Math.random() * queue.length);
      await TrackPlayer.skip(nextIndex);
    } else {
      nextIndex = currentIndex + 1;

      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
          await TrackPlayer.skip(nextIndex);
        } else {
          await TrackPlayer.pause();
          set((state) => ({
            player: { ...state.player, isPlaying: false },
          }));
          return;
        }
      } else {
        await TrackPlayer.skipToNext();
      }
    }

    const nextSong = queue[nextIndex];
    set((state) => ({
      player: { ...state.player, currentSong: nextSong, currentIndex: nextIndex },
    }));
  },

  playPrevious: async () => {
    const { player } = get();
    const { queue, currentIndex, shuffleMode } = player;

    if (queue.length === 0) return;

    let prevIndex: number;

    if (shuffleMode) {
      prevIndex = Math.floor(Math.random() * queue.length);
      await TrackPlayer.skip(prevIndex);
    } else {
      prevIndex = currentIndex - 1;

      if (prevIndex < 0) {
        prevIndex = queue.length - 1;
        await TrackPlayer.skip(prevIndex);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    }

    const prevSong = queue[prevIndex];
    set((state) => ({
      player: { ...state.player, currentSong: prevSong, currentIndex: prevIndex },
    }));
  },

  togglePlay: () => {
    const { player } = get();

    if (player.isPlaying) {
      TrackPlayer.pause();
    } else {
      TrackPlayer.play();
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
    // Sync with TrackPlayer's repeat mode
    const tpMode = mode === 'one' ? RepeatMode.Track : mode === 'all' ? RepeatMode.Queue : RepeatMode.Off;
    TrackPlayer.setRepeatMode(tpMode).catch(console.error);

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
    TrackPlayer.setVolume(volume).catch(console.error);

    set((state) => ({
      player: { ...state.player, volume },
    }));
  },

  // Seek to a position in milliseconds
  seekTo: async (positionMs: number) => {
    await TrackPlayer.seekTo(positionMs / 1000); // TrackPlayer uses seconds
  },

  // Load and play a song
  loadAndPlaySong: async (song: Song) => {
    try {
      const { player } = get();
      const isQueueLoaded = player.queue.length > 0;

      // If we don't have a queue built up, just add this one track
      if (!isQueueLoaded) {
        await TrackPlayer.reset();
        const remoteUrl = subsonicApi.getStreamUrl(song.id);
        const finalUri = await CacheManager.getPlaybackUri(song, remoteUrl, true);
        const track = buildTrack(song, finalUri);
        await TrackPlayer.add(track);
      } else {
        // TrackPlayer is already populated with the queue, just skip to the song
        const trackIndex = player.queue.findIndex(s => s.id === song.id);
        if (trackIndex >= 0) {
          await TrackPlayer.skip(trackIndex);

          // Manually start download for the active song
          const remoteUrl = subsonicApi.getStreamUrl(song.id);
          await CacheManager.getPlaybackUri(song, remoteUrl, true);
        }
      }

      await TrackPlayer.play();

      // Scrobble after a delay
      setTimeout(() => {
        subsonicApi.scrobble(song.id);
      }, Math.min(30000, (song.duration * 1000) / 2));

    } catch (error) {
      console.error('Error loading song:', error);
    }
  },

  // Play a song immediately
  playSong: async (song: Song, queue?: Song[]) => {
    if (queue) {
      // Rebuild the entire TrackPlayer queue
      await TrackPlayer.reset();

      const tracks = await Promise.all(queue.map(async (s) => {
        const remoteUrl = subsonicApi.getStreamUrl(s.id);
        // Do not start downloading everything in the background at once
        const isCurrentlyPlaying = s.id === song.id;
        const finalUri = await CacheManager.getPlaybackUri(s, remoteUrl, isCurrentlyPlaying);
        return buildTrack(s, finalUri);
      }));

      await TrackPlayer.add(tracks);

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
