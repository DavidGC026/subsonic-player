package com.subsonic.player

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object NotificationHelper {
    private const val CHANNEL_ID = "subsonic_timers_channel"
    private const val ALARM_NOTIF_ID = 1001
    private const val SLEEP_TIMER_NOTIF_ID = 1002

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Timers & Alarms"
            val descriptionText = "Notifications for Sleep Timer and Alarm"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun showAlarmNotification(context: Context, epochMs: Long) {
        createChannel(context)
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = launchIntent?.let {
            PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }
        val timeString = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(epochMs))

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle("Alarma Pendiente")
            .setContentText("La música sonará a las \$timeString")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)

        try {
            NotificationManagerCompat.from(context).notify(ALARM_NOTIF_ID, builder.build())
        } catch (e: SecurityException) {
            // Missing POST_NOTIFICATIONS permission
        }
    }

    fun cancelAlarmNotification(context: Context) {
        NotificationManagerCompat.from(context).cancel(ALARM_NOTIF_ID)
    }

    fun showSleepTimerNotification(context: Context, expiresAtMs: Long) {
        createChannel(context)
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = launchIntent?.let {
            PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle("Temporizador de Apagado")
            .setContentText("Apagando en...")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(true)
            builder.setWhen(expiresAtMs)
        }

        try {
            NotificationManagerCompat.from(context).notify(SLEEP_TIMER_NOTIF_ID, builder.build())
        } catch (e: SecurityException) {
            // Missing POST_NOTIFICATIONS permission
        }
    }

    fun cancelSleepTimerNotification(context: Context) {
        NotificationManagerCompat.from(context).cancel(SLEEP_TIMER_NOTIF_ID)
    }
}
