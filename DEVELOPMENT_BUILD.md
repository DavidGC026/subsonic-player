# Development Build Setup — Subsonic Player

This project uses **react-native-track-player** which requires native code that is **not compatible with Expo Go**. You must use an **Expo Development Build** (via `expo-dev-client`).

## Prerequisites

### Android SDK & Tools
- **Android Studio** installed with:
  - Android SDK (API 34+)
  - Android SDK Build-Tools
  - Android NDK (if required by dependencies)
  - Android SDK Platform-Tools
- **Java 17** (required by Gradle)
- `ANDROID_HOME` environment variable set (e.g., `~/Android/Sdk`)
- `JAVA_HOME` environment variable set

### Node.js
- Node.js 18+ and npm

### Verify your environment
```bash
npx expo-env-info
```

## First-Time Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Generate native Android project (prebuild)
```bash
npx expo prebuild --platform android
```

This generates the `android/` directory with all native configurations, including:
- `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permissions
- `POST_NOTIFICATIONS` permission (Android 13+)
- `WAKE_LOCK` permission
- react-native-track-player native module linking

### 3. Build and run on a connected device or emulator
```bash
npx expo run:android
```

This compiles the native code and installs the development build on your device.

> **Note:** The first build takes several minutes. Subsequent builds are incremental and much faster.

### 4. Start the development server
After the initial build, you can start the JS bundler separately:
```bash
npx expo start --dev-client
```

## Key Differences from Expo Go

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Native modules | ❌ Limited to Expo SDK | ✅ Any native module |
| Background audio | ❌ No foreground service | ✅ Full foreground service |
| Lock screen controls | ❌ Not available | ✅ Full media controls |
| Build time | Instant | ~3-5 min first build |
| Hot reload | ✅ | ✅ |

## Architecture: Audio Playback

### react-native-track-player
- Runs as an **Android Foreground Service** (Media3-based)
- Survives app backgrounding, screen lock, and system resource management
- Provides notification controls (play, pause, skip, seek)
- Provides lock screen and Bluetooth/headset controls

### Playback Service (`src/services/PlaybackService.ts`)
Registered at module level in `App.tsx`. Handles remote events:
- `RemotePlay`, `RemotePause`, `RemoteStop`
- `RemoteNext`, `RemotePrevious`
- `RemoteSeek`

### Music Store (`src/store/musicStore.ts`)
- `initTrackPlayer()` — Sets up the player with capabilities and event listeners
- `loadAndPlaySong()` — Resolves URI via CacheManager, builds a Track, resets queue, plays
- `seekTo(ms)` — Seeks to position (converts ms → seconds for TrackPlayer)
- Progress updates via `Event.PlaybackProgressUpdated` (1-second interval)

### CacheManager Integration
The CacheManager flow is preserved:
1. `loadAndPlaySong()` calls `CacheManager.getPlaybackUri(song, remoteUrl)`
2. CacheManager returns `file://` URI if cached, or remote URL if not
3. The resolved URI is passed to TrackPlayer as the track URL

## Android Permissions (app.json)

```json
{
  "android": {
    "permissions": [
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "POST_NOTIFICATIONS",
      "WAKE_LOCK"
    ]
  }
}
```

These are automatically injected into `AndroidManifest.xml` during `npx expo prebuild`.

## Troubleshooting

### "TrackPlayer has not been initialized"
Make sure `initTrackPlayer()` is called before any playback. This happens automatically in `App.tsx` via `useEffect`.

### Build fails with Gradle errors
```bash
cd android && ./gradlew clean && cd ..
npx expo run:android
```

### Notification not showing
Ensure `POST_NOTIFICATIONS` permission is granted on Android 13+. The app should request this at runtime.

### Regenerate native project
If you need to regenerate the native project after changing `app.json`:
```bash
npx expo prebuild --clean --platform android
npx expo run:android
```
