import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore, useThemeStore, useModalStore } from '../store';
import { AlbumArt, AlbumCard } from '../components';
import type { Album, Artist, Song } from '../types';
import { subsonicApi } from '../api/subsonic';

const { width: screenWidth } = Dimensions.get('window');

interface ArtistDetailScreenProps {
  navigation?: any;
  route?: { params?: { artistId: string; artistName: string } };
}

export const ArtistDetailScreen: React.FC<ArtistDetailScreenProps> = ({ navigation, route }) => {
  const artistId = route?.params?.artistId;
  const artistName = route?.params?.artistName;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isLoadingAllSongs, setIsLoadingAllSongs] = useState(false);

  const { playSong, addToQueue } = useMusicStore();
  const setPlaylistModalSongs = useModalStore(state => state.setPlaylistModalSongs);
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    loadArtistDetails();
  }, [artistId]);

  const loadArtistDetails = async () => {
    if (!artistId) return;

    setIsLoading(true);
    try {
      const { artist: artistData, albums: artistAlbums } = await subsonicApi.getArtist(artistId);
      setArtist(artistData);
      setAlbums(artistAlbums);
    } catch (error) {
      console.error('Error loading artist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = async () => {
    const allSongs: any[] = [];
    for (const album of albums) {
      try {
        const { songs } = await subsonicApi.getAlbum(album.id);
        allSongs.push(...songs);
      } catch (error) {
        console.error('Error loading album songs:', error);
      }
    }

    if (allSongs.length > 0) {
      playSong(allSongs[0], allSongs);
    }
  };

  const handleShufflePlay = async () => {
    const allSongs: any[] = [];
    for (const album of albums) {
      try {
        const { songs } = await subsonicApi.getAlbum(album.id);
        allSongs.push(...songs);
      } catch (error) {
        console.error('Error loading album songs:', error);
      }
    }

    if (allSongs.length > 0) {
      const shuffled = [...allSongs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    }
  };

  const handleAlbumPress = (album: Album) => {
    navigation?.navigate('AlbumDetail', { albumId: album.id, albumName: album.name });
  };

  // Gather all songs from all albums of this artist
  const getAllArtistSongs = async (): Promise<Song[]> => {
    const allSongs: Song[] = [];
    for (const album of albums) {
      try {
        const { songs } = await subsonicApi.getAlbum(album.id);
        allSongs.push(...songs);
      } catch (error) {
        console.error('Error loading album songs:', error);
      }
    }
    return allSongs;
  };

  const handleAddArtistToQueue = async () => {
    setShowOptionsMenu(false);
    setIsLoadingAllSongs(true);
    const allSongs = await getAllArtistSongs();
    allSongs.forEach(song => addToQueue(song));
    setIsLoadingAllSongs(false);
  };

  const handleAddArtistToPlaylist = async () => {
    setShowOptionsMenu(false);
    setIsLoadingAllSongs(true);
    const allSongs = await getAllArtistSongs();
    setIsLoadingAllSongs(false);
    if (allSongs.length > 0) {
      setPlaylistModalSongs(allSongs);
    } else {
      Alert.alert('Sin canciones', 'No se encontraron canciones de este artista.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.colors.background }]}>
        <Text style={[styles.loadingText, { color: currentTheme.colors.textSecondary }]}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <FlatList
        data={albums}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <View style={styles.header}>
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
                <TouchableOpacity style={styles.menuItem} onPress={handleAddArtistToQueue}>
                  <Ionicons name="list" size={20} color={currentTheme.colors.text} />
                  <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>Añadir a la cola</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleAddArtistToPlaylist}>
                  <Ionicons name="add-circle-outline" size={20} color={currentTheme.colors.text} />
                  <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>Añadir a playlist</Text>
                </TouchableOpacity>
              </View>
            )}

            {isLoadingAllSongs && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color={currentTheme.colors.primary} />
              </View>
            )}

            {/* Artist Art */}
            <View style={styles.artContainer}>
              <AlbumArt
                coverArtId={artist?.coverArt}
                size={200}
                borderRadius={100}
                iconSize={80}
              />
            </View>

            {/* Artist Info */}
            <View style={styles.infoContainer}>
              <Text style={[styles.artistName, { color: currentTheme.colors.text }]} numberOfLines={2}>
                {artist?.name || artistName}
              </Text>
              <Text style={[styles.metaInfo, { color: currentTheme.colors.textSecondary }]}>
                {albums.length} álbumes • {artist?.albumCount || albums.length} en total
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
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Álbumes</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.albumItem}>
            <AlbumCard album={item} onPress={handleAlbumPress} size={160} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.colors.textSecondary }]}>No hay álbumes disponibles</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    right: 56,
    zIndex: 10,
    padding: 8,
  },
  artContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  infoContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  artistName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
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
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  albumItem: {
    width: '48%',
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

export default ArtistDetailScreen;
