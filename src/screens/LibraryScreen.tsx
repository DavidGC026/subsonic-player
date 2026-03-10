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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useLibraryStore, useThemeStore, useConfigStore, useDownloadStore, useNetworkStore } from '../store';
import { AlbumCard, ArtistCard, SongItem } from '../components';
import type { Album, Artist, Song } from '../types';
import { useIsTablet } from '../hooks/useIsTablet';

type LibraryTab = 'albums' | 'artists' | 'songs' | 'playlists' | 'downloads';

interface LibraryScreenProps {
  navigation?: any;
  route?: { params?: { tab?: LibraryTab } };
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigation, route }) => {
  const { isOffline } = useNetworkStore();
  const [activeTab, setActiveTab] = useState<LibraryTab>(route?.params?.tab || (isOffline ? 'downloads' : 'albums'));
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
    customPlaylistImages,
  } = useLibraryStore();
  const { playSong } = usePlayerStore();

  const { downloadedSongs, removeDownload, removeAllDownloads, getTotalSize } = useDownloadStore();
  const { isConfigured } = useConfigStore();
  const [refreshing, setRefreshing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const { currentTheme } = useThemeStore();
  const { isTablet, screenWidth, getColumns, getSize } = useIsTablet();

  // Auto-switch to downloads tab when going offline
  useEffect(() => {
    if (isOffline && activeTab !== 'downloads') {
      setActiveTab('downloads');
    }
  }, [isOffline]);

  const numColumns = getColumns(2, 4);
  const cardSize = getSize(160, 180);

  useEffect(() => {
    if (isConfigured && !isOffline) {
      loadData();
    }
  }, [isConfigured, activeTab, isOffline]);

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
      case 'downloads':
        // Downloads are already in the store, no fetch needed
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
    if (isOffline) return;
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [activeTab, isOffline]);

  const handleAlbumPress = (album: Album) => {
    navigation?.navigate('AlbumDetail', { albumId: album.id, albumName: album.name });
  };

  const handleArtistPress = (artist: Artist) => {
    navigation?.navigate('ArtistDetail', { artistId: artist.id, artistName: artist.name });
  };

  const handleSongPress = (song: Song) => {
    playSong(song, songs);
  };

  const handleDownloadedSongPress = (song: Song) => {
    const downloadedList = Object.values(downloadedSongs).map((d) => d.song);
    playSong(song, downloadedList);
  };

  const handleRemoveDownload = (songId: string) => {
    const downloaded = downloadedSongs[songId];
    if (!downloaded) return;

    Alert.alert(
      'Eliminar descarga',
      `¿Eliminar "${downloaded.song.title}" de las descargas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => removeDownload(songId),
        },
      ]
    );
  };

  const handleRemoveAllDownloads = () => {
    Alert.alert(
      'Eliminar todas las descargas',
      '¿Estás seguro de que deseas eliminar todas las canciones descargadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar todo',
          style: 'destructive',
          onPress: () => removeAllDownloads(),
        },
      ]
    );
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
      key={`albums-${numColumns}`}
      data={albums}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      numColumns={numColumns}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.columnWrapper}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B22222" />
      }
      renderItem={({ item }) => (
        <View style={[styles.gridItem, { width: `${Math.floor(100 / numColumns) - 2}%` }]}>
          <AlbumCard album={item} onPress={handleAlbumPress} size={cardSize} />
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
      key={`artists-${numColumns}`}
      data={artists}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      numColumns={numColumns}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.columnWrapper}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B22222" />
      }
      renderItem={({ item }) => (
        <View style={[styles.gridItem, { width: `${Math.floor(100 / numColumns) - 2}%` }]}>
          <ArtistCard artist={item} onPress={handleArtistPress} size={cardSize} />
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
      keyExtractor={(item, index) => `${item.id}-${index}`}
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
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={5}
      getItemLayout={(data, index) => ({
        length: 66,
        offset: 66 * index,
        index,
      })}
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
      keyExtractor={(item, index) => `${item.id}-${index}`}
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

  const renderDownloads = () => {
    const downloadedList = Object.values(downloadedSongs);
    const totalSize = getTotalSize();

    return (
      <FlatList
        data={downloadedList}
        keyExtractor={(item, index) => `${item.song.id}-${index}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          downloadedList.length > 0 ? (
            <View style={dlStyles.downloadsHeader}>
              <View style={dlStyles.downloadsInfo}>
                <Ionicons name="folder-open" size={20} color={currentTheme.colors.textSecondary} />
                <Text style={[dlStyles.downloadsSizeText, { color: currentTheme.colors.textSecondary }]}>
                  {downloadedList.length} canciones • {formatFileSize(totalSize)}
                </Text>
              </View>
              <TouchableOpacity
                style={[dlStyles.removeAllButton, { borderColor: '#ff6b6b' }]}
                onPress={handleRemoveAllDownloads}
              >
                <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                <Text style={dlStyles.removeAllText}>Eliminar todo</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View style={dlStyles.downloadItem}>
            <TouchableOpacity
              style={dlStyles.downloadItemContent}
              onPress={() => handleDownloadedSongPress(item.song)}
              activeOpacity={0.7}
            >
              <View style={dlStyles.downloadItemInfo}>
                <Text style={[dlStyles.downloadItemTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
                  {item.song.title}
                </Text>
                <Text style={[dlStyles.downloadItemArtist, { color: currentTheme.colors.textSecondary }]} numberOfLines={1}>
                  {item.song.artist} • {item.song.album}
                </Text>
                <Text style={[dlStyles.downloadItemSize, { color: currentTheme.colors.textSecondary }]}>
                  {formatFileSize(item.fileSize)}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={dlStyles.downloadItemDelete}
              onPress={() => handleRemoveDownload(item.song.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={22} color={currentTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: 64, // Appx download item height
          offset: 64 * index,
          index,
        })}
        ListEmptyComponent={
          <View style={dlStyles.emptyDownloadsContainer}>
            <Ionicons name="download-outline" size={64} color={currentTheme.colors.textSecondary} />
            <Text style={[dlStyles.emptyDownloadsTitle, { color: currentTheme.colors.text }]}>
              No hay descargas
            </Text>
            <Text style={[dlStyles.emptyDownloadsSubtitle, { color: currentTheme.colors.textSecondary }]}>
              Descarga canciones para escucharlas sin conexión
            </Text>
          </View>
        }
      />
    );
  };

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

  const renderOfflineMessage = () => (
    <View style={offlineStyles.offlineContainer}>
      <Ionicons name="cloud-offline-outline" size={48} color={currentTheme.colors.textSecondary} />
      <Text style={[offlineStyles.offlineTitle, { color: currentTheme.colors.text }]}>Sin conexión a internet</Text>
      <Text style={[offlineStyles.offlineSubtitle, { color: currentTheme.colors.textSecondary }]}>Ve a la pestaña de Descargas para reproducir música descargada</Text>
      <TouchableOpacity
        style={[offlineStyles.goToDownloadsBtn, { backgroundColor: currentTheme.colors.primary }]}
        onPress={() => setActiveTab('downloads')}
      >
        <Ionicons name="download" size={18} color={currentTheme.colors.black} />
        <Text style={[offlineStyles.goToDownloadsBtnText, { color: currentTheme.colors.black }]}>Ir a Descargas</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Tu Biblioteca</Text>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={offlineStyles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={offlineStyles.offlineBannerText}>Sin conexión a internet</Text>
        </View>
      )}

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
          {renderTabButton('downloads', 'Descargas', 'download')}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'albums' && (isOffline ? renderOfflineMessage() : renderAlbums())}
        {activeTab === 'artists' && (isOffline ? renderOfflineMessage() : renderArtists())}
        {activeTab === 'songs' && (isOffline ? renderOfflineMessage() : renderSongs())}
        {activeTab === 'playlists' && (isOffline ? renderOfflineMessage() : renderPlaylists())}
        {activeTab === 'downloads' && renderDownloads()}
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

const dlStyles = StyleSheet.create({
  downloadsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  downloadsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadsSizeText: {
    fontSize: 14,
  },
  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  removeAllText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  downloadItemContent: {
    flex: 1,
  },
  downloadItemInfo: {
    flex: 1,
  },
  downloadItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  downloadItemArtist: {
    fontSize: 14,
    marginTop: 2,
  },
  downloadItemSize: {
    fontSize: 12,
    marginTop: 2,
  },
  downloadItemDelete: {
    padding: 8,
    marginLeft: 8,
  },
  emptyDownloadsContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyDownloadsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyDownloadsSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

const offlineStyles = StyleSheet.create({
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    gap: 8,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  offlineSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  goToDownloadsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
  },
  goToDownloadsBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LibraryScreen;
