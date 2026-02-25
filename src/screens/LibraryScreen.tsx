import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore, useThemeStore, useConfigStore } from '../store';
import { AlbumCard, ArtistCard, SongItem } from '../components';
import type { Album, Artist, Song } from '../types';

type LibraryTab = 'albums' | 'artists' | 'songs' | 'playlists';

interface LibraryScreenProps {
  navigation?: any;
  route?: { params?: { tab?: LibraryTab } };
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>(route?.params?.tab || 'albums');
  const {
    albums,
    artists,
    playlists,
    isLoadingAlbums,
    isLoadingArtists,
    isLoadingPlaylists,
    fetchAlbums,
    fetchArtists,
    fetchPlaylists,
    fetchAlbumSongs,
    playSong,
    customPlaylistImages,
  } = useMusicStore();

  const { isConfigured } = useConfigStore();
  const [refreshing, setRefreshing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    if (isConfigured) {
      loadData();
    }
  }, [isConfigured, activeTab]);

  const loadData = async () => {
    switch (activeTab) {
      case 'albums':
        await fetchAlbums();
        break;
      case 'artists':
        await fetchArtists();
        break;
      case 'playlists':
        await fetchPlaylists();
        break;
      case 'songs':
        await loadAllSongs();
        break;
    }
  };

  const loadAllSongs = async () => {
    setIsLoadingSongs(true);
    try {
      const allSongs: Song[] = [];
      const albumIds = albums.slice(0, 10).map((a) => a.id);

      for (const albumId of albumIds) {
        const albumSongs = await fetchAlbumSongs(albumId);
        allSongs.push(...albumSongs);
      }

      setSongs(allSongs);
    } catch (error) {
      console.error('Error loading songs:', error);
    } finally {
      setIsLoadingSongs(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [activeTab]);

  const handleAlbumPress = (album: Album) => {
    navigation?.navigate('AlbumDetail', { albumId: album.id, albumName: album.name });
  };

  const handleArtistPress = (artist: Artist) => {
    navigation?.navigate('ArtistDetail', { artistId: artist.id, artistName: artist.name });
  };

  const handleSongPress = (song: Song) => {
    playSong(song, songs);
  };

  const renderTabButton = (tab: LibraryTab, label: string, icon: any) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && { backgroundColor: currentTheme.colors.primary }]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon}
        size={18}
        color={activeTab === tab ? currentTheme.colors.black : currentTheme.colors.text}
      />
      <Text
        style={[
          styles.tabButtonText,
          { color: activeTab === tab ? currentTheme.colors.black : currentTheme.colors.text }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAlbums = () => (
    <FlatList
      data={albums}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.columnWrapper}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B22222" />
      }
      renderItem={({ item }) => (
        <View style={styles.gridItem}>
          <AlbumCard album={item} onPress={handleAlbumPress} size={160} />
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay álbumes disponibles</Text>
        </View>
      }
    />
  );

  const renderArtists = () => (
    <FlatList
      data={artists}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.columnWrapper}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B22222" />
      }
      renderItem={({ item }) => (
        <View style={styles.gridItem}>
          <ArtistCard artist={item} onPress={handleArtistPress} size={160} />
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay artistas disponibles</Text>
        </View>
      }
    />
  );

  const renderSongs = () => (
    <FlatList
      data={songs}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.colors.primary} />
      }
      renderItem={({ item, index }) => (
        <SongItem
          song={item}
          onPress={handleSongPress}
          showArt={true}
          index={index}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay canciones disponibles</Text>
        </View>
      }
    />
  );

  const renderPlaylists = () => (
    <FlatList
      data={playlists}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.colors.primary} />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.playlistItem, { borderBottomColor: currentTheme.colors.surface, backgroundColor: 'transparent' }]}
          onPress={() => navigation?.navigate('PlaylistDetail', { playlistId: item.id, playlistName: item.name })}
        >
          {customPlaylistImages[item.id] ? (
            <Image source={{ uri: customPlaylistImages[item.id] }} style={styles.playlistIcon} />
          ) : (
            <View style={[styles.playlistIcon, { backgroundColor: currentTheme.colors.surface }]}>
              <Ionicons name="musical-notes" size={32} color={currentTheme.colors.textSecondary} />
            </View>
          )}
          <View style={styles.playlistInfo}>
            <Text style={[styles.playlistName, { color: currentTheme.colors.text }]}>{item.name}</Text>
            <Text style={[styles.playlistMeta, { color: currentTheme.colors.textSecondary }]}>
              {item.songCount} canciones • {Math.floor(item.duration / 60)} min
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={currentTheme.colors.textSecondary} />
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay playlists disponibles</Text>
        </View>
      }
    />
  );

  if (!isConfigured) {
    return (
      <View style={[styles.notConfiguredContainer, { backgroundColor: currentTheme.colors.background }]}>
        <Ionicons name="library" size={64} color={currentTheme.colors.textSecondary} />
        <Text style={[styles.notConfiguredText, { color: currentTheme.colors.textSecondary }]}>
          Configura tu servidor para ver tu biblioteca
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
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Tu Biblioteca</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {renderTabButton('albums', 'Álbumes', 'disc')}
          {renderTabButton('artists', 'Artistas', 'people')}
          {renderTabButton('songs', 'Canciones', 'musical-notes')}
          {renderTabButton('playlists', 'Playlists', 'list')}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'albums' && renderAlbums()}
        {activeTab === 'artists' && renderArtists()}
        {activeTab === 'songs' && renderSongs()}
        {activeTab === 'playlists' && renderPlaylists()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notConfiguredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notConfiguredText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    width: '48%',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  playlistIcon: {
    width: 60,
    height: 60,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 16,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playlistMeta: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default LibraryScreen;
