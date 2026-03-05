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
import { handleSleepTimerTrackChange } from './sleepTimerStore';
import { useThemeStore } from './themeStore';
import { NativeModules } from 'react-native';
import type { ToastAndroidStatic } from 'react-native';
import { Alert, Platform, ToastAndroid } from 'react-native';

const { WidgetModule } = NativeModules;

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
    lastError: string | null;
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
    clearError: () => void;
}

// ---- Helpers ----

/**
 * Build a Track object for react-native-track-player from a Song and its resolved URI.
 */
function buildTrack(song: Song, uri: string) {
    const remoteArtworkUrl = subsonicApi.getCoverArtUrl(song.coverArt, 600);
    // Use cached cover art for offline support (lock screen, notifications)
    const artworkUrl = CacheManager.getCoverArtUri(song.coverArt, remoteArtworkUrl);
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

function notifyError(message: string) {
    if (Platform.OS === 'android') {
        (ToastAndroid as ToastAndroidStatic)?.show(message, ToastAndroid.LONG);
    } else {
        Alert.alert('Error', message);
    }
}

/**
 * Resolve the playback URI for a song.
 * ALWAYS prioritises the local cached/downloaded file. Only falls back
 * to remote streaming when there is no valid local file.
 */
async function getResolvedUri(song: Song, startDownload: boolean = true): Promise<string> {
    // 1. Check for a valid local file first — zero network cost
    const localUri = CacheManager.getLocalUri(song.id, song.suffix);
    if (localUri) {
        console.log(`[Resolve] Using local file: ${song.title}`);
        CacheManager._touchEntry(song.id).catch(() => { });
        return localUri;
    }

    // 2. Not cached locally — fall back to remote streaming (+ optional background download)
    const remoteUrl = subsonicApi.getStreamUrl(song.id);
    return CacheManager.getPlaybackUri(song, remoteUrl, startDownload);
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
        lastError: null,
    },
    isTrackPlayerReady: false,

    initTrackPlayer: async () => {
        const { isTrackPlayerReady } = get();
        if (isTrackPlayerReady) {
            console.log('[TrackPlayer] Already initialized, skipping setup.');
            return;
        }

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

                const { player } = get();
                if (player.currentSong) {
                    const artworkUrl = CacheManager.getCoverArtUri(player.currentSong.coverArt, subsonicApi.getCoverArtUrl(player.currentSong.coverArt, 600));
                    const primaryColor = useThemeStore.getState().currentTheme.colors.primary;
                    WidgetModule?.updateWidget(player.currentSong.title, player.currentSong.artist, isPlaying, artworkUrl || null, primaryColor);
                }
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

                        // Update Android Widget
                        const isPlaying = get().player.isPlaying;
                        const artworkUrl = CacheManager.getCoverArtUri(newSong.coverArt, subsonicApi.getCoverArtUrl(newSong.coverArt, 600));
                        const primaryColor = useThemeStore.getState().currentTheme.colors.primary;
                        WidgetModule?.updateWidget(newSong.title, newSong.artist, isPlaying, artworkUrl || null, primaryColor);

                        // Auto-advanced to a new track — ensure it's cached (prioritises local)
                        await getResolvedUri(newSong, true);

                        // ── Pre-fetch n+1: silently cache the NEXT song in queue ──
                        const nextIndex = songIndex + 1;
                        if (nextIndex < player.queue.length) {
                            const nextSong = player.queue[nextIndex];
                            // Check local file directly first — avoids async index lookup
                            const nextLocal = CacheManager.getLocalUri(nextSong.id, nextSong.suffix);
                            if (!nextLocal) {
                                CacheManager.isCached(nextSong.id).then((alreadyCached) => {
                                    if (!alreadyCached) {
                                        console.log(`[Pre-fetch] Descargando en background: ${nextSong.title}`);
                                        getResolvedUri(nextSong, true)
                                            .catch((err) => {
                                                console.warn('[Pre-fetch] Error:', err);
                                                set((state) => ({
                                                    player: { ...state.player, lastError: 'No se pudo precargar la siguiente canción.' },
                                                }));
                                                notifyError('No se pudo precargar la siguiente canción.');
                                            });
                                    } else {
                                        console.log(`[Pre-fetch] Ya en caché: ${nextSong.title}`);
                                    }
                                }).catch((err) => {
                                    console.warn('[Pre-fetch] Check error:', err);
                                    set((state) => ({
                                        player: { ...state.player, lastError: 'No se pudo verificar caché de la siguiente canción.' },
                                    }));
                                    notifyError('No se pudo verificar caché de la siguiente canción.');
                                });
                            } else {
                                console.log(`[Pre-fetch] Ya en local: ${nextSong.title}`);
                            }
                        }

                        setTimeout(() => {
                            subsonicApi.scrobble(newSong.id);
                        }, Math.min(30000, (newSong.duration * 1000) / 2));

                        // Notify sleep timer about the track change
                        handleSleepTimerTrackChange();
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
            const finalUri = await getResolvedUri(song);
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
            const finalUri = await getResolvedUri(song);
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

        const applyShuffleOrder = async (orderedQueue: Song[], newIndex: number) => {
            try {
                // Only reorder IDs without rebuilding tracks; relies on TrackPlayer.move
                const currentTpQueue = await TrackPlayer.getQueue();
                const idToIndex: Record<string, number> = {};
                currentTpQueue.forEach((t, idx) => { idToIndex[t.id as string] = idx; });

                // Build target order indices to avoid full reset
                let targetPositions = orderedQueue.map((s) => idToIndex[s.id] ?? -1);
                // If any track is missing, fall back to minimal rebuild of missing ones only
                const missing: { song: Song; idx: number }[] = [];
                targetPositions.forEach((pos, i) => {
                    if (pos === -1) missing.push({ song: orderedQueue[i], idx: i });
                });

                if (missing.length > 0) {
                    // Add missing tracks at end, then move
                    for (const { song } of missing) {
                        try {
                            const uri = await getResolvedUri(song, song.id === currentSong.id);
                            const track = buildTrack(song, uri);
                            await TrackPlayer.add(track);
                            idToIndex[track.id as string] = (await TrackPlayer.getQueue()).length - 1;
                        } catch (err) {
                            console.error('[Shuffle] Error añadiendo pista faltante', err);
                            set((state) => ({ player: { ...state.player, lastError: 'No se pudo reordenar la cola.' } }));
                            notifyError('No se pudo reordenar la cola.');
                            return;
                        }
                    }
                    // recompute positions after adds
                    const refreshed = await TrackPlayer.getQueue();
                    const refreshedMap: Record<string, number> = {};
                    refreshed.forEach((t, idx) => { refreshedMap[t.id as string] = idx; });
                    targetPositions = orderedQueue.map((s) => refreshedMap[s.id] ?? -1);
                }

                // Move items to match the orderedQueue sequentially
                // This is O(n^2) in worst case but much cheaper than rebuilding URIs and tracks
                let currentOrder = [...(await TrackPlayer.getQueue()).map((_t, i) => i)];
                for (let desiredPos = 0; desiredPos < targetPositions.length; desiredPos++) {
                    const trackId = orderedQueue[desiredPos].id;
                    const currentIdx = (await TrackPlayer.getQueue()).findIndex(t => t.id === trackId);
                    if (currentIdx !== desiredPos && currentIdx >= 0) {
                        await TrackPlayer.move(currentIdx, desiredPos);
                    }
                }

                // Skip to current
                await TrackPlayer.skip(newIndex);
                if (player.isPlaying) {
                    await TrackPlayer.play();
                }
            } catch (err) {
                console.error('[Shuffle] Error reordenando', err);
                set((state) => ({ player: { ...state.player, lastError: 'No se pudo reordenar la cola.' } }));
                notifyError('No se pudo reordenar la cola.');
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

            applyShuffleOrder(shuffledQueue, newIndex).catch((err) => {
                console.error('[Shuffle] applyShuffleOrder', err);
                set((state) => ({ player: { ...state.player, lastError: 'No se pudo activar aleatorio.' } }));
                notifyError('No se pudo activar aleatorio.');
            });

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

            applyShuffleOrder(restoredQueue, newIndex).catch((err) => {
                console.error('[Shuffle] applyShuffleOrder off', err);
                set((state) => ({ player: { ...state.player, lastError: 'No se pudo desactivar aleatorio.' } }));
                notifyError('No se pudo desactivar aleatorio.');
            });

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
                const finalUri = await getResolvedUri(song, true);
                const track = buildTrack(song, finalUri);
                await TrackPlayer.add(track);
            } else {
                const trackIndex = player.queue.findIndex(s => s.id === song.id);
                if (trackIndex >= 0) {
                    await TrackPlayer.skip(trackIndex);
                    // Ensure the song is cached for future plays
                    await getResolvedUri(song, true);
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
                const isCurrentlyPlaying = s.id === song.id;
                const finalUri = await getResolvedUri(s, isCurrentlyPlaying);
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

        // ── Pre-fetch n+1 on manual play ──
        const currentQueue = queue || get().player.queue;
        const idx = currentQueue.findIndex((s) => s.id === song.id);
        const nextIdx = idx + 1;
        if (nextIdx < currentQueue.length) {
            const nextSong = currentQueue[nextIdx];
            // Check local file directly first — avoids async index lookup
            const nextLocal = CacheManager.getLocalUri(nextSong.id, nextSong.suffix);
            if (!nextLocal) {
                CacheManager.isCached(nextSong.id).then((alreadyCached) => {
                    if (!alreadyCached) {
                        console.log(`[Pre-fetch] Descargando en background: ${nextSong.title}`);
                        getResolvedUri(nextSong, true)
                            .catch((err) => console.warn('[Pre-fetch] Error:', err));
                    } else {
                        console.log(`[Pre-fetch] Ya en caché: ${nextSong.title}`);
                    }
                }).catch((err) => console.warn('[Pre-fetch] Check error:', err));
            } else {
                console.log(`[Pre-fetch] Ya en local: ${nextSong.title}`);
            }
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
            set((state) => ({ player: { ...state.player, lastError: 'No se pudo actualizar favoritos.' } }));
            notifyError('No se pudo actualizar favoritos.');
        }
    },

    clearError: () => {
        set((state) => ({ player: { ...state.player, lastError: null } }));
    },
}));

export default usePlayerStore;
