import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useLibraryStore, useConfigStore, useThemeStore, useNetworkStore } from '../store';
import { AlbumCard, ArtistCard, SongItem } from '../components';
import type { Album, Artist, Song } from '../types';

interface SearchScreenProps {
  navigation?: any;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    artists: Artist[];
    albums: Album[];
    songs: Song[];
  }>({ artists: [], albums: [], songs: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { search } = useLibraryStore();
  const { playSong } = usePlayerStore();
  const { isConfigured } = useConfigStore();
  const { currentTheme } = useThemeStore();
  const { isOffline } = useNetworkStore();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    Keyboard.dismiss();
    setIsSearching(true);
    setHasSearched(true);

    try {
      const results = await search(query.trim());
      setSearchResults({
        artists: results.artist || [],
        albums: results.album || [],
        songs: results.song || [],
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [query, search]);

  const handleClear = () => {
    setQuery('');
    setSearchResults({ artists: [], albums: [], songs: [] });
    setHasSearched(false);
  };

  const handleAlbumPress = (album: Album) => {
    navigation?.navigate('AlbumDetail', { albumId: album.id, albumName: album.name });
  };

  const handleArtistPress = (artist: Artist) => {
    navigation?.navigate('ArtistDetail', { artistId: artist.id, artistName: artist.name });
  };

  const handleSongPress = (song: Song) => {
    playSong(song, searchResults.songs);
  };

  const renderResults = () => {
    if (!hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={64} color={currentTheme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Busca tu música</Text>
          <Text style={[styles.emptyText, { color: currentTheme.colors.textSecondary }]}>
            Encuentra artistas, álbumes y canciones en tu biblioteca
          </Text>
        </View>
      );
    }

    if (isSearching) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: currentTheme.colors.textSecondary }]}>Buscando...</Text>
        </View>
      );
    }

    const { artists, albums, songs } = searchResults;
    const hasResults = artists.length > 0 || albums.length > 0 || songs.length > 0;

    if (!hasResults) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="sad-outline" size={64} color={currentTheme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No se encontraron resultados</Text>
          <Text style={[styles.emptyText, { color: currentTheme.colors.textSecondary }]}>
            Intenta con otra búsqueda
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={[
          { type: 'header', title: 'Canciones', count: songs.length },
          ...songs.map((s) => ({ type: 'song', data: s })),
          { type: 'header', title: 'Álbumes', count: albums.length },
          ...albums.map((a) => ({ type: 'album', data: a })),
          { type: 'header', title: 'Artistas', count: artists.length },
          ...artists.map((a) => ({ type: 'artist', data: a })),
        ]}
        keyExtractor={(item: any, index) => `${item.type}-${index}`}
        contentContainerStyle={styles.resultsContent}
        renderItem={({ item }: { item: any }) => {
          if (item.type === 'header') {
            if (item.count === 0) return null;
            return (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.sectionCount, { color: currentTheme.colors.textSecondary }]}>({item.count})</Text>
              </View>
            );
          }

          if (item.type === 'song') {
            return (
              <SongItem
                song={item.data}
                onPress={handleSongPress}
                showArt={true}
              />
            );
          }

          if (item.type === 'album') {
            return (
              <View style={styles.horizontalItem}>
                <AlbumCard
                  album={item.data}
                  onPress={handleAlbumPress}
                  size={120}
                />
              </View>
            );
          }

          if (item.type === 'artist') {
            return (
              <View style={styles.horizontalItem}>
                <ArtistCard
                  artist={item.data}
                  onPress={handleArtistPress}
                  size={120}
                />
              </View>
            );
          }

          return null;
        }}
      />
    );
  };

  if (!isConfigured) {
    return (
      <View style={[styles.notConfiguredContainer, { backgroundColor: currentTheme.colors.background }]}>
        <Ionicons name="search" size={64} color={currentTheme.colors.textSecondary} />
        <Text style={[styles.notConfiguredText, { color: currentTheme.colors.textSecondary }]}>
          Configura tu servidor para buscar música
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
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Buscar</Text>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>Sin conexión a internet — la búsqueda no está disponible</Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: currentTheme.colors.surface }, isOffline && { opacity: 0.5 }]}>
          <Ionicons name="search" size={20} color={currentTheme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: currentTheme.colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="¿Qué quieres escuchar?"
            placeholderTextColor={currentTheme.colors.textSecondary}
            returnKeyType="search"
            onSubmitEditing={isOffline ? undefined : handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isOffline}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Ionicons name="close-circle" size={20} color={currentTheme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.searchButton,
            { backgroundColor: currentTheme.colors.primary },
            (!query.trim() || isSearching || isOffline) && { opacity: 0.5 }
          ]}
          onPress={handleSearch}
          disabled={!query.trim() || isSearching || isOffline}
        >
          <Text style={[styles.searchButtonText, { color: currentTheme.colors.black }]}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {isOffline && !hasSearched ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color={currentTheme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Sin conexión</Text>
            <Text style={[styles.emptyText, { color: currentTheme.colors.textSecondary }]}>
              Necesitas conexión a internet para buscar. Tus canciones descargadas están disponibles en la Biblioteca.
            </Text>
          </View>
        ) : (
          renderResults()
        )}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionCount: {
    fontSize: 14,
    marginLeft: 8,
  },
  horizontalItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    gap: 8,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});

export default SearchScreen;
