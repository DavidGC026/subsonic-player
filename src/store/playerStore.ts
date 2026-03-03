import { create } from 'zustand/react';
import TrackPlayer, {
    State,
    Capability,
    RepeatMode,
    Event,
    AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import type { Song } from '../types';
import { subsonicApi } from '../api/subsonic';
import { CacheManager } from '../services/CacheManager';

// ---- Types ----

interface PlayerState {
    currentSong: Song | null;
    queue: Song[];
    originalQueue: Song[];
    currentIndex: number;
    isPlaying: boolean;
    position: number;
    duration: number;
    repeatMode: 'none' | 'all' | 'one';
    shuffleMode: boolean;
    volume: number;
}

interface PlayerStore {
    player: PlayerState;
    isTrackPlayerReady: boolean;

    // Init
    initTrackPlayer: () => Promise<void>;

    // Playback actions
    setCurrentSong: (song: Song | null) => void;
    setQueue: (songs: Song[]) => void;
    addToQueue: (song: Song) => void;
    addNext: (song: Song) => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;
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

    // Star (modifies queue state)
    toggleStar: (id: string, type: 'song' | 'album' | 'artist', currentlyStarred: boolean) => Promise<void>;
}

// ---- Helpers ----

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

// Track the last song that started downloading to prevent race conditions
let lastTriggeredSongId: string | null = null;

// ---- Store ----

export const usePlayerStore = create<PlayerStore>((set, get) => ({
    player: {
        currentSong: null,
        queue: [],
        originalQueue: [],
        currentIndex: -1,
        isPlaying: false,
        position: 0,
        duration: 0,
        repeatMode: 'none',
        shuffleMode: false,
        volume: 1.0,
    },
    isTrackPlayerReady: false,

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
                    const { player } = get();
                    const songIndex = player.queue.findIndex((s) => s.id === event.track?.id);

                    if (songIndex >= 0 && songIndex !== player.currentIndex) {
                        const newSong = player.queue[songIndex];

                        // Cancel the download for the *previous* song if it was still in flight
                        // (user skipped quickly)
                        if (lastTriggeredSongId && lastTriggeredSongId !== newSong.id) {
                            CacheManager.cancelDownload(lastTriggeredSongId);
                        }
                        lastTriggeredSongId = newSong.id;

                        set((state) => ({
                            player: {
                                ...state.player,
                                currentSong: newSong,
                                currentIndex: songIndex,
                            },
                        }));

                        // Auto-advanced to a new track, so let's cache it and scrobble it
                        const remoteUrl = subsonicApi.getStreamUrl(newSong.id);
                        await CacheManager.getPlaybackUri(newSong, remoteUrl, true);

                        setTimeout(() => {
                            subsonicApi.scrobble(newSong.id);
                        }, Math.min(30000, (newSong.duration * 1000) / 2));
                    }
                }
            });

            // Listen for track ending to handle repeat/shuffle
            TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
                const { player } = get();
                if (player.repeatMode === 'all' && player.queue.length > 0) {
                    await TrackPlayer.skip(0);
                    await TrackPlayer.play();
                }
            });

            // Listen for progress updates
            TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
                set((state) => ({
                    player: {
                        ...state.player,
                        position: (event.position || 0) * 1000,
                        duration: (event.duration || 0) * 1000,
                    },
                }));
            });

            // Listen for error events
            TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
                console.error('[TrackPlayer] Error:', event);
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

    // ---- Player actions ----

    setCurrentSong: (song: Song | null) => {
        set((state) => ({
            player: { ...state.player, currentSong: song },
        }));
    },

    setQueue: (songs: Song[]) => {
        set((state) => ({
            player: {
                ...state.player,
                queue: songs,
                originalQueue: state.player.shuffleMode ? state.player.originalQueue : songs,
                currentIndex: songs.length > 0 ? 0 : -1
            },
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
            player: {
                ...state.player,
                queue: [...state.player.queue, song],
                originalQueue: [...state.player.originalQueue, song]
            },
        }));
    },

    addNext: (song: Song) => {
        const { player } = get();
        const insertIndex = player.currentIndex >= 0 ? player.currentIndex + 1 : 0;

        const addTrackToQueue = async () => {
            const remoteUrl = subsonicApi.getStreamUrl(song.id);
            const finalUri = await CacheManager.getPlaybackUri(song, remoteUrl);
            const track = buildTrack(song, finalUri);
            await TrackPlayer.add(track, insertIndex);
        };
        addTrackToQueue().catch(console.error);

        set((state) => {
            const newQueue = [...state.player.queue];
            newQueue.splice(insertIndex, 0, song);

            let newOriginalQueue = state.player.originalQueue;
            if (state.player.shuffleMode) {
                newOriginalQueue = [...state.player.originalQueue];
                newOriginalQueue.push(song);
            } else {
                newOriginalQueue = [...newQueue];
            }

            return {
                player: {
                    ...state.player,
                    queue: newQueue,
                    originalQueue: newOriginalQueue
                },
            };
        });
    },

    removeFromQueue: (index: number) => {
        TrackPlayer.remove([index]).catch(console.error);

        set((state) => {
            const newQueue = [...state.player.queue];
            const removedSong = newQueue[index];
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

            const originalIndex = state.player.originalQueue.findIndex(s => s.id === removedSong?.id);
            const newOriginalQueue = [...state.player.originalQueue];
            if (originalIndex >= 0) {
                newOriginalQueue.splice(originalIndex, 1);
            }

            return {
                player: {
                    ...state.player,
                    queue: newQueue,
                    originalQueue: newOriginalQueue,
                    currentIndex: newIndex
                },
            };
        });
    },

    reorderQueue: async (fromIndex: number, toIndex: number) => {
        try {
            await TrackPlayer.move(fromIndex, toIndex);
        } catch (e) {
            console.error(e);
        }

        set((state) => {
            const newQueue = [...state.player.queue];
            const [item] = newQueue.splice(fromIndex, 1);
            newQueue.splice(toIndex, 0, item);

            let newIndex = state.player.currentIndex;
            if (newIndex === fromIndex) {
                newIndex = toIndex;
            } else if (fromIndex < newIndex && toIndex >= newIndex) {
                newIndex--;
            } else if (fromIndex > newIndex && toIndex <= newIndex) {
                newIndex++;
            }

            let newOriginalQueue = state.player.originalQueue;
            if (!state.player.shuffleMode) {
                newOriginalQueue = [...newQueue];
            }

            return {
                player: {
                    ...state.player,
                    queue: newQueue,
                    originalQueue: newOriginalQueue,
                    currentIndex: newIndex,
                },
            };
        });
    },

    playNext: async () => {
        const { player } = get();
        const { queue, currentIndex, repeatMode } = player;

        if (queue.length === 0) return;

        let nextIndex = currentIndex + 1;

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

        const nextSong = queue[nextIndex];
        set((state) => ({
            player: { ...state.player, currentSong: nextSong, currentIndex: nextIndex },
        }));
    },

    playPrevious: async () => {
        const { player } = get();
        const { queue, currentIndex } = player;

        if (queue.length === 0) return;

        let prevIndex = currentIndex - 1;

        if (prevIndex < 0) {
            prevIndex = queue.length - 1;
            await TrackPlayer.skip(prevIndex);
        } else {
            await TrackPlayer.skipToPrevious();
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
        const tpMode = mode === 'one' ? RepeatMode.Track : mode === 'all' ? RepeatMode.Queue : RepeatMode.Off;
        TrackPlayer.setRepeatMode(tpMode).catch(console.error);

        set((state) => ({
            player: { ...state.player, repeatMode: mode },
        }));
    },

    toggleShuffle: () => {
        const { player } = get();
        const isNowShuffling = !player.shuffleMode;
        const { currentSong, queue, originalQueue } = player;

        if (queue.length === 0 || !currentSong) {
            set((state) => ({
                player: { ...state.player, shuffleMode: isNowShuffling },
            }));
            return;
        }

        const rebuildTrackPlayer = async (newQueue: Song[], newIndex: number) => {
            const currentPos = await TrackPlayer.getProgress();
            await TrackPlayer.reset();

            const tracks = await Promise.all(newQueue.map(async (s) => {
                const remoteUrl = subsonicApi.getStreamUrl(s.id);
                const isCurrentlyPlaying = s.id === currentSong.id;
                const finalUri = await CacheManager.getPlaybackUri(s, remoteUrl, isCurrentlyPlaying);
                return buildTrack(s, finalUri);
            }));

            await TrackPlayer.add(tracks);
            await TrackPlayer.skip(newIndex);
            await TrackPlayer.seekTo(currentPos.position);

            if (player.isPlaying) {
                await TrackPlayer.play();
            }
        };

        if (isNowShuffling) {
            const unplayed = originalQueue.filter(s => s.id !== currentSong.id);

            // Fisher-Yates shuffle
            for (let i = unplayed.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unplayed[i], unplayed[j]] = [unplayed[j], unplayed[i]];
            }

            const shuffledQueue = [currentSong, ...unplayed];
            const newIndex = 0;

            rebuildTrackPlayer(shuffledQueue, newIndex).catch(console.error);

            set((state) => ({
                player: {
                    ...state.player,
                    shuffleMode: true,
                    queue: shuffledQueue,
                    currentIndex: newIndex
                },
            }));
        } else {
            const restoredQueue = [...originalQueue];
            let newIndex = restoredQueue.findIndex(s => s.id === currentSong.id);

            if (newIndex === -1) {
                restoredQueue.unshift(currentSong);
                newIndex = 0;
            }

            rebuildTrackPlayer(restoredQueue, newIndex).catch(console.error);

            set((state) => ({
                player: {
                    ...state.player,
                    shuffleMode: false,
                    queue: restoredQueue,
                    currentIndex: newIndex
                },
            }));
        }
    },

    setVolume: (volume: number) => {
        TrackPlayer.setVolume(volume).catch(console.error);

        set((state) => ({
            player: { ...state.player, volume },
        }));
    },

    seekTo: async (positionMs: number) => {
        await TrackPlayer.seekTo(positionMs / 1000);
    },

    loadAndPlaySong: async (song: Song) => {
        try {
            const { player } = get();
            const isQueueLoaded = player.queue.length > 0;

            if (!isQueueLoaded) {
                await TrackPlayer.reset();
                const remoteUrl = subsonicApi.getStreamUrl(song.id);
                const finalUri = await CacheManager.getPlaybackUri(song, remoteUrl, true);
                const track = buildTrack(song, finalUri);
                await TrackPlayer.add(track);
            } else {
                const trackIndex = player.queue.findIndex(s => s.id === song.id);
                if (trackIndex >= 0) {
                    await TrackPlayer.skip(trackIndex);
                    const remoteUrl = subsonicApi.getStreamUrl(song.id);
                    await CacheManager.getPlaybackUri(song, remoteUrl, true);
                }
            }

            await TrackPlayer.play();

            setTimeout(() => {
                subsonicApi.scrobble(song.id);
            }, Math.min(30000, (song.duration * 1000) / 2));

        } catch (error) {
            console.error('Error loading song:', error);
        }
    },

    playSong: async (song: Song, queue?: Song[]) => {
        if (queue) {
            await TrackPlayer.reset();

            const tracks = await Promise.all(queue.map(async (s) => {
                const remoteUrl = subsonicApi.getStreamUrl(s.id);
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
                    originalQueue: queue,
                    currentIndex: songIndex >= 0 ? songIndex : 0,
                    currentSong: song,
                    shuffleMode: false,
                },
            }));
        } else {
            set((state) => ({
                player: {
                    ...state.player,
                    currentSong: song,
                    originalQueue: state.player.originalQueue.find(s => s.id === song.id) ? state.player.originalQueue : [...state.player.originalQueue, song]
                },
            }));
        }

        await get().loadAndPlaySong(song);
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
}));

export default usePlayerStore;
