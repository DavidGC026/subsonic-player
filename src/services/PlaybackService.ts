import TrackPlayer, { Event } from 'react-native-track-player';
import { checkSleepTimerExpiry } from '../store/sleepTimerStore';

/**
 * Playback service registered with TrackPlayer.
 * This runs as a Foreground Service on Android, ensuring audio
 * continues playing when the app is in the background or the screen is locked.
 *
 * All remote events (notification controls, lock screen, headset buttons)
 * are handled here and forwarded to TrackPlayer's internal queue.
 */
export async function PlaybackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        TrackPlayer.stop();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });

    // ── Sleep timer: check expiry on every progress tick (~1 s) ──
    // This fires even in background because PlaybackService runs as a
    // Foreground Service, guaranteeing the sleep timer will trigger.
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, () => {
        checkSleepTimerExpiry();
    });
}
