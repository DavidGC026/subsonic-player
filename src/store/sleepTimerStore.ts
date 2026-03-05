import { create } from 'zustand';
import { AppState, NativeModules, type NativeEventSubscription } from 'react-native';
import TrackPlayer from 'react-native-track-player';

const { SleepTimerModule } = NativeModules;

interface SleepTimerStore {
    /** Remaining time in seconds, 0 = timer not active */
    remainingSeconds: number;
    /** Whether the timer is currently running */
    isActive: boolean;
    /** Whether to finish the current song before stopping */
    finishCurrentSong: boolean;
    /** Flag indicating we are waiting for the current song to end */
    waitingForSongEnd: boolean;
    /** Absolute timestamp (ms) when the timer expires – survives background */
    expiresAt: number | null;

    /** Start a timer for the given number of minutes */
    startTimer: (minutes: number) => void;
    /** Cancel the active timer */
    cancelTimer: () => void;
    /** Toggle "finish current song" option */
    toggleFinishCurrentSong: () => void;
}

/** Interval used only for updating the UI countdown while in foreground */
let uiIntervalId: ReturnType<typeof setInterval> | null = null;
/** AppState subscription handle */
let appStateSubscription: NativeEventSubscription | null = null;

// ── Helpers ────────────────────────────────────────────────────────────

function showNativeNotification(expiresAtMs: number): void {
    SleepTimerModule?.showSleepTimerNotification(expiresAtMs)
        .catch((e: any) => console.warn('[SleepTimer] showSleepTimerNotification error:', e));
}

function clearUiInterval(): void {
    if (uiIntervalId) {
        clearInterval(uiIntervalId);
        uiIntervalId = null;
    }
}

function clearAppStateListener(): void {
    if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
    }
}

/** Cancel the native AlarmManager alarm (safe to call even if none is set). */
function cancelNativeAlarm(): void {
    SleepTimerModule?.cancelAlarm()
        .catch((e: any) => console.warn('[SleepTimer] cancelAlarm error:', e));
}

/**
 * Schedule (or reschedule) the native AlarmManager exact alarm.
 * When it fires, SleepTimerAlarmReceiver sends a MEDIA_PAUSE key event
 * through the Android media framework, which pauses TrackPlayer
 * even if the JS thread is fully suspended.
 */
function scheduleNativeAlarm(expiresAtMs: number): void {
    SleepTimerModule?.scheduleAlarm(expiresAtMs)
        .then(() => console.log('[SleepTimer] Native alarm scheduled'))
        .catch((e: any) => console.warn('[SleepTimer] scheduleAlarm error:', e));
}

/**
 * Core expiry logic – shared by the UI interval tick AND the background
 * progress listener in PlaybackService.
 *
 * Returns `true` when it has fully handled the expiry (paused or entered
 * "waiting for song end" mode).
 */
function handleExpiry(): boolean {
    const { expiresAt, finishCurrentSong, isActive, waitingForSongEnd } =
        useSleepTimerStore.getState();

    if (!isActive || waitingForSongEnd || expiresAt === null) return false;

    const now = Date.now();
    if (now >= expiresAt) {
        if (finishCurrentSong) {
            // Enter "waiting for current song to end" mode
            // Cancel the native alarm – we'll handle it via track change
            cancelNativeAlarm();
            useSleepTimerStore.setState({
                remainingSeconds: 0,
                waitingForSongEnd: true,
                expiresAt: null,
            });
            console.log('[SleepTimer] Timer expired – waiting for song to end…');
            return true;
        } else {
            // Stop immediately
            TrackPlayer.pause().catch(console.error);
            clearUiInterval();
            clearAppStateListener();
            cancelNativeAlarm();
            useSleepTimerStore.setState({
                remainingSeconds: 0,
                isActive: false,
                waitingForSongEnd: false,
                expiresAt: null,
            });
            console.log('[SleepTimer] Timer expired – playback paused 🌙');
            return true;
        }
    }
    return false;
}

/**
 * Recalculate remainingSeconds from the absolute expiresAt.
 * Called every second while the app is in the foreground.
 */
function tickUi(): void {
    if (handleExpiry()) return;

    const { expiresAt, isActive, waitingForSongEnd } =
        useSleepTimerStore.getState();

    if (!isActive || waitingForSongEnd || expiresAt === null) return;

    const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
    useSleepTimerStore.setState({ remainingSeconds: remaining });
}

