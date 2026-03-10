import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  useWindowDimensions,
} from 'react-native';

import { useIsTablet } from '../hooks/useIsTablet';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useLibraryStore, useConfigStore, useThemeStore, useDownloadStore, useNetworkStore } from '../store';
import { AlbumCard, ArtistCard, AlarmModal, SongItem } from '../components';
import type { Album, Artist, Playlist, Song } from '../types';
import { subsonicApi } from '../api/subsonic';

interface HomeScreenProps {
  navigation?: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const {
    albums,
    artists,
    playlists,
    isLoadingAlbums,
    isLoadingArtists,
    fetchAlbums,
    fetchArtists,
    fetchPlaylists,
    customPlaylistImages,
  } = useLibraryStore();
  const { playSong } = usePlayerStore();

  const { isConfigured } = useConfigStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [frequentAlbums, setFrequentAlbums] = useState<Album[]>([]);
  const { currentTheme } = useThemeStore();
  const { isTablet, screenWidth, getSize, getColumns } = useIsTablet();

  const [showAlarm, setShowAlarm] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  const { isOffline } = useNetworkStore();
  const { downloadedSongs, downloadedPlaylists } = useDownloadStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const greeting = useMemo(() => {
    if (currentHour >= 5 && currentHour < 12) return 'Buenos días';
    if (currentHour >= 12 && currentHour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, [currentHour]);

  const gridCols = getColumns(3, 5);
  const gridItemWidth = (screenWidth - 32 - (12 * gridCols)) / gridCols;
  const albumCardSize = getSize(150, 200);
  const artistCardSize = getSize(130, 160);
  const playlistCardWidth = getSize(140, 180);

  // Derived offline data
  const offlineSongs = useMemo(() => {
    return Object.values(downloadedSongs).map(d => d.song);
  }, [downloadedSongs]);

  const offlinePlaylistsWithSongs = useMemo(() => {
    if (!downloadedPlaylists) return [];

    return Object.values(downloadedPlaylists)
      .map(dp => {
        // Filter songs in this playlist to only those that are downloaded
        const availableSongs = dp.songs.filter(s => !!downloadedSongs[s.id]);
        return {
          playlist: dp.playlist,
          songs: availableSongs,
          downloadedAt: dp.downloadedAt,
        };
      })
      .filter(dp => dp.songs.length > 0); // Only show playlists that have at least 1 downloaded song
  }, [downloadedPlaylists, downloadedSongs]);

  useEffect(() => {
    if (isConfigured && !isOffline) {
      loadData();
    }
  }, [isConfigured, isOffline]);

  const loadData = async () => {
    await Promise.all([
      fetchAlbums(),
      fetchArtists(),
      fetchPlaylists(),
      loadFrequentAlbums(),
    ]);
  };

  const loadFrequentAlbums = async () => {
    try {
      const frequent = await subsonicApi.getAlbums('frequent', 10);
      setFrequentAlbums(frequent);
    } catch (error) {
      console.error('Error loading frequent albums:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    if (isOffline) return;
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [isOffline]);

  const handleAlbumPress = (album: Album) => {
    navigation?.navigate('AlbumDetail', { albumId: album.id, albumName: album.name });
  };

  const handleArtistPress = (artist: Artist) => {
    navigation?.navigate('ArtistDetail', { artistId: artist.id, artistName: artist.name });
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    navigation?.navigate('PlaylistDetail', { playlistId: playlist.id, playlistName: playlist.name });
  };

  const handleQuickPlay = async () => {
    if (isOffline) {
      // Play from downloaded songs
      if (offlineSongs.length > 0) {
        const shuffled = [...offlineSongs].sort(() => Math.random() - 0.5);
        playSong(shuffled[0], shuffled);
      }
      return;
    }
    const { subsonicApi } = await import('../api/subsonic');
    const songs = await subsonicApi.getRandomSongs(20);
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  const handleOfflineSongPress = (song: Song) => {
    playSong(song, offlineSongs);
  };

  const handleOfflinePlaylistPress = (playlistData: { playlist: Playlist; songs: Song[] }) => {
    // Navigate to playlist detail — the PlaylistDetailScreen will also handle offline mode
    navigation?.navigate('PlaylistDetail', { playlistId: playlistData.playlist.id, playlistName: playlistData.playlist.name });
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

  // ---- OFFLINE MODE ----
  if (isOffline) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: currentTheme.colors.text }]}>{greeting}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowAlarm(true)}
            >
              <Ionicons name="alarm-outline" size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
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

        {/* Offline Banner */}
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
          <Text style={styles.offlineBannerText}>Sin conexión a internet</Text>
        </View>

        {/* Quick Actions — only shuffle available offline */}
        {offlineSongs.length > 0 && (
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
                onPress={() => navigation?.navigate('Library', { tab: 'downloads' })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: currentTheme.colors.background }]}>
                  <Ionicons name="download" size={24} color={currentTheme.colors.text} />
                </View>
                <Text style={[styles.quickActionText, { color: currentTheme.colors.text }]}>Descargas</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Downloaded Playlists */}
        {offlinePlaylistsWithSongs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Playlists Disponibles</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {offlinePlaylistsWithSongs.map((dp, index) => (
                <TouchableOpacity
                  key={`offline-pl-${dp.playlist.id}-${index}`}
                  style={[styles.playlistCard, { backgroundColor: currentTheme.colors.surface }]}
                  onPress={() => handleOfflinePlaylistPress(dp)}
                  activeOpacity={0.7}
                >
                  {customPlaylistImages[dp.playlist.id] ? (
                    <Image
                      source={{ uri: customPlaylistImages[dp.playlist.id] }}
                      style={styles.playlistCardImage}
                    />
                  ) : (
                    <View style={[styles.playlistCardIcon, { backgroundColor: currentTheme.colors.background }]}>
                      <Ionicons name="musical-notes" size={28} color={currentTheme.colors.textSecondary} />
                    </View>
                  )}
                  <Text style={[styles.playlistCardName, { color: currentTheme.colors.text }]} numberOfLines={1}>
                    {dp.playlist.name}
                  </Text>
                  <Text style={[styles.playlistCardMeta, { color: currentTheme.colors.textSecondary }]}>
                    {dp.songs.length} canciones
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Downloaded Songs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Canciones Descargadas</Text>
            <Text style={[styles.seeAll, { color: currentTheme.colors.textSecondary }]}>
              {offlineSongs.length} canciones
            </Text>
          </View>

          {offlineSongs.length > 0 ? (
            offlineSongs.slice(0, 30).map((song, index) => (
              <SongItem
                key={`offline-song-${song.id}-${index}`}
                song={song}
                onPress={handleOfflineSongPress}
                showArt={true}
                index={index}
              />
            ))
          ) : (
            <View style={styles.offlineEmpty}>
              <Ionicons name="download-outline" size={48} color={currentTheme.colors.textSecondary} />
              <Text style={[styles.offlineEmptyTitle, { color: currentTheme.colors.text }]}>
                No hay canciones descargadas
              </Text>
              <Text style={[styles.offlineEmptySubtitle, { color: currentTheme.colors.textSecondary }]}>
                Descarga canciones cuando tengas conexión para escucharlas sin internet
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />

        {isConfigured && <AlarmModal visible={showAlarm} onClose={() => setShowAlarm(false)} />}
      </ScrollView>
    );
  }

  // ---- ONLINE MODE (original) ----
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: currentTheme.colors.text }]}>{greeting}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowAlarm(true)}
          >
            <Ionicons name="alarm-outline" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
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

      {/* Playlists - First section */}
      {
        playlists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Tus Playlists</Text>
              <TouchableOpacity onPress={() => navigation?.navigate('Library', { tab: 'playlists' })}>
                <Text style={[styles.seeAll, { color: currentTheme.colors.textSecondary }]}>Ver todo</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {playlists.slice(0, 8).map((playlist, index) => (
                <TouchableOpacity
                  key={`pl-${playlist.id}-${index}`}
                  style={[styles.playlistCard, { backgroundColor: currentTheme.colors.surface }]}
                  onPress={() => handlePlaylistPress(playlist)}
                  activeOpacity={0.7}
                >
                  {customPlaylistImages[playlist.id] ? (
                    <Image
                      source={{ uri: customPlaylistImages[playlist.id] }}
                      style={styles.playlistCardImage}
                    />
                  ) : (
                    <View style={[styles.playlistCardIcon, { backgroundColor: currentTheme.colors.background }]}>
                      <Ionicons name="musical-notes" size={28} color={currentTheme.colors.textSecondary} />
                    </View>
                  )}
                  <Text style={[styles.playlistCardName, { color: currentTheme.colors.text }]} numberOfLines={1}>
                    {playlist.name}
                  </Text>
                  <Text style={[styles.playlistCardMeta, { color: currentTheme.colors.textSecondary }]}>
                    {playlist.songCount} canciones
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )
      }

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
                size={albumCardSize}
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
                size={artistCardSize}
              />
            ))
          ) : (
            <Text style={[styles.emptyListText, { color: currentTheme.colors.textSecondary }]}>No hay artistas disponibles</Text>
          )}
        </ScrollView>
      </View>

      {/* Most Played Albums */}
      {
        frequentAlbums.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Más Reproducidos</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {frequentAlbums.map((album, index) => (
                <AlbumCard
                  key={`freq-${album.id}-${index}`}
                  album={album}
                  onPress={handleAlbumPress}
                  size={albumCardSize}
                />
              ))}
            </ScrollView>
          </View>
        )
      }

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

      {isConfigured && <AlarmModal visible={showAlarm} onClose={() => setShowAlarm(false)} />}
    </ScrollView >
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
  playlistCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  playlistCardImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  playlistCardIcon: {
    width: 140,
    height: 140,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistCardName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  playlistCardMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  // Offline styles
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    gap: 8,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineEmpty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  offlineEmptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  offlineEmptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;
