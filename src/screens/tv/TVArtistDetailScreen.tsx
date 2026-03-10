import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useThemeStore } from '../../store';
import { AlbumArt, AlbumCard } from '../../components';
import type { Album, Artist, Song } from '../../types';
import { subsonicApi } from '../../api/subsonic';

export const TVArtistDetailScreen = ({ navigation, route }: any) => {
    const artistId = route?.params?.artistId;
    const artistName = route?.params?.artistName;

    const [artist, setArtist] = useState<Artist | null>(null);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { playSong } = usePlayerStore();
    const { currentTheme } = useThemeStore();
    const colors = currentTheme.colors;

    const [focusedItem, setFocusedItem] = useState<string>('play');

    useEffect(() => {
        loadArtistDetails();
    }, [artistId]);

    const loadArtistDetails = async () => {
        if (!artistId) return;
        setIsLoading(true);
        try {
            const { artist: artistData, albums: artistAlbums } = await subsonicApi.getArtist(artistId);

            let allAlbums = [...artistAlbums];

            if (artistName) {
                try {
                    const searchResults = await subsonicApi.search(artistName);
                    if (searchResults.album) {
                        const existingIds = new Set(allAlbums.map(a => a.id));
                        for (const album of searchResults.album) {
                            if (!existingIds.has(album.id) && album.artist?.toLowerCase().includes(artistName.toLowerCase())) {
                                allAlbums.push(album);
                                existingIds.add(album.id);
                            }
                        }
                    }
                } catch (searchError) {
                    console.log('Search for additional albums failed:', searchError);
                }
            }

            setArtist(artistName ? { ...artistData, name: artistName } : artistData);
            setAlbums(allAlbums);
        } catch (error) {
            console.error('Error loading artist:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlayAll = async () => {
        const allSongs: Song[] = [];
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
            navigation.navigate('TVPlayer');
        }
    };

    const handleShufflePlay = async () => {
        const allSongs: Song[] = [];
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
            navigation.navigate('TVPlayer');
        }
    };

    const handleAlbumPress = (album: Album) => {
        navigation.navigate('TVAlbumDetail', { albumId: album.id, albumName: album.name });
    };

    const FocusableWrapper = ({ children, onPress, id }: any) => {
        const [isFocused, setIsFocused] = useState(false);
        return (
            <TouchableOpacity
                onFocus={() => { setIsFocused(true); setFocusedItem(id); }}
                onBlur={() => setIsFocused(false)}
                onPress={onPress}
                style={{
                    marginRight: 20,
                    marginBottom: 20,
                    transform: [{ scale: isFocused ? 1.05 : 1 }],
                    shadowColor: isFocused ? colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.8,
                    shadowRadius: 20,
                    elevation: isFocused ? 10 : 0,
                    borderRadius: 12,
                }}
            >
                {isFocused && (
                    <View style={{
                        ...StyleSheet.absoluteFillObject,
                        borderWidth: 4,
                        borderColor: colors.primary,
                        borderRadius: 16,
                        zIndex: 10,
                        margin: -4,
                    }} />
                )}
                {children}
            </TouchableOpacity>
        );
    };

    const FocusableButton = ({ id, children, onPress, style }: any) => {
        const isFocused = focusedItem === id;
        return (
            <TouchableOpacity
                onFocus={() => setFocusedItem(id)}
                onPress={onPress}
                style={[
                    style,
                    isFocused && {
                        transform: [{ scale: 1.05 }],
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 15,
                        elevation: 10,
                    }
                ]}
                hasTVPreferredFocus={id === 'play'}
            >
                {children}
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando artista...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Back button */}
            <FocusableButton
                id="back"
                onPress={() => navigation.goBack()}
                style={styles.backButton}
            >
                <Ionicons name="arrow-back" size={32} color={colors.text} />
            </FocusableButton>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Artist Header */}
                <View style={styles.header}>
                    <View style={styles.artWrapper}>
                        <AlbumArt
                            coverArtId={artist?.coverArt}
                            size={220}
                            borderRadius={110}
                            iconSize={80}
                        />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.artistName, { color: colors.text }]} numberOfLines={2}>
                            {artist?.name || artistName}
                        </Text>
                        <Text style={[styles.artistMeta, { color: colors.textSecondary }]}>
                            {albums.length} álbumes
                        </Text>

                        {/* Action Buttons */}
                        <View style={styles.actionRow}>
                            <FocusableButton
                                id="play"
                                onPress={handlePlayAll}
                                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                            >
                                <Ionicons name="play" size={24} color={colors.black} />
                                <Text style={[styles.actionButtonText, { color: colors.black }]}>Reproducir</Text>
                            </FocusableButton>
                            <FocusableButton
                                id="shuffle"
                                onPress={handleShufflePlay}
                                style={[styles.actionButton, { backgroundColor: colors.surface }]}
                            >
                                <Ionicons name="shuffle" size={24} color={colors.text} />
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>Aleatorio</Text>
                            </FocusableButton>
                        </View>
                    </View>
                </View>

                {/* Albums Grid */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Álbumes</Text>
                <View style={styles.albumsGrid}>
                    {albums.map((album) => (
                        <FocusableWrapper key={album.id} id={`album-${album.id}`} onPress={() => handleAlbumPress(album)}>
                            <View pointerEvents="none">
                                <AlbumCard album={album} size={220} onPress={() => { }} />
                            </View>
                        </FocusableWrapper>
                    ))}
                </View>

                <View style={{ height: 80 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 20,
        marginTop: 16,
    },
    backButton: {
        position: 'absolute',
        top: 30,
        left: 30,
        zIndex: 10,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        flex: 1,
        paddingTop: 40,
        paddingHorizontal: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 50,
        marginTop: 40,
    },
    artWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.6,
        shadowRadius: 25,
        elevation: 15,
        marginRight: 40,
    },
    headerInfo: {
        flex: 1,
    },
    artistName: {
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    artistMeta: {
        fontSize: 20,
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 18,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 25,
    },
    albumsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});

export default TVArtistDetailScreen;
