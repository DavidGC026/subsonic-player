package com.subsonic.player.alarm

import android.app.AlarmManager
import android.app.NotificationManager
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
import android.media.AudioManager
import com.subsonic.player.MainActivity
import com.subsonic.player.NotificationHelper

class AlarmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "AlarmModule"
        const val REQUEST_CODE = 99_099
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun setAlarm(epochMs: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // On Android 12+ (API 31+), we need to check if we can schedule exact alarms
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.w(NAME, "Cannot schedule exact alarms, opening settings...")
                    try {
                        val settingsIntent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        context.startActivity(settingsIntent)
                    } catch (e: Exception) {
                        Log.e(NAME, "Could not open exact alarm settings", e)
                    }
                    promise.reject("ALARM_PERMISSION", "Permiso de alarma exacta no concedido. Se abrió la configuración.")
                    return
                }
            }

            val intent = Intent(context, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            // Specifically for an Alarm Clock to wake up the screen and user
            val info = AlarmManager.AlarmClockInfo(epochMs.toLong(), pendingIntent)
            alarmManager.setAlarmClock(info, pendingIntent)

            NotificationHelper.showAlarmNotification(context, epochMs.toLong())

            Log.i(NAME, "Alarm clock scheduled at epoch ${epochMs.toLong()}")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "Failed to schedule alarm", e)
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlarm(promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
            )

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
                Log.i(NAME, "Alarm clock cancelled")
            }
            
            NotificationHelper.cancelAlarmNotification(context)

            // Cancel the alarm trigger notification too
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(AlarmReceiver.NOTIFICATION_ID)

            // Also clear any triggered flag if it was pending
            val prefs = context.getSharedPreferences("AlarmPrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("isAlarmTriggered", false).apply()

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "Failed to cancel alarm", e)
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkPendingAlarm(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("AlarmPrefs", Context.MODE_PRIVATE)
            val triggered = prefs.getBoolean("isAlarmTriggered", false)
            if (triggered) {
                prefs.edit().putBoolean("isAlarmTriggered", false).apply()
                NotificationHelper.cancelAlarmNotification(reactApplicationContext)

                // Cancel the alarm trigger notification
                val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.cancel(AlarmReceiver.NOTIFICATION_ID)

                val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxVolume, 0)
                Log.i(NAME, "Volumen maximizado nativamente a $maxVolume")

                Log.i(NAME, "⏰ PASO 4/4: JS se despertó y leyó el Flag correctamente, confirmando a React Native")
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun dismissAlarmScreen(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity is MainActivity) {
                activity.runOnUiThread {
                    activity.disableLockScreenOverlay()
                }
                Log.i(NAME, "Lock screen overlay flags cleared")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "Failed to dismiss alarm screen", e)
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                promise.resolve(alarmManager.canScheduleExactAlarms())
            } else {
                // Pre-Android 12 always has permission  
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }
}
