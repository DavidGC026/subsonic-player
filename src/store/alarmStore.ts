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

export interface Alarm {
    id: string;
    hour: number;        // 0-23
    minute: number;      // 0-59
    days: boolean[];     // [Dom, Lun, Mar, Mié, Jue, Vie, Sáb] — empty/all-false = one-time
    enabled: boolean;
    name: string;
    mode: AlarmMode;
    playlistId?: string;
    songId?: string;
    snoozeEnabled: boolean;
    snoozeMinutes: number;
    vibrationEnabled: boolean;
    createdAt: number;
}

interface AlarmStore {
    alarms: Alarm[];
    isRinging: boolean;
    triggeredAlarmId: string | null;

    // CRUD
    addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt'>) => void;
    updateAlarm: (id: string, updates: Partial<Alarm>) => void;
    deleteAlarm: (id: string) => void;
    toggleAlarm: (id: string) => void;

    // Ringing
    dismissAlarm: () => void;
    snoozeAlarm: () => void;
    checkPendingAlarm: () => Promise<void>;
}

// Generate a unique ID
const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

// Hash alarm ID to a stable integer for PendingIntent request codes
const alarmIdToRequestCode = (id: string): number => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash) % 1_000_000 + 100_000; // Range: 100000-1099999
};

/**
 * Calculate the next epoch ms for an alarm to fire.
 * If it has days set (recurring), find the next matching day.
 * If no days set (one-time), use today or tomorrow.
 */
const calculateNextFireTime = (alarm: Alarm): number => {
    const now = new Date();
    const hasDaysSet = alarm.days.some(d => d);

    if (!hasDaysSet) {
        // One-time alarm: today if time hasn't passed, tomorrow otherwise
        const target = new Date();
        target.setHours(alarm.hour, alarm.minute, 0, 0);
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        return target.getTime();
    }

    // Recurring alarm: find the next matching day
    const currentDay = now.getDay(); // 0=Sun, 1=Mon, ...
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const alarmMinutes = alarm.hour * 60 + alarm.minute;

    // Check each day starting from today, up to 7 days ahead
    for (let offset = 0; offset < 7; offset++) {
        const dayIndex = (currentDay + offset) % 7;
        if (alarm.days[dayIndex]) {
            // If it's today, check if the time hasn't passed yet
            if (offset === 0 && currentMinutes >= alarmMinutes) {
                continue; // Time already passed today, check next
            }
            const target = new Date();
            target.setDate(target.getDate() + offset);
            target.setHours(alarm.hour, alarm.minute, 0, 0);
            return target.getTime();
        }
    }

    // Fallback (shouldn't reach here if days are set correctly)
    // Try the first enabled day next week
    for (let offset = 7; offset < 14; offset++) {
        const dayIndex = (currentDay + offset) % 7;
        if (alarm.days[dayIndex]) {
            const target = new Date();
            target.setDate(target.getDate() + offset);
            target.setHours(alarm.hour, alarm.minute, 0, 0);
            return target.getTime();
        }
    }

    // Absolute fallback
    const target = new Date();
    target.setHours(alarm.hour, alarm.minute, 0, 0);
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }
    return target.getTime();
};

/**
 * Schedule a native alarm for a given Alarm object.
 */
const scheduleNativeAlarm = async (alarm: Alarm): Promise<boolean> => {
    try {
        const fireTime = calculateNextFireTime(alarm);
        const requestCode = alarmIdToRequestCode(alarm.id);
        await AlarmModule?.setAlarmWithId(fireTime, alarm.id, requestCode);
        console.log(`[Alarm] Scheduled "${alarm.name || 'Sin nombre'}" (${alarm.id}) for ${new Date(fireTime).toLocaleString()}, code=${requestCode}`);
        return true;
    } catch (e: any) {
        console.error(`[Alarm] Error scheduling alarm ${alarm.id}:`, e);
        return false;
    }
};

/**
 * Cancel a native alarm.
 */
const cancelNativeAlarm = async (alarmId: string): Promise<void> => {
    try {
        const requestCode = alarmIdToRequestCode(alarmId);
        await AlarmModule?.cancelAlarmWithId(alarmId, requestCode);
        console.log(`[Alarm] Cancelled native alarm ${alarmId}, code=${requestCode}`);
    } catch (e: any) {
        console.error(`[Alarm] Error cancelling alarm ${alarmId}:`, e);
    }
};

