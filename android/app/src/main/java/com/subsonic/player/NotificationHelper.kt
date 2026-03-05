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
    private const val CHANNEL_ID = "subsonic_timers_v2"
    private const val ALARM_NOTIF_ID = 1001
    private const val SLEEP_TIMER_NOTIF_ID = 1002

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Recordatorios de Música"
            val descriptionText = "Notificaciones para el Temporizador y Alarma"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
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
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Alarma Programada")
            .setContentText("La música sonará a las $timeString")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        try {
            NotificationManagerCompat.from(context).notify(ALARM_NOTIF_ID, builder.build())
            android.util.Log.i("NotificationHelper", "Alarm notification shown for $timeString")
        } catch (e: SecurityException) {
            android.util.Log.e("NotificationHelper", "Permission denied for notifications", e)
        }
    }

    fun cancelAlarmNotification(context: Context) {
        NotificationManagerCompat.from(context).cancel(ALARM_NOTIF_ID)
        android.util.Log.i("NotificationHelper", "Alarm notification cancelled")
    }

    fun showSleepTimerNotification(context: Context, expiresAtMs: Long) {
        createChannel(context)
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = launchIntent?.let {
            PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Temporizador activo")
            .setContentText("La música se detendrá pronto")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)

        // The chronometer will count down to this "when" time
        builder.setWhen(expiresAtMs)
        builder.setUsesChronometer(true)
        builder.setShowWhen(true)
        builder.setSubText("Cuenta regresiva")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setChronometerCountDown(true)
        }

        try {
            val now = System.currentTimeMillis()
            android.util.Log.i("NotificationHelper", "Sleep timer. Now: $now, Expires: $expiresAtMs, Diff: ${expiresAtMs - now}ms")
            NotificationManagerCompat.from(context).notify(SLEEP_TIMER_NOTIF_ID, builder.build())
        } catch (e: SecurityException) {
            android.util.Log.e("NotificationHelper", "Permission denied for notifications", e)
        }
    }

    fun cancelSleepTimerNotification(context: Context) {
        NotificationManagerCompat.from(context).cancel(SLEEP_TIMER_NOTIF_ID)
        android.util.Log.i("NotificationHelper", "Sleep timer notification cancelled")
    }
}
