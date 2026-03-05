import { create } from 'zustand';
import { AppState, type NativeEventSubscription } from 'react-native';
import TrackPlayer from 'react-native-track-player';

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

        const totalSeconds = minutes * 60;
        const expiresAt = Date.now() + totalSeconds * 1000;

        set({
            remainingSeconds: totalSeconds,
            isActive: true,
            waitingForSongEnd: false,
            expiresAt,
        });

        // Start foreground UI countdown
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
        set({
            remainingSeconds: 0,
            isActive: false,
            waitingForSongEnd: false,
            expiresAt: null,
        });
        console.log('[SleepTimer] Cancelled');
    },

    toggleFinishCurrentSong: () => {
        set((state) => ({ finishCurrentSong: !state.finishCurrentSong }));
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
 * Because the PlaybackService runs as an Android Foreground Service,
 * this fires even when the React Native JS bridge is in the background,
 * guaranteeing the timer will trigger.
 */
export function checkSleepTimerExpiry(): void {
    handleExpiry();
}
