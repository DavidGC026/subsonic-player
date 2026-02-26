import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
// 3 columns: 32px total screen padding + 36px total margins (12px * 3 cards)
const gridItemWidth = (screenWidth - 32 - 36) / 3;
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore, useConfigStore, useThemeStore } from '../store';
import { AlbumCard, ArtistCard } from '../components';
import type { Album, Artist } from '../types';

interface HomeScreenProps {
  navigation?: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const {
    albums,
    artists,
    isLoadingAlbums,
    isLoadingArtists,
    fetchAlbums,
    fetchArtists,
    playSong,
  } = useMusicStore();

  const { isConfigured } = useConfigStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    if (isConfigured) {
      loadData();
    }
  }, [isConfigured]);

  const loadData = async () => {
    await Promise.all([
      fetchAlbums(),
      fetchArtists(),
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleAlbumPress = (album: Album) => {
    navigation?.navigate('AlbumDetail', { albumId: album.id, albumName: album.name });
  };

  const handleArtistPress = (artist: Artist) => {
    navigation?.navigate('ArtistDetail', { artistId: artist.id, artistName: artist.name });
  };

  const handleQuickPlay = async () => {
    const { subsonicApi } = await import('../api/subsonic');
    const songs = await subsonicApi.getRandomSongs(20);
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  if (!isConfigured) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: currentTheme.colors.surface }]}>
        <Ionicons name="albums" size={64} color={currentTheme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Bienvenido a Subsonic Player</Text>
        <Text style={[styles.emptyText, { color: currentTheme.colors.textSecondary }]}>
          Configura tu servidor para comenzar a reproducir música
        </Text>
        <TouchableOpacity
          style={[styles.configButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={() => navigation?.navigate('ServerConfig')}
        >
          <Text style={[styles.configButtonText, { color: currentTheme.colors.text }]}>Configurar Servidor</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: currentTheme.colors.text }]}>Buenos días</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation?.navigate('Themes')}
          >
            <Ionicons name="color-palette-outline" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation?.navigate('ServerConfig')}
          >
            <Ionicons name="settings-outline" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: currentTheme.colors.surface }]} onPress={handleQuickPlay}>
            <View style={[styles.quickActionIcon, { backgroundColor: currentTheme.colors.background }]}>
              <Ionicons name="shuffle" size={24} color={currentTheme.colors.text} />
            </View>
            <Text style={[styles.quickActionText, { color: currentTheme.colors.text }]}>Aleatorio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: currentTheme.colors.surface }]}
            onPress={() => navigation?.navigate('Library')}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: currentTheme.colors.background }]}
            >
              <Ionicons name="library" size={24} color={currentTheme.colors.text} />
            </View>
            <Text style={[styles.quickActionText, { color: currentTheme.colors.text }]}>Mi Biblioteca</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: currentTheme.colors.surface }]}
            onPress={() => navigation?.navigate('Search')}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: currentTheme.colors.background }]}
            >
              <Ionicons name="search" size={24} color={currentTheme.colors.text} />
            </View>
            <Text style={[styles.quickActionText, { color: currentTheme.colors.text }]}>Buscar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Recent Albums */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Álbumes Recientes</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Library', { tab: 'albums' })}>
            <Text style={[styles.seeAll, { color: currentTheme.colors.textSecondary }]}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {isLoadingAlbums ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: currentTheme.colors.textSecondary }]}>Cargando...</Text>
            </View>
          ) : albums.length > 0 ? (
            albums.slice(0, 10).map((album, index) => (
              <AlbumCard
                key={`${album.id}-${index}`}
                album={album}
                onPress={handleAlbumPress}
                size={150}
              />
            ))
          ) : (
            <Text style={[styles.emptyListText, { color: currentTheme.colors.textSecondary }]}>No hay álbumes disponibles</Text>
          )}
        </ScrollView>
      </View>

      {/* Artists */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Artistas</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Library', { tab: 'artists' })}>
            <Text style={[styles.seeAll, { color: currentTheme.colors.textSecondary }]}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {isLoadingArtists ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: currentTheme.colors.textSecondary }]}>Cargando...</Text>
            </View>
          ) : artists.length > 0 ? (
            artists.slice(0, 10).map((artist, index) => (
              <ArtistCard
                key={`${artist.id}-${index}`}
                artist={artist}
                onPress={handleArtistPress}
                size={130}
              />
            ))
          ) : (
            <Text style={[styles.emptyListText, { color: currentTheme.colors.textSecondary }]}>No hay artistas disponibles</Text>
          )}
        </ScrollView>
      </View>

      {/* More Albums Grid */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text, paddingHorizontal: 16, marginBottom: 16 }]}>Más Álbumes</Text>
        <View style={styles.albumGrid}>
          {albums.slice(10, 19).map((album, index) => (
            <View key={`${album.id}-${index}`} style={styles.gridItem}>
              <AlbumCard
                album={album}
                onPress={handleAlbumPress}
                size={gridItemWidth}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  configButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  configButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingRight: 16,
    overflow: 'hidden',
  },
  quickActionIcon: {
    padding: 12,
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    padding: 20,
  },
  loadingText: {
  },
  emptyListText: {
    padding: 20,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  gridItem: {
    marginBottom: 16,
  },
  bottomPadding: {
    height: 100,
  },
});

export default HomeScreen;
