package com.subsonic.player.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

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
                Log.i(NAME, "⏰ PASO 4/4: JS se despertó y leyó el Flag correctamente, confirmando a React Native")
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }
}
