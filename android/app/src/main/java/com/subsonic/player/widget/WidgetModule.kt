package com.subsonic.player.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import kotlin.concurrent.thread

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "WidgetModule"

    @ReactMethod
    fun updateWidget(title: String, artist: String, isPlaying: Boolean, coverArtUrl: String?, primaryColor: String?) {
        val context = reactApplicationContext

        thread {
            var localPath: String? = null
            try {
                if (coverArtUrl != null) {
                    val bitmap: Bitmap? = if (coverArtUrl.startsWith("http")) {
                        BitmapFactory.decodeStream(URL(coverArtUrl).openConnection().getInputStream())
                    } else if (coverArtUrl.startsWith("file://")) {
                        BitmapFactory.decodeFile(android.net.Uri.parse(coverArtUrl).path)
                    } else {
                        BitmapFactory.decodeFile(coverArtUrl)
                    }

                    if (bitmap != null) {
                        // Make it circular like a vinyl disc & limit size to 256 to avoid IPC limit
                        val MAX_SIZE = 256
                        val originalSize = Math.min(bitmap.width, bitmap.height)
                        val scale = if (originalSize > MAX_SIZE) MAX_SIZE.toFloat() / originalSize else 1f
                        val size = (originalSize * scale).toInt()
                        
                        val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
                        val canvas = Canvas(output)
                        val paint = Paint().apply { isAntiAlias = true }
                        val rect = Rect(0, 0, size, size)
                        val rectF = RectF(rect)

                        canvas.drawARGB(0, 0, 0, 0)
                        canvas.drawOval(rectF, paint)
                        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
                        
                        // Calculate offset for center crop from the original bitmap
                        val dx = (bitmap.width - originalSize) / 2
                        val dy = (bitmap.height - originalSize) / 2
                        val srcRect = Rect(dx, dy, dx + originalSize, dy + originalSize)
                        
                        canvas.drawBitmap(bitmap, srcRect, rect, paint)

                        // Save to internal storage
                        val file = File(context.filesDir, "widget_cover.png")
                        FileOutputStream(file).use { out ->
                            output.compress(Bitmap.CompressFormat.PNG, 100, out)
                        }
                        localPath = file.absolutePath
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("title", title)
                .putString("artist", artist)
                .putBoolean("isPlaying", isPlaying)
                .putString("coverArtPath", localPath)
                .putString("primaryColor", primaryColor)
                .apply()

            // Distribute to all instances of the widget
            val intent = Intent(context, MusicWidgetProvider::class.java)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, MusicWidgetProvider::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }
}
