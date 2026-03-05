package com.subsonic.player.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.AudioManager
import android.net.Uri
import android.util.Log
import android.view.KeyEvent
import android.widget.RemoteViews
import com.subsonic.player.R
import java.io.File

class MusicWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
        val title = prefs.getString("title", "Subsonic Player") ?: "Subsonic Player"
        val artist = prefs.getString("artist", "Elige una pista...") ?: "Elige una pista..."
        val isPlaying = prefs.getBoolean("isPlaying", false)
        val coverArtPath = prefs.getString("coverArtPath", null)
        val primaryColor = prefs.getString("primaryColor", "#1DB954") ?: "#1DB954"

        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, title, artist, isPlaying, coverArtPath, primaryColor)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val action = intent.action
        if (action == "ACTION_WIDGET_PLAY_PAUSE" || action == "ACTION_WIDGET_NEXT" || action == "ACTION_WIDGET_PREV") {
            try {
                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                var keyCode = -1
                when (action) {
                    "ACTION_WIDGET_PLAY_PAUSE" -> keyCode = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
                    "ACTION_WIDGET_NEXT" -> keyCode = KeyEvent.KEYCODE_MEDIA_NEXT
                    "ACTION_WIDGET_PREV" -> keyCode = KeyEvent.KEYCODE_MEDIA_PREVIOUS
                }

                if (keyCode != -1) {
                    Log.i("WidgetModule", "Widget dispachando evento de media: \$keyCode")
                    audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, keyCode))
                    audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, keyCode))
                }
            } catch (e: Exception) {
                Log.e("WidgetModule", "Error dispatching media event", e)
            }
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            title: String,
            artist: String,
            isPlaying: Boolean,
            coverArtPath: String?,
            primaryColor: String
        ) {
            val layoutId = selectLayoutResource(appWidgetId)
            val views = RemoteViews(context.packageName, layoutId)

            views.setTextViewText(R.id.widget_title, title)
            views.setTextViewText(R.id.widget_artist, artist)

            if (isPlaying) {
                views.setImageViewResource(R.id.widget_btn_play, android.R.drawable.ic_media_pause)
            } else {
                views.setImageViewResource(R.id.widget_btn_play, android.R.drawable.ic_media_play)
            }

            try {
                val color = android.graphics.Color.parseColor(primaryColor)
                views.setInt(R.id.widget_btn_play_bg, "setColorFilter", color)
                // Optional accent backgrounds per style (ignored if view not present)
                views.setInt(R.id.widget_container, "setBackgroundColor", android.graphics.Color.TRANSPARENT)
                views.setInt(R.id.widget_controls_bg, "setColorFilter", color)
            } catch (e: Exception) { }

            if (coverArtPath != null) {
                try {
                    val path = if (coverArtPath.startsWith("file://")) Uri.parse(coverArtPath).path else coverArtPath
                    if (path != null && File(path).exists()) {
                        val bitmap = BitmapFactory.decodeFile(path)
                        if (bitmap != null) {
                            views.setImageViewBitmap(R.id.widget_cover, bitmap)
                        } else {
                            views.setImageViewResource(R.id.widget_cover, android.R.drawable.ic_menu_gallery)
                        }
                    } else {
                        views.setImageViewResource(R.id.widget_cover, android.R.drawable.ic_menu_gallery)
                    }
                } catch (e: Exception) {
                    views.setImageViewResource(R.id.widget_cover, android.R.drawable.ic_menu_gallery)
                }
            } else {
                views.setImageViewResource(R.id.widget_cover, android.R.drawable.ic_menu_gallery)
            }

            // Click Handlers (Pending Intent needs to be explicitly targeting this receiver)
            views.setOnClickPendingIntent(R.id.widget_btn_play, getPendingIntent(context, "ACTION_WIDGET_PLAY_PAUSE"))
            views.setOnClickPendingIntent(R.id.widget_btn_next, getPendingIntent(context, "ACTION_WIDGET_NEXT"))
            views.setOnClickPendingIntent(R.id.widget_btn_prev, getPendingIntent(context, "ACTION_WIDGET_PREV"))

            // Launch app when tapping background/text
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingLaunch = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                views.setOnClickPendingIntent(R.id.widget_container, pendingLaunch)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun selectLayoutResource(appWidgetId: Int): Int {
            return when (appWidgetId % 4) {
                0 -> R.layout.widget_music_style_a
                1 -> R.layout.widget_music_style_b
                2 -> R.layout.widget_music_style_c
                else -> R.layout.widget_music_style_d
            }
        }

        private fun getPendingIntent(context: Context, action: String): PendingIntent {
            val intent = Intent(context, MusicWidgetProvider::class.java)
            intent.action = action
            return PendingIntent.getBroadcast(
                context, 
                action.hashCode(), 
                intent, 
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }
    }
}
