import { create } from 'zustand';
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

    /** Start a timer for the given number of minutes */
    startTimer: (minutes: number) => void;
    /** Cancel the active timer */
    cancelTimer: () => void;
    /** Toggle "finish current song" option */
    toggleFinishCurrentSong: () => void;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export const useSleepTimerStore = create<SleepTimerStore>((set, get) => ({
    remainingSeconds: 0,
    isActive: false,
    finishCurrentSong: true,
    waitingForSongEnd: false,

    startTimer: (minutes: number) => {
        // Clear any existing timer
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        const totalSeconds = minutes * 60;

        set({
            remainingSeconds: totalSeconds,
            isActive: true,
            waitingForSongEnd: false,
        });

        intervalId = setInterval(() => {
            const { remainingSeconds, finishCurrentSong, waitingForSongEnd } = get();

            if (waitingForSongEnd) {
                // We're in "waiting for song to end" mode – 
                // this is handled by the PlaybackActiveTrackChanged listener
                return;
            }

            if (remainingSeconds <= 1) {
                // Timer expired
                if (finishCurrentSong) {
                    // Enter "waiting for current song to end" mode
                    set({
                        remainingSeconds: 0,
                        waitingForSongEnd: true,
                    });
                    // Don't clear interval yet – we keep it alive for the UI to show
                    // "waiting..." state. The track change listener will handle stopping.
                } else {
                    // Stop immediately
                    TrackPlayer.pause().catch(console.error);
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                    set({
                        remainingSeconds: 0,
                        isActive: false,
                        waitingForSongEnd: false,
                    });
                }
            } else {
                set({ remainingSeconds: remainingSeconds - 1 });
            }
        }, 1000);
    },

    cancelTimer: () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        set({
            remainingSeconds: 0,
            isActive: false,
            waitingForSongEnd: false,
        });
    },

    toggleFinishCurrentSong: () => {
        set((state) => ({ finishCurrentSong: !state.finishCurrentSong }));
    },
}));

/**
 * Called from the PlaybackActiveTrackChanged listener in playerStore.
 * If the sleep timer is in "waiting for song to end" mode, this will
 * pause playback and deactivate the timer.
 */
export function handleSleepTimerTrackChange(): void {
    const { waitingForSongEnd } = useSleepTimerStore.getState();
    if (waitingForSongEnd) {
        TrackPlayer.pause().catch(console.error);
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        useSleepTimerStore.setState({
            remainingSeconds: 0,
            isActive: false,
            waitingForSongEnd: false,
        });
        console.log('[SleepTimer] Song ended – playback paused (bedtime! 🌙)');
    }
}
