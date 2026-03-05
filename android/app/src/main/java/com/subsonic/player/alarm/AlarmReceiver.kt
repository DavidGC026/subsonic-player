package com.subsonic.player.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.i("AlarmModule", "⏰ PASO 1/4: Evento de alarma recibido en Receiver (¡Llegó la hora!)")
        
        // Save flag in SharedPreferences so JS layer can read it via native module
        val prefs = context.getSharedPreferences("AlarmPrefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("isAlarmTriggered", true).apply()
        Log.i("AlarmModule", "⏰ PASO 2/4: Flag de 'isAlarmTriggered' guardado en disco duro")

        // Launch MainActivity
        Log.i("AlarmModule", "⏰ PASO 3/4: Lanzando la aplicación principal (MainActivity) para encender la pantalla...")
        val activityClass = Class.forName("com.subsonic.player.MainActivity")
        val activityIntent = Intent(context, activityClass).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("ALARM_TRIGGERED", true)
        }
        
        try {
            context.startActivity(activityIntent)
        } catch (e: Exception) {
            Log.e("AlarmModule", "Error starting MainActivity", e)
        }
    }
}