export const useAlarmStore = create<AlarmStore>()(
    persist(
        (set, get) => ({
            alarms: [],
            isRinging: false,
            triggeredAlarmId: null,

            addAlarm: (alarmData) => {
                const alarm: Alarm = {
                    ...alarmData,
                    id: generateId(),
                    createdAt: Date.now(),
                };

                set((state) => ({
                    alarms: [...state.alarms, alarm],
                }));

                if (alarm.enabled) {
                    scheduleNativeAlarm(alarm);
                }
            },

            updateAlarm: (id, updates) => {
                const { alarms } = get();
                const existing = alarms.find(a => a.id === id);
                if (!existing) return;

                const updatedAlarm = { ...existing, ...updates };

                set((state) => ({
                    alarms: state.alarms.map(a => a.id === id ? updatedAlarm : a),
                }));

                // Re-schedule if enabled, cancel if disabled
                if (updatedAlarm.enabled) {
                    scheduleNativeAlarm(updatedAlarm);
                } else {
                    cancelNativeAlarm(id);
                }
            },

            deleteAlarm: (id) => {
                cancelNativeAlarm(id);
                set((state) => ({
                    alarms: state.alarms.filter(a => a.id !== id),
                }));
            },

            toggleAlarm: (id) => {
                const { alarms } = get();
                const alarm = alarms.find(a => a.id === id);
                if (!alarm) return;

                const newEnabled = !alarm.enabled;
                const updatedAlarm = { ...alarm, enabled: newEnabled };

                set((state) => ({
                    alarms: state.alarms.map(a => a.id === id ? updatedAlarm : a),
                }));

                if (newEnabled) {
                    scheduleNativeAlarm(updatedAlarm);
                } else {
                    cancelNativeAlarm(id);
                }
            },

            dismissAlarm: () => {
                const { triggeredAlarmId, alarms } = get();

                set({ isRinging: false, triggeredAlarmId: null });
                TrackPlayer.pause().catch(console.error);

                // Clear lock screen overlay
                AlarmModule?.dismissAlarmScreen()
                    .then(() => console.log('[Alarm] Lock screen overlay cleared'))
                    .catch((e: any) => console.warn('[Alarm] Error clearing lock screen overlay', e));

                // If it was a recurring alarm, schedule the next occurrence
                if (triggeredAlarmId) {
                    const alarm = alarms.find(a => a.id === triggeredAlarmId);
                    if (alarm && alarm.days.some(d => d)) {
                        // Recurring: schedule next occurrence
                        console.log(`[Alarm] Recurring alarm "${alarm.name}", scheduling next occurrence...`);
                        scheduleNativeAlarm(alarm);
                    } else if (alarm) {
                        // One-time: disable the alarm
                        set((state) => ({
                            alarms: state.alarms.map(a =>
                                a.id === triggeredAlarmId ? { ...a, enabled: false } : a
                            ),
                        }));
                    }
                }
            },

            snoozeAlarm: () => {
                const { triggeredAlarmId, alarms } = get();

                set({ isRinging: false });
                TrackPlayer.pause().catch(console.error);

                // Clear lock screen overlay
                AlarmModule?.dismissAlarmScreen()
                    .then(() => console.log('[Alarm] Lock screen overlay cleared for snooze'))
                    .catch(console.warn);

                if (triggeredAlarmId) {
                    const alarm = alarms.find(a => a.id === triggeredAlarmId);
                    const snoozeMs = (alarm?.snoozeMinutes || 5) * 60 * 1000;
                    const snoozeTime = Date.now() + snoozeMs;

                    console.log(`[Alarm] Snoozing alarm "${alarm?.name}" for ${alarm?.snoozeMinutes || 5} minutes until ${new Date(snoozeTime).toLocaleTimeString()}`);

                    // Schedule a snooze via the native module
                    const requestCode = alarmIdToRequestCode(triggeredAlarmId);
                    AlarmModule?.setAlarmWithId(snoozeTime, triggeredAlarmId, requestCode)
                        .then(() => console.log('[Alarm] Snooze scheduled'))
                        .catch((e: any) => console.error('[Alarm] Error scheduling snooze', e));
                }

                set({ triggeredAlarmId: null });
            },

            checkPendingAlarm: async () => {
                try {
                    const result = await AlarmModule?.checkPendingAlarm();
                    // result can be: false (no alarm), true (legacy), or a string (alarm ID)
                    if (!result) return;

                    const triggeredAlarmId = typeof result === 'string' ? result : null;
                    console.log(`[Alarm] Triggered! alarmId=${triggeredAlarmId}`);

                    const { alarms } = get();
                    const alarm = triggeredAlarmId
                        ? alarms.find(a => a.id === triggeredAlarmId)
                        : null;

                    // Determine which mode/playlist to use
                    const mode = alarm?.mode || 'all_random';
                    const playlistId = alarm?.playlistId;

                    set({
                        isRinging: true,
                        triggeredAlarmId: triggeredAlarmId,
                    });

                    console.log('⏰ PASO 5/8: Iniciando TrackPlayer después del despertar nativo...');
                    const { initTrackPlayer } = usePlayerStore.getState();
                    await initTrackPlayer();
                    await TrackPlayer.setVolume(1.0);
                    console.log('⏰ PASO 6/8: TrackPlayer listo y volumen al 100%.');

                    // Load server config if needed (cold boot)
                    const { useConfigStore } = await import('./configStore');
                    let configState = useConfigStore.getState();
                    if (!configState.serverConfig) {
                        console.log('⏰ INFO: Config vacía, leyendo desde SecureStore...');
                        await configState.loadConfig();
                        configState = useConfigStore.getState();
                    }

                    if (configState.serverConfig) {
                        console.log(`⏰ PASO 7/8: Config cargada: ${configState.serverConfig.url}`);
                        subsonicApi.setConfig(configState.serverConfig);
                    } else {
                        console.warn('⏰ ERROR: No se pudo cargar la config del servidor.');
                    }

                    let songsToPlay: any[] = [];
                    console.log(`⏰ PASO 8/8: Obteniendo música... [Modo: ${mode}]`);

                    if (mode === 'all_random') {
                        songsToPlay = await subsonicApi.getRandomSongs(30);
                    } else if (mode === 'playlist' && playlistId) {
                        const details = await subsonicApi.getPlaylist(playlistId);
                        songsToPlay = details.songs || [];
                    } else if (mode === 'song' && alarm?.songId) {
                        const track = await subsonicApi.getSong(alarm.songId);
                        if (track) songsToPlay = [track];
                    }

                    if (songsToPlay.length > 0) {
                        if (mode === 'playlist' || mode === 'all_random') {
                            songsToPlay.sort(() => 0.5 - Math.random());
                        }
                        console.log('⏰ 🔥 ¡Música maestro! Reproduciendo...');

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

                        // Background: add remaining songs
                        const BATCH_SIZE = 5;
                        const nextBatch = songsToPlay.slice(1, 1 + BATCH_SIZE);
                        (async () => {
                            for (const song of nextBatch) {
                                try {
                                    const uri = await CacheManager.getPlaybackUri(
                                        song, subsonicApi.getStreamUrl(song.id), false
                                    );
                                    const art = subsonicApi.getCoverArtUrl(song.coverArt, 600);
                                    const cachedArt = CacheManager.getCoverArtUri(song.coverArt, art);
                                    await TrackPlayer.add({
                                        id: song.id, url: uri, title: song.title,
                                        artist: song.artist, album: song.album,
                                        duration: song.duration, artwork: cachedArt || undefined,
                                    });
                                } catch (err) {
                                    console.warn(`⏰ Error adding song: ${song.title}`, err);
                                }
                            }

                            const remaining = songsToPlay.slice(1 + BATCH_SIZE);
                            for (let i = 0; i < remaining.length; i += 10) {
                                const batch = remaining.slice(i, i + 10);
                                await Promise.all(batch.map(async (song) => {
                                    try {
                                        const uri = await CacheManager.getPlaybackUri(
                                            song, subsonicApi.getStreamUrl(song.id), false
                                        );
                                        const art = subsonicApi.getCoverArtUrl(song.coverArt, 600);
                                        const cachedArt = CacheManager.getCoverArtUri(song.coverArt, art);
                                        await TrackPlayer.add({
                                            id: song.id, url: uri, title: song.title,
                                            artist: song.artist, album: song.album,
                                            duration: song.duration, artwork: cachedArt || undefined,
                                        });
                                    } catch { }
                                }));
                            }
                            console.log(`⏰ ✅ Cola completa (${songsToPlay.length} canciones).`);
                        })();
                    } else {
                        console.log('⏰ ❌ No se encontraron canciones para la alarma.');
                    }
                } catch (e) {
                    console.error('[Alarm] Check pending alarm error:', e);
                }
            },
        }),
        {
            name: 'alarm-storage-v2',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                alarms: state.alarms,
            }),
        }
    )
);
