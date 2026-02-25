import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { AppNavigator } from './src/navigation';
import { CacheManager } from './src/services/CacheManager';
import { PlaybackService } from './src/services/PlaybackService';
import { useDownloadStore, useMusicStore } from './src/store';

// Register the playback service — must be called at module level
TrackPlayer.registerPlaybackService(() => PlaybackService);

export default function App() {
  useEffect(() => {
    // Initialize TrackPlayer
    useMusicStore.getState().initTrackPlayer();

    // Initialize music cache directory and load downloads
    CacheManager.init()
      .then(() => useDownloadStore.getState().loadDownloads())
      .catch((error) => {
        console.error('Error initializing cache:', error);
      });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
