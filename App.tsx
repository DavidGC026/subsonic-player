import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, AppState, Platform, PermissionsAndroid } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation';
import { CacheManager } from './src/services/CacheManager';
import { useDownloadStore, usePlayerStore, useAlarmStore, useNetworkStore } from './src/store';

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

    // Request Notifications Permission for Android 13+
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
        .then((result) => console.log('POST_NOTIFICATIONS:', result))
        .catch(console.warn);
    }

    // Initialize music cache directory and load downloads
    CacheManager.init()
      .then(() => useDownloadStore.getState().loadDownloads())
      .catch((error) => {
        console.error('Error initializing cache:', error);
      });

    // Start listening for network connectivity changes
    const unsubscribeNetwork = useNetworkStore.getState().startListening();

    return () => {
      appStateSub.remove();
      unsubscribeNetwork();
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
