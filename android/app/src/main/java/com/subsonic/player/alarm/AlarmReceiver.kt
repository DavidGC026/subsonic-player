package com.subsonic.player.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.subsonic.player.R

class AlarmReceiver : BroadcastReceiver() {
    companion object {
        const val CHANNEL_ID = "subsonic_alarm_trigger"
        const val NOTIFICATION_ID = 2001
    }

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra("ALARM_ID") ?: ""
        Log.i("AlarmModule", "⏰ PASO 1/4: Alarma recibida en Receiver, id=$alarmId")
        
        // Save flag + alarm ID in SharedPreferences so JS layer can read it
        val prefs = context.getSharedPreferences("AlarmPrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("isAlarmTriggered", true)
            .putString("triggeredAlarmId", alarmId)
            .apply()
        Log.i("AlarmModule", "⏰ PASO 2/4: Flag guardado con alarmId=$alarmId")

        // Create a high-priority notification channel for the alarm trigger
        createAlarmTriggerChannel(context)

        // Build a full-screen intent to launch the app
        Log.i("AlarmModule", "⏰ PASO 3/4: Lanzando la aplicación principal con full-screen intent...")
        val activityClass = Class.forName("com.subsonic.player.MainActivity")
        val activityIntent = Intent(context, activityClass).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("ALARM_TRIGGERED", true)
        }
        
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            AlarmModule.REQUEST_CODE + 1,
            activityIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Build a high-priority notification with fullScreenIntent
        // This is the official Android way to launch an activity for alarms,
        // and it works on Samsung S24 (Android 14) where startActivity from
        // a BroadcastReceiver is blocked.
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("⏰ ¡Alarma Musical!")
            .setContentText("Toca para abrir tu música")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .setAutoCancel(true)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)

        // Also try to start the activity directly as a fallback (works on some devices)
        try {
            context.startActivity(activityIntent)
        } catch (e: Exception) {
            Log.w("AlarmModule", "Direct startActivity failed (expected on Android 14+), full-screen intent will handle it", e)
        }
    }

    private fun createAlarmTriggerChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Alarma Musical"
            val descriptionText = "Notificación cuando suena la alarma musical"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
