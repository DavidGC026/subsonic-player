package com.subsonic.player.alarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
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
        // Legacy single-alarm method — delegates to setAlarmWithId with default code
        setAlarmWithId(epochMs, "", REQUEST_CODE.toDouble(), promise)
    }

    @ReactMethod
    fun setAlarmWithId(epochMs: Double, alarmId: String, requestCode: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val code = requestCode.toInt()

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
                    promise.reject("ALARM_PERMISSION", "Permiso de alarma exacta no concedido.")
                    return
                }
            }

            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("ALARM_ID", alarmId)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                code,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            val info = AlarmManager.AlarmClockInfo(epochMs.toLong(), pendingIntent)
            alarmManager.setAlarmClock(info, pendingIntent)

            NotificationHelper.showAlarmNotification(context, epochMs.toLong())

            Log.i(NAME, "Alarm scheduled: id=$alarmId, code=$code, epoch=${epochMs.toLong()}")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "Failed to schedule alarm", e)
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlarm(promise: Promise) {
        // Legacy single-alarm cancel
        cancelAlarmWithId("", REQUEST_CODE.toDouble(), promise)
    }

    @ReactMethod
    fun cancelAlarmWithId(alarmId: String, requestCode: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val code = requestCode.toInt()

            val intent = Intent(context, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                code,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
            )

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
                Log.i(NAME, "Alarm cancelled: id=$alarmId, code=$code")
            }

            NotificationHelper.cancelAlarmNotification(context)

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(AlarmReceiver.NOTIFICATION_ID)

            val prefs = context.getSharedPreferences("AlarmPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("isAlarmTriggered", false)
                .remove("triggeredAlarmId")
                .apply()

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
                val alarmId = prefs.getString("triggeredAlarmId", null)
                prefs.edit()
                    .putBoolean("isAlarmTriggered", false)
                    .remove("triggeredAlarmId")
                    .apply()

                NotificationHelper.cancelAlarmNotification(reactApplicationContext)

                val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.cancel(AlarmReceiver.NOTIFICATION_ID)

                val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxVolume, 0)
                Log.i(NAME, "Volumen maximizado a $maxVolume")

                Log.i(NAME, "⏰ PASO 4/4: Alarm triggered, id=$alarmId")
                // Return the alarm ID so JS knows which alarm fired
                promise.resolve(alarmId ?: true)
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
            val activity = reactApplicationContext.currentActivity
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

    /**
     * Check if the app has the USE_FULL_SCREEN_INTENT permission.
     * On Android 14+ (API 34), this is a runtime permission that must be granted
     * by the user in Settings for non-phone/alarm apps.
     */
    @ReactMethod
    fun hasFullScreenIntentPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                promise.resolve(notificationManager.canUseFullScreenIntent())
            } else {
                // Pre-Android 14 always has permission
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    /**
     * Open the system settings for full-screen intent permission.
     */
    @ReactMethod
    fun requestFullScreenIntentPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (!notificationManager.canUseFullScreenIntent()) {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                        data = Uri.parse("package:${reactApplicationContext.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(false) // Opened settings, user needs to grant
                } else {
                    promise.resolve(true) // Already granted
                }
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(NAME, "Error requesting full screen intent permission", e)
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    /**
     * Check if the app is exempt from battery optimizations.
     */
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            promise.resolve(pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName))
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    /**
     * Request battery optimization exemption.
     * This shows a direct system dialog asking the user to exempt the app.
     */
    @ReactMethod
    fun requestBatteryOptimizationExemption(promise: Promise) {
        try {
            val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(false) // Opened dialog, waiting for user
            } else {
                promise.resolve(true) // Already exempted
            }
        } catch (e: Exception) {
            Log.e(NAME, "Error requesting battery optimization exemption", e)
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    /**
     * Check all alarm-related permissions and return their status.
     */
    @ReactMethod
    fun checkAllAlarmPermissions(promise: Promise) {
        try {
            val result = WritableNativeMap()

            // 1. Exact alarm permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                result.putBoolean("canScheduleExactAlarms", alarmManager.canScheduleExactAlarms())
            } else {
                result.putBoolean("canScheduleExactAlarms", true)
            }

            // 2. Full screen intent permission (Android 14+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                result.putBoolean("canUseFullScreenIntent", notificationManager.canUseFullScreenIntent())
            } else {
                result.putBoolean("canUseFullScreenIntent", true)
            }

            // 3. Battery optimization exemption
            val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            result.putBoolean("isIgnoringBatteryOptimizations", pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName))

            // 4. Notification permission (Android 13+)
            val notifManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            result.putBoolean("areNotificationsEnabled", notifManager.areNotificationsEnabled())

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }
}
