#!/bin/bash
# Patch react-native-track-player MusicModule.kt for Kotlin 2.x compatibility
# Fixes: "Argument type mismatch: actual type is 'Bundle?', but 'Bundle' was expected"

MUSIC_MODULE="node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt"

if [ -f "$MUSIC_MODULE" ]; then
  # Patch line with getTrack - originalItem is Bundle?
  sed -i 's/Arguments\.fromBundle(musicService\.tracks\[index\]\.originalItem)/Arguments.fromBundle(musicService.tracks[index].originalItem ?: android.os.Bundle())/g' "$MUSIC_MODULE"
  
  # Patch line with getActiveTrack - track is Bundle?
  sed -i 's/Arguments\.fromBundle(track)/Arguments.fromBundle(track ?: android.os.Bundle())/g' "$MUSIC_MODULE"
  
  echo "[patch] react-native-track-player MusicModule.kt patched for Kotlin 2.x"
else
  echo "[patch] MusicModule.kt not found, skipping patch"
fi
