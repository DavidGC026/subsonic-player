import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation';
import { CacheManager } from './src/services/CacheManager';
import { useDownloadStore, useMusicStore } from './src/store';

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
