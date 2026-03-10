package com.subsonic.player

import android.os.Build
import android.os.Bundle
import android.content.Intent
import android.app.KeyguardManager
import android.view.WindowManager

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);

    // If launched by our alarm, show over lockscreen without dismissing it
    if (intent?.getBooleanExtra("ALARM_TRIGGERED", false) == true) {
        enableLockScreenOverlay()
    } else {
        // Not an alarm — ensure lock screen flags are cleared (cleanup from previous alarm)
        disableLockScreenOverlay()
    }

    super.onCreate(null)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (intent.getBooleanExtra("ALARM_TRIGGERED", false) == true) {
        enableLockScreenOverlay()
    }
  }

  /**
   * Show the activity over the lock screen and turn on the screen.
   * Does NOT dismiss the keyguard — the user sees our alarm UI on top
   * of the lock screen and can interact with it (dismiss/snooze).
   */
  fun enableLockScreenOverlay() {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
          setShowWhenLocked(true)
          setTurnScreenOn(true)
      } else {
          @Suppress("DEPRECATION")
          window.addFlags(
              WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
              WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
          )
      }
      window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  /**
   * Clear the lock screen overlay flags so the app goes back to normal behavior.
   * Called from AlarmModule when the user dismisses the alarm.
   */
  fun disableLockScreenOverlay() {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
          setShowWhenLocked(false)
          setTurnScreenOn(false)
      } else {
          @Suppress("DEPRECATION")
          window.clearFlags(
              WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
              WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
          )
      }
      window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
