import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Modal, ImageBackground } from 'react-native';

import {
  HomeScreen,
  LibraryScreen,
  SearchScreen,
  AlbumDetailScreen,
  ArtistDetailScreen,
  PlaylistDetailScreen,
  ServerConfigScreen,
  ThemesScreen,
} from '../screens';
import { MiniPlayer, FullPlayer, SongOptionsModal, PlaylistSelectModal, AnimatedBackground } from '../components';
import { useMusicStore, useConfigStore, useThemeStore, useModalStore } from '../store';

// Type definitions
export type RootStackParamList = {
  MainTabs: undefined;
  AlbumDetail: { albumId: string; albumName: string };
  ArtistDetail: { artistId: string; artistName: string };
  PlaylistDetail: { playlistId: string; playlistName: string };
  ServerConfig: undefined;
  Themes: undefined;
  Player: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
const MainTabNavigator: React.FC = () => {
  const { currentTheme } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: currentTheme.colors.background,
          borderTopColor: currentTheme.flags?.useGlassmorphism ? 'rgba(255,255,255,0.1)' : currentTheme.colors.surface,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          position: currentTheme.flags?.useGlassmorphism ? 'absolute' : 'relative',
          elevation: 0,
        },
        tabBarActiveTintColor: currentTheme.colors.primary,
        tabBarInactiveTintColor: currentTheme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
          tabBarLabel: 'Buscar',
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
          tabBarLabel: 'Biblioteca',
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator with Stack
export const AppNavigator: React.FC = () => {
  const [playerVisible, setPlayerVisible] = useState(false);
  const { isConfigured, loadConfig } = useConfigStore();
  const player = useMusicStore(state => state.player);
  const { currentTheme } = useThemeStore();

  // Modal state from isolated store — no contamination of musicStore
  const optionsModalSong = useModalStore(state => state.optionsModalSong);
  const playlistModalSongs = useModalStore(state => state.playlistModalSongs);
  const setOptionsModalSong = useModalStore(state => state.setOptionsModalSong);
  const setPlaylistModalSongs = useModalStore(state => state.setPlaylistModalSongs);

  useEffect(() => {
    loadConfig();
    useMusicStore.getState().loadCustomPlaylistImages();
  }, []);

  const NavigatorContent = (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen
          name="AlbumDetail"
          component={AlbumDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ArtistDetail"
          component={ArtistDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="PlaylistDetail"
          component={PlaylistDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ServerConfig"
          component={ServerConfigScreen}
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Themes"
          component={ThemesScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>

      {/* Mini Player */}
      {player.currentSong && (
        <MiniPlayer onPress={() => setPlayerVisible(true)} />
      )}

      {/* Full Screen Player Modal */}
      <Modal
        visible={playerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPlayerVisible(false)}
      >
        <FullPlayer onClose={() => setPlayerVisible(false)} />
      </Modal>

      {/* Global Modals */}
      <SongOptionsModal
        visible={!!optionsModalSong}
        song={optionsModalSong}
        onClose={() => setOptionsModalSong(null)}
        onAddToPlaylist={() => {
          setPlaylistModalSongs(optionsModalSong ? [optionsModalSong] : null);
          setOptionsModalSong(null);
        }}
      />

      <PlaylistSelectModal
        visible={!!playlistModalSongs}
        songs={playlistModalSongs}
        onClose={() => setPlaylistModalSongs(null)}
      />
    </>
  );

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {currentTheme.flags?.animatedBackground ? (
        <View style={styles.container}>
          <AnimatedBackground {...currentTheme.flags.animatedBackground} />
          {NavigatorContent}
        </View>
      ) : currentTheme.flags?.useBackgroundImage ? (
        <ImageBackground
          source={require('../../assets/fondo.png')}
          style={styles.container}
          resizeMode="cover"
        >
          {NavigatorContent}
        </ImageBackground>
      ) : (
        <View style={styles.container}>
          {NavigatorContent}
        </View>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppNavigator;
