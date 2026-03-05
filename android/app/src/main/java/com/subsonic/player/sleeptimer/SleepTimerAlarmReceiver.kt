package com.subsonic.player.sleeptimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.KeyEvent

/**
 * BroadcastReceiver that fires when the AlarmManager alarm triggers.
 *
 * It simulates a MEDIA_PAUSE key event through AudioManager, which is the same
 * path as pressing "pause" on a headset or the lock-screen notification.
 * This works reliably even when the JS thread is fully asleep because
 * it goes through the Android media framework, not through React Native.
 */
class SleepTimerAlarmReceiver : BroadcastReceiver() {
    companion object {
        const val TAG = "SleepTimerAlarm"
        const val ACTION_SLEEP_TIMER = "com.subsonic.player.SLEEP_TIMER_EXPIRED"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_SLEEP_TIMER) return

        Log.i(TAG, "Sleep timer alarm fired – sending pause via media key 🌙")

        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

        // Send KEYCODE_MEDIA_PAUSE through the media framework.
        // This is handled by the active MediaSession (TrackPlayer's MusicService).
        Handler(Looper.getMainLooper()).post {
            val downEvent = KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PAUSE)
            audioManager.dispatchMediaKeyEvent(downEvent)

            val upEvent = KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PAUSE)
            audioManager.dispatchMediaKeyEvent(upEvent)

            Log.i(TAG, "Media pause key dispatched successfully")
            
            com.subsonic.player.NotificationHelper.cancelSleepTimerNotification(context)
        }
    }
}
