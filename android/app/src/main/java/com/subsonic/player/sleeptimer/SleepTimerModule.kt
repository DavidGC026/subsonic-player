package com.subsonic.player.sleeptimer

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module that exposes AlarmManager-based sleep timer to JS.
 *
 * Uses setExactAndAllowWhileIdle() so the alarm fires even in Doze mode
 * with zero battery cost while waiting (the OS handles the scheduling
 * at the kernel level).
 */
class SleepTimerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SleepTimerModule"
        const val TAG = "SleepTimerModule"
        const val REQUEST_CODE = 42_042
    }

    override fun getName(): String = NAME

    /**
     * Schedule an exact alarm at [expiresAtMs] (absolute epoch ms).
     * When it fires, SleepTimerAlarmReceiver will pause TrackPlayer.
     */
    @ReactMethod
    fun scheduleAlarm(expiresAtMs: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, SleepTimerAlarmReceiver::class.java).apply {
                action = SleepTimerAlarmReceiver.ACTION_SLEEP_TIMER
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            // Use setExactAndAllowWhileIdle for reliable delivery even in Doze
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                expiresAtMs.toLong(),
                pendingIntent
            )

            Log.i(TAG, "Alarm scheduled at epoch ${expiresAtMs.toLong()}")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule alarm", e)
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    /**
     * Cancel any previously scheduled sleep timer alarm.
     */
    @ReactMethod
    fun cancelAlarm(promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, SleepTimerAlarmReceiver::class.java).apply {
                action = SleepTimerAlarmReceiver.ACTION_SLEEP_TIMER
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
            )

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
                Log.i(TAG, "Alarm cancelled")
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel alarm", e)
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    /**
     * Check whether the app can schedule exact alarms (Android 12+ requirement).
     */
    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager =
                reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            promise.resolve(alarmManager.canScheduleExactAlarms())
        } else {
            // Pre-Android 12: exact alarms always allowed
            promise.resolve(true)
        }
    }
}