function startUiInterval(): void {
    clearUiInterval();
    uiIntervalId = setInterval(tickUi, 1000);
}

function setupAppStateListener(): void {
    clearAppStateListener();
    appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
            const { isActive, waitingForSongEnd } = useSleepTimerStore.getState();
            if (!isActive) return;

            // App came back to foreground – check if timer expired while away
            if (!waitingForSongEnd && handleExpiry()) return;

            // Recalculate remaining seconds immediately
            tickUi();

            // Restart the UI interval (it may have been throttled by the OS)
            startUiInterval();
        }
    });
}

// ── Store ──────────────────────────────────────────────────────────────

export const useSleepTimerStore = create<SleepTimerStore>((set, get) => ({
    remainingSeconds: 0,
    isActive: false,
    finishCurrentSong: true,
    waitingForSongEnd: false,
    expiresAt: null,

    startTimer: (minutes: number) => {
        clearUiInterval();
        cancelNativeAlarm();

        const totalSeconds = minutes * 60;
        const expiresAt = Date.now() + totalSeconds * 1000;

        set({
            remainingSeconds: totalSeconds,
            isActive: true,
            waitingForSongEnd: false,
            expiresAt,
        });

        // ── Primary mechanism: native AlarmManager exact alarm ──
        // Zero battery cost while waiting. OS fires it at kernel level.
        // Only schedule if "finish current song" is OFF – when ON, we need
        // the JS side to intercept the track change, so we rely on the
        // secondary mechanisms below.
        if (!get().finishCurrentSong) {
            scheduleNativeAlarm(expiresAt);
        }

        // Always show a countdown notification (uses chronometer target time)
        showNativeNotification(expiresAt);

        // ── Secondary mechanisms (belt & suspenders) ──
        // Foreground UI countdown
        startUiInterval();
        // Listen for app returning to foreground
        setupAppStateListener();

        console.log(
            `[SleepTimer] Started – ${minutes} min, expires at ${new Date(expiresAt).toLocaleTimeString()}`,
        );
    },

    cancelTimer: () => {
        clearUiInterval();
        clearAppStateListener();
        cancelNativeAlarm();
        set({
            remainingSeconds: 0,
            isActive: false,
            waitingForSongEnd: false,
            expiresAt: null,
        });
        console.log('[SleepTimer] Cancelled');
    },

    toggleFinishCurrentSong: () => {
        set((state) => {
            const newValue = !state.finishCurrentSong;

            // If there's an active timer, update the native alarm accordingly
            if (state.isActive && state.expiresAt !== null && !state.waitingForSongEnd) {
                if (newValue) {
                    // "Finish current song" turned ON → cancel native alarm
                    // (we'll handle it via track change in JS)
                    cancelNativeAlarm();
                    // Keep the notification active for the countdown
                    showNativeNotification(state.expiresAt);
                } else {
                    // "Finish current song" turned OFF → schedule native alarm
                    scheduleNativeAlarm(state.expiresAt);
                    showNativeNotification(state.expiresAt);
                }
            }

            return { finishCurrentSong: newValue };
        });
    },
}));

// ── Public helpers called from other modules ───────────────────────────

/**
 * Called from the PlaybackActiveTrackChanged listener in playerStore.
 * If the sleep timer is in "waiting for song to end" mode, this will
 * pause playback and deactivate the timer.
 */
export function handleSleepTimerTrackChange(): void {
    const { waitingForSongEnd } = useSleepTimerStore.getState();
    if (waitingForSongEnd) {
        TrackPlayer.pause().catch(console.error);
        clearUiInterval();
        clearAppStateListener();
        cancelNativeAlarm();
        useSleepTimerStore.setState({
            remainingSeconds: 0,
            isActive: false,
            waitingForSongEnd: false,
            expiresAt: null,
        });
        console.log('[SleepTimer] Song ended – playback paused (bedtime! 🌙)');
    }
}

/**
 * Called from PlaybackService on every progress update (~1 s).
 * Acts as a fallback in case the native alarm didn't fire
 * (e.g. the "finish current song" flow that needs JS).
 */
export function checkSleepTimerExpiry(): void {
    handleExpiry();
}
