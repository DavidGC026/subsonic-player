import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { useLibraryStore } from './libraryStore';
import { usePlayerStore } from './playerStore';
import { subsonicApi } from '../api/subsonic';

const { AlarmModule } = NativeModules;

export type AlarmMode = 'all_random' | 'playlist' | 'song';

interface AlarmConfig {
    timeMs: number | null; // Absolute epoch timestamp in the future, null if not set
    mode: AlarmMode;
    playlistId?: string;
    songId?: string;
    isActive: boolean;
}

interface AlarmStore {
    config: AlarmConfig;
    isRinging: boolean;
    setAlarm: (timeMs: number, mode: AlarmMode, playlistId?: string, songId?: string) => void;
    cancelAlarm: () => void;
    dismissAlarm: () => void;
    checkPendingAlarm: () => Promise<void>;
}

export const useAlarmStore = create<AlarmStore>()(
    persist(
        (set, get) => ({
            config: {
                timeMs: null,
                mode: 'all_random',
                isActive: false,
            },
            isRinging: false,

            setAlarm: (timeMs: number, mode: AlarmMode, playlistId?: string, songId?: string) => {
                AlarmModule?.setAlarm(timeMs)
                    .then(() => {
                        console.log(`[Alarm] Native alarm set for ${new Date(timeMs).toLocaleString()}`);
                        set({
                            config: {
                                timeMs,
                                mode,
                                playlistId,
                                songId,
                                isActive: true,
                            },
                        });
                    })
                    .catch((e: any) => {
                        console.error('[Alarm] Error setting native alarm', e);
                        // If it's a permission error, don't save the alarm state
                        if (e?.code === 'ALARM_PERMISSION') {
                            const { Alert } = require('react-native');
                            Alert.alert(
                                'Permiso necesario',
                                'Para usar la alarma, necesitas permitir "Alarmas y recordatorios" en la configuración de la app. Se abrió la pantalla de configuración.',
                                [{ text: 'OK' }]
                            );
                        } else {
                            // Other errors - still save the config optimistically
                            set({
                                config: {
                                    timeMs,
                                    mode,
                                    playlistId,
                                    songId,
                                    isActive: true,
                                },
                            });
                        }
                    });
            },

            cancelAlarm: () => {
                AlarmModule?.cancelAlarm()
                    .then(() => console.log('[Alarm] Native alarm cancelled'))
                    .catch((e: any) => console.error('[Alarm] Error cancelling native alarm', e));

                set((state) => ({
                    config: { ...state.config, isActive: false, timeMs: null },
                    isRinging: false,
                }));
            },

            dismissAlarm: () => {
                set({ isRinging: false });
                TrackPlayer.pause().catch(console.error);
                // Clear lock screen overlay flags so the phone returns to normal
                AlarmModule?.dismissAlarmScreen()
                    .then(() => console.log('[Alarm] Lock screen overlay cleared'))
                    .catch((e: any) => console.warn('[Alarm] Error clearing lock screen overlay', e));
            },

            checkPendingAlarm: async () => {
                try {
                    const triggered = await AlarmModule?.checkPendingAlarm();
                    if (triggered) {
                        console.log('[Alarm] Triggered flag caught! Playing music...');
                        const { config } = get();

                        // Cancel the native alarm flag & state so it doesn't ring forever
                        set({
                            config: { ...config, isActive: false, timeMs: null },
                            isRinging: true,
                        });

                        console.log('⏰ PASO 5/8: Iniciando TrackPlayer despues del despertar nativo...');
                        const { initTrackPlayer, playSong } = usePlayerStore.getState();
                        await initTrackPlayer();
                        await TrackPlayer.setVolume(1.0); // Wake up loud
                        console.log('⏰ PASO 6/8: TrackPlayer listo y volumen al 100%.');

                        // We need to make sure the API is configured since this is a cold boot essentially
                        const { useConfigStore } = await import('./configStore');
                        let configState = useConfigStore.getState();
                        if (!configState.serverConfig) {
                            console.log('⏰ INFO: La config del servidor estaba vacía en memoria, leyendo desde SecureStore...');
                            await configState.loadConfig();
                            configState = useConfigStore.getState();
                        }

                        if (configState.serverConfig) {
                            console.log(`⏰ PASO 7/8: Configuración del servidor cargada exitosamente: ${configState.serverConfig.url}`);
                            subsonicApi.setConfig(configState.serverConfig);
                        } else {
                            console.warn('⏰ ERROR: No se pudo cargar la configuración del servidor.');
                        }

                        let songsToPlay: any[] = [];
                        console.log(`⏰ PASO 8/8: Obteniendo música para reproducir... [Modo: ${config.mode}]`);
                        if (config.mode === 'all_random') {
                            songsToPlay = await subsonicApi.getRandomSongs(30);
                            console.log(`⏰ RESULTADO: ${songsToPlay.length} canciones aleatorias cargadas.`);
                        } else if (config.mode === 'playlist' && config.playlistId) {
                            const details = await subsonicApi.getPlaylist(config.playlistId);
                            songsToPlay = details.songs || [];
                            console.log(`⏰ RESULTADO: Playlist cargada, tiene ${songsToPlay.length} canciones.`);
                        } else if (config.mode === 'song' && config.songId) {
                            const track = await subsonicApi.getSong(config.songId);
                            if (track) songsToPlay = [track];
                            console.log(`⏰ RESULTADO: Canción individual cargada.`);
                        }

                        if (songsToPlay.length > 0) {
                            // If it's a playlist we shuffle it arbitrarily for the alarm as default
                            if (config.mode === 'playlist' || config.mode === 'all_random') {
                                songsToPlay.sort(() => 0.5 - Math.random());
                            }
                            console.log('⏰ 🔥 ¡Música maestro! Reproduciendo...');

                            // FAST START: Only resolve the first song, play immediately
                            // then add remaining songs in background batches
                            const firstSong = songsToPlay[0];
                            const remoteUrl = subsonicApi.getStreamUrl(firstSong.id);
                            const { CacheManager } = await import('../services/CacheManager');
                            const firstUri = await CacheManager.getPlaybackUri(firstSong, remoteUrl, true);
                            const remoteArtworkUrl = subsonicApi.getCoverArtUrl(firstSong.coverArt, 600);
                            const artworkUrl = CacheManager.getCoverArtUri(firstSong.coverArt, remoteArtworkUrl);

                            await TrackPlayer.reset();
                            await TrackPlayer.add({
                                id: firstSong.id,
                                url: firstUri,
                                title: firstSong.title,
                                artist: firstSong.artist,
                                album: firstSong.album,
                                duration: firstSong.duration,
                                artwork: artworkUrl || undefined,
                            });
                            await TrackPlayer.play();
                            console.log(`⏰ ▶️ Reproduciendo: ${firstSong.title}`);

                            // Update store with full queue
                            const { setCurrentSong, setQueue } = usePlayerStore.getState();
                            usePlayerStore.setState((state) => ({
                                player: {
                                    ...state.player,
                                    queue: songsToPlay,
                                    originalQueue: songsToPlay,
                                    currentIndex: 0,
                                    currentSong: firstSong,
                                    shuffleMode: false,
                                },
                            }));

                            // Background: add next few songs to TrackPlayer queue
                            const BATCH_SIZE = 5;
                            const nextBatch = songsToPlay.slice(1, 1 + BATCH_SIZE);
                            (async () => {
                                for (const song of nextBatch) {
                                    try {
                                        const uri = await CacheManager.getPlaybackUri(
                                            song,
                                            subsonicApi.getStreamUrl(song.id),
                                            false // don't start caching, just get streaming URL
                                        );
                                        const art = subsonicApi.getCoverArtUrl(song.coverArt, 600);
                                        const cachedArt = CacheManager.getCoverArtUri(song.coverArt, art);
                                        await TrackPlayer.add({
                                            id: song.id,
                                            url: uri,
                                            title: song.title,
                                            artist: song.artist,
                                            album: song.album,
                                            duration: song.duration,
                                            artwork: cachedArt || undefined,
                                        });
                                    } catch (err) {
                                        console.warn(`⏰ Error adding song to queue: ${song.title}`, err);
                                    }
                                }
                                console.log(`⏰ ✅ ${nextBatch.length} canciones más añadidas a la cola.`);

                                // Continue adding rest in larger batches (non-blocking)
                                const remaining = songsToPlay.slice(1 + BATCH_SIZE);
                                for (let i = 0; i < remaining.length; i += 10) {
                                    const batch = remaining.slice(i, i + 10);
                                    await Promise.all(batch.map(async (song) => {
                                        try {
                                            const uri = await CacheManager.getPlaybackUri(
                                                song,
                                                subsonicApi.getStreamUrl(song.id),
                                                false
                                            );
                                            const art = subsonicApi.getCoverArtUrl(song.coverArt, 600);
                                            const cachedArt = CacheManager.getCoverArtUri(song.coverArt, art);
                                            await TrackPlayer.add({
                                                id: song.id,
                                                url: uri,
                                                title: song.title,
                                                artist: song.artist,
                                                album: song.album,
                                                duration: song.duration,
                                                artwork: cachedArt || undefined,
                                            });
                                        } catch (err) {
                                            // Silently skip failed songs in background
                                        }
                                    }));
                                }
                                console.log(`⏰ ✅ Cola completa cargada (${songsToPlay.length} canciones).`);
                            })();
                        } else {
                            console.log('⏰ ❌ Error crítico: No se encontraron canciones para la alarma.');
                        }
                    }
                } catch (e) {
                    console.error('[Alarm] Check pending alarm error:', e);
                }
            },
        }),
        {
            name: 'alarm-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                config: state.config,
                // isRinging is intentionally excluded — it's transient runtime state
            }),
        }
    )
);
