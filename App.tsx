import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation';
import { CacheManager } from './src/services/CacheManager';
import { useDownloadStore, usePlayerStore } from './src/store';

export default function App() {
  useEffect(() => {
    // Initialize TrackPlayer
    usePlayerStore.getState().initTrackPlayer();

    // Initialize music cache directory and load downloads
    CacheManager.init()
      .then(() => useDownloadStore.getState().loadDownloads())
      .catch((error) => {
        console.error('Error initializing cache:', error);
      });
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
