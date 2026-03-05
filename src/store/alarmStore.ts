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
                    .then(() => console.log(`[Alarm] Native alarm set for ${new Date(timeMs).toLocaleString()}`))
                    .catch((e: any) => console.error('[Alarm] Error setting native alarm', e));

                set({
                    config: {
                        timeMs,
                        mode,
                        playlistId,
                        songId,
                        isActive: true,
                    },
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
                            if (config.mode === 'playlist') {
                                songsToPlay.sort(() => 0.5 - Math.random());
                            }
                            console.log('⏰ 🔥 ¡Música maestro! Reproduciendo...');
                            await playSong(songsToPlay[0], songsToPlay);
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
        }
    )
);
