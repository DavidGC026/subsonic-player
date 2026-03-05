import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation';
import { CacheManager } from './src/services/CacheManager';
import { useDownloadStore, usePlayerStore, useAlarmStore } from './src/store';

export default function App() {
  useEffect(() => {
    // Initialize TrackPlayer
    usePlayerStore.getState().initTrackPlayer();

    // Check if the app was launched by the Alarm Receiver (cold boot)
    useAlarmStore.getState().checkPendingAlarm();

    // Check if the app was brought to foreground by the Alarm Receiver (warm boot)
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useAlarmStore.getState().checkPendingAlarm();
      }
    });

    // Initialize music cache directory and load downloads
    CacheManager.init()
      .then(() => useDownloadStore.getState().loadDownloads())
      .catch((error) => {
        console.error('Error initializing cache:', error);
      });

    return () => {
      appStateSub.remove();
    };
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
