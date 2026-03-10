package com.subsonic.player.tv

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

class TvAuthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var serverSocket: ServerSocket? = null
    private var isRunning = false

    override fun getName(): String {
        return "TvAuthModule"
    }

    @ReactMethod
    fun getLocalIpAddress(promise: Promise) {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is java.net.Inet4Address) {
                        promise.resolve(address.hostAddress)
                        return
                    }
                }
            }
            promise.resolve("127.0.0.1")
        } catch (e: Exception) {
            promise.reject("IP_ERROR", e.message)
        }
    }

    @ReactMethod
    fun startAuthServer(port: Int, promise: Promise) {
        if (serverSocket != null && !serverSocket!!.isClosed) {
            promise.resolve(true)
            return
        }

        try {
            serverSocket = ServerSocket(port)
            isRunning = true
            promise.resolve(true)

            thread {
                while (isRunning && serverSocket != null && !serverSocket!!.isClosed) {
                    try {
                        val client: Socket = serverSocket!!.accept()
                        handleClient(client)
                    } catch (e: Exception) {
                        // Socket closed or timeout
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject("SERVER_ERROR", e.message)
        }
    }

    private fun handleClient(client: Socket) {
        try {
            val reader = BufferedReader(InputStreamReader(client.getInputStream()))
            val firstLine = reader.readLine()

            if (firstLine != null && firstLine.startsWith("POST")) {
                var contentLength = 0
                var line = reader.readLine()
                
                // Read HTTP Headers
                while (line != null && line.isNotEmpty()) {
                    if (line.lowercase().startsWith("content-length:")) {
                        contentLength = line.substringAfter(":").trim().toInt()
                    }
                    line = reader.readLine()
                }

                if (contentLength > 0) {
                    val charArray = CharArray(contentLength)
                    reader.read(charArray, 0, contentLength)
                    val body = String(charArray)

                    // Send HTTP 200 OK so client knows it succeeded
                    val out = client.getOutputStream().bufferedWriter()
                    out.write("HTTP/1.1 200 OK\r\n")
                    out.write("Content-Type: application/json\r\n")
                    out.write("Connection: close\r\n")
                    out.write("\r\n")
                    out.write("{\"status\":\"success\"}")
                    out.flush()

                    // Emit event to React Native
                    reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onTvAuthCredentialsReceived", body)
                }
            }
            client.close()
        } catch (e: Exception) {
            Log.e("TvAuthModule", "Error handling client", e)
        }
    }

    @ReactMethod
    fun stopAuthServer(promise: Promise) {
        try {
            isRunning = false
            serverSocket?.close()
            serverSocket = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLOSE_ERROR", e.message)
        }
    }
}
