import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore, useThemeStore, useModalStore } from '../store';
import { AlbumArt, SongItem } from '../components';
import type { Song, Album } from '../types';
import { subsonicApi } from '../api/subsonic';

const { width: screenWidth } = Dimensions.get('window');

interface AlbumDetailScreenProps {
  navigation?: any;
  route?: { params?: { albumId: string; albumName: string } };
}

export const AlbumDetailScreen: React.FC<AlbumDetailScreenProps> = ({ navigation, route }) => {
  const albumId = route?.params?.albumId;
  const albumName = route?.params?.albumName;

  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const { playSong, addToQueue } = useMusicStore();
  const setPlaylistModalSongs = useModalStore(state => state.setPlaylistModalSongs);
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    loadAlbumDetails();
  }, [albumId]);

  const loadAlbumDetails = async () => {
    if (!albumId) return;

    setIsLoading(true);
    setError(null);
    try {
      const { album: albumData, songs: albumSongs } = await subsonicApi.getAlbum(albumId);
      setAlbum(albumData);
      setSongs(albumSongs);
    } catch (err) {
      console.error('Error loading album:', err);
      setError('Error al cargar el álbum.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  const handleShufflePlay = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    }
  };

  const handleSongPress = (song: Song) => {
    playSong(song, songs);
  };

  const handleAddToQueue = (song: Song) => {
    addToQueue(song);
  };

  const handleAddAlbumToQueue = () => {
    songs.forEach(song => addToQueue(song));
    setShowOptionsMenu(false);
  };

  const handleAddAlbumToPlaylist = () => {
    if (songs.length > 0) {
      setPlaylistModalSongs(songs);
    }
    setShowOptionsMenu(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins} min`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerComponent, { backgroundColor: currentTheme.colors.background }]}>
        <Text style={[styles.loadingText, { color: currentTheme.colors.textSecondary }]}>Cargando álbum...</Text>
      </View>
    );
  }

  if (error || !album) {
    return (
      <View style={[styles.container, styles.centerComponent, { backgroundColor: currentTheme.colors.background }]}>
        <Text style={[styles.errorText, { color: currentTheme.colors.text }]}>
          {error || 'No se pudo cargar el álbum'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={loadAlbumDetails}
        >
          <Text style={[styles.retryText, { color: currentTheme.colors.black }]}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={[styles.headerActions, { zIndex: 1 }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color={currentTheme.colors.text} />
        </TouchableOpacity>

        {/* Options Button */}
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => setShowOptionsMenu(!showOptionsMenu)}
        >
          <Ionicons name="ellipsis-vertical" size={28} color={currentTheme.colors.text} />
        </TouchableOpacity>

        {showOptionsMenu && (
          <View style={[styles.optionsMenu, { backgroundColor: currentTheme.colors.surface }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleAddAlbumToQueue}>
              <Ionicons name="list" size={20} color={currentTheme.colors.text} />
              <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>Añadir a la cola</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleAddAlbumToPlaylist}>
              <Ionicons name="add-circle-outline" size={20} color={currentTheme.colors.text} />
              <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>Añadir a playlist</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Album Art */}
        <View style={styles.artContainer}>
          <AlbumArt
            coverArtId={album?.coverArt}
            size={screenWidth - 80}
            borderRadius={8}
            iconSize={80}
          />
        </View>

        {/* Album Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.albumName, { color: currentTheme.colors.text }]} numberOfLines={2}>
            {album?.name || albumName}
          </Text>
          <TouchableOpacity
            onPress={() => album?.artistId && navigation?.navigate('ArtistDetail', {
              artistId: album.artistId,
              artistName: album.artist,
            })}
          >
            <Text style={[styles.artistName, { color: currentTheme.colors.primary }]}>{album?.artist}</Text>
          </TouchableOpacity>
          <Text style={[styles.metaInfo, { color: currentTheme.colors.textSecondary }]}>
            {album?.year ? `${album.year} • ` : ''}
            {album?.songCount || songs.length} canciones • {formatDuration(album?.duration || 0)}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handlePlayAll}
          >
            <Ionicons name="play" size={24} color={currentTheme.colors.black} />
            <Text style={[styles.playButtonText, { color: currentTheme.colors.black }]}>Reproducir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shuffleButton, { backgroundColor: currentTheme.colors.surface }]}
            onPress={handleShufflePlay}
          >
            <Ionicons name="shuffle" size={24} color={currentTheme.colors.text} />
            <Text style={[styles.shuffleButtonText, { color: currentTheme.colors.text }]}>Aleatorio</Text>
          </TouchableOpacity>
        </View>

        {/* Section Title */}
        <Text style={[styles.songsTitle, { color: currentTheme.colors.text }]}>Canciones</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <FlatList
        data={songs}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader()}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadAlbumDetails}
            tintColor={currentTheme.colors.primary}
          />
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: 60,
          offset: 60 * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <SongItem
            song={item}
            onPress={handleSongPress}
            showArt={false}
            index={index}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerComponent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerActions: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  optionsButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  optionsMenu: {
    position: 'absolute',
    top: 100,
    right: 16,
    zIndex: 20,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  artContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  infoContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  albumName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 18,
    marginBottom: 8,
  },
  metaInfo: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  shuffleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  shuffleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  songsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
});

export default AlbumDetailScreen;
