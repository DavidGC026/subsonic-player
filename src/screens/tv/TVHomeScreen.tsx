import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore, useThemeStore, useConfigStore, usePlayerStore } from '../../store';
import { AlbumCard, ArtistCard } from '../../components';
import { subsonicApi } from '../../api/subsonic';

// ── Standalone Components (Outside render to avoid focus loss) ──

const TVMenuButton = memo(({
    id,
    icon,
    label,
    onPress,
    isFocused,
    onFocus,
    colors,
    hasTVPreferredFocus
}: any) => {
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            style={[
                styles.menuButton,
                isFocused && { backgroundColor: colors.primary }
            ]}
            onFocus={() => onFocus(id)}
            onPress={onPress}
            hasTVPreferredFocus={hasTVPreferredFocus}
            activeOpacity={0.7}
        >
            <Ionicons name={icon} size={28} color={isFocused ? colors.black : colors.textSecondary} />
            <Text style={[
                styles.menuLabel,
                { color: isFocused ? colors.black : colors.textSecondary, fontWeight: isFocused ? 'bold' : 'normal' }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
});

const FocusableWrapper = memo(({ children, onPress, colors, scaleTo = 1.05 }: any) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                marginRight: 20,
                transform: [{ scale: isFocused ? scaleTo : 1 }],
                shadowColor: isFocused ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.8,
                shadowRadius: 20,
                elevation: isFocused ? 10 : 0,
                borderRadius: 12,
            }}
        >
            {/* Border effect for TV focus */}
            {isFocused && (
                <View style={{
                    ...StyleSheet.absoluteFillObject,
                    borderWidth: 4,
                    borderColor: colors.primary,
                    borderRadius: 16,
                    zIndex: 10,
                    margin: -4
                }} />
            )}
            {children}
        </TouchableOpacity>
    );
});

const FocusablePlaylistCard = memo(({ playlist, onPress, colors, customImage }: any) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.playlistCard,
                { backgroundColor: colors.surface },
                isFocused && {
                    backgroundColor: colors.primary + '20',
                    transform: [{ scale: 1.05 }],
                    borderColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.8,
                    shadowRadius: 20,
                    elevation: 10,
                }
            ]}
        >
            {isFocused && (
                <View style={{
                    ...StyleSheet.absoluteFillObject,
                    borderWidth: 4,
                    borderColor: colors.primary,
                    borderRadius: 16,
                    zIndex: 10,
                    margin: -4
                }} />
            )}
            <View style={styles.playlistIconContainer}>
                {customImage ? (
                    <Image source={{ uri: customImage }} style={styles.playlistCardImage} />
                ) : (
                    <Ionicons name="musical-notes" size={48} color={isFocused ? colors.primary : colors.textSecondary} />
                )}
            </View>
            <View style={styles.playlistCardInfo}>
                <Text
                    style={[styles.playlistCardName, { color: isFocused ? '#fff' : colors.text }]}
                    numberOfLines={1}
                >
                    {playlist.name}
                </Text>
                <Text
                    style={[styles.playlistCardMeta, { color: isFocused ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}
                >
                    {playlist.songCount} canciones
                </Text>
            </View>
        </TouchableOpacity>
    );
});

export const TVHomeScreen = ({ navigation }: any) => {
    const {
        albums,
        artists,
        playlists,
        customPlaylistImages,
        fetchAlbums,
        fetchArtists,
        fetchPlaylists
    } = useLibraryStore();
    const { isConfigured } = useConfigStore();
    const { currentTheme } = useThemeStore();
    const { player, playSong } = usePlayerStore();
    const colors = currentTheme.colors;

    useEffect(() => {
        if (isConfigured) {
            fetchAlbums();
            fetchArtists();
            fetchPlaylists();
        }
    }, [isConfigured]);

    const [focusedTab, setFocusedTab] = useState('home');

    const handleFocusTab = useCallback((id: string) => {
        setFocusedTab(id);
    }, []);

    const handlePlaylistPress = useCallback(async (playlist: any) => {
        try {
            const data = await subsonicApi.getPlaylist(playlist.id);
            if (data.songs && data.songs.length > 0) {
                playSong(data.songs[0], data.songs);
                navigation.navigate('TVPlayer');
            }
        } catch (error) {
            console.error('Error loading playlist:', error);
        }
    }, [playSong, navigation]);

    return (
        <View style={styles.container}>
            {/* Sidebar */}
            <View style={[styles.sidebar, { backgroundColor: colors.surface + '90' }]}>
                <View style={{ marginBottom: 60, alignItems: 'center' }}>
                    <Ionicons name="musical-notes" size={60} color={colors.primary} />
                </View>
                <TVMenuButton
                    id="home"
                    icon="home"
                    label="Inicio"
                    onPress={() => { }}
                    isFocused={focusedTab === 'home'}
                    onFocus={handleFocusTab}
                    colors={colors}
                    hasTVPreferredFocus={true}
                />
                <TVMenuButton
                    id="search"
                    icon="search"
                    label="Buscar"
                    onPress={() => navigation.navigate('TVSearch')}
                    isFocused={focusedTab === 'search'}
                    onFocus={handleFocusTab}
                    colors={colors}
                />
                <TVMenuButton
                    id="library"
                    icon="library"
                    label="Biblioteca"
                    onPress={() => navigation.navigate('TVLibrary')}
                    isFocused={focusedTab === 'library'}
                    onFocus={handleFocusTab}
                    colors={colors}
                />
                <TVMenuButton
                    id="settings"
                    icon="color-palette"
                    label="Temas"
                    onPress={() => navigation.navigate('TVSettings')}
                    isFocused={focusedTab === 'settings'}
                    onFocus={handleFocusTab}
                    colors={colors}
                />

                {/* Show Now Playing icon if there is an active song */}
                {player.currentSong && (
                    <View style={{ marginTop: 'auto', marginBottom: 20 }}>
                        <TVMenuButton
                            id="player"
                            icon="play-circle"
                            label="Reproduciendo"
                            onPress={() => navigation.navigate('TVPlayer')}
                            isFocused={focusedTab === 'player'}
                            onFocus={handleFocusTab}
                            colors={colors}
                        />
                    </View>
                )}
            </View>

            <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.greeting, { color: colors.text }]}>Buenos días</Text>

                {/* Playlists */}
                {playlists && playlists.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tus Playlists</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                            {playlists.slice(0, 10).map((playlist) => (
                                <FocusablePlaylistCard
                                    key={`pl-${playlist.id}`}
                                    playlist={playlist}
                                    onPress={() => handlePlaylistPress(playlist)}
                                    colors={colors}
                                    customImage={customPlaylistImages[playlist.id]}
                                />
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* Albums */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Agregados Recientemente</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                    {albums.slice(0, 15).map((album) => (
                        <FocusableWrapper
                            key={album.id}
                            colors={colors}
                            onPress={() => navigation.navigate('TVAlbumDetail', { albumId: album.id, albumName: album.name })}
                        >
                            <View pointerEvents="none">
                                <AlbumCard
                                    album={album}
                                    size={220}
                                    onPress={() => { }}
                                />
                            </View>
                        </FocusableWrapper>
                    ))}
                </ScrollView>

                {/* Artists */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Artistas Populares</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                    {artists.slice(0, 10).map((artist) => (
                        <FocusableWrapper
                            key={artist.id}
                            colors={colors}
                            onPress={() => navigation.navigate('TVArtistDetail', { artistId: artist.id, artistName: artist.name })}
                        >
                            <View pointerEvents="none">
                                <ArtistCard
                                    artist={artist}
                                    size={180}
                                    onPress={() => { }}
                                />
                            </View>
                        </FocusableWrapper>
                    ))}
                </ScrollView>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: 250,
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 15,
    },
    menuLabel: {
        fontSize: 20,
        marginLeft: 15,
    },
    mainContent: {
        flex: 1,
        padding: 50,
    },
    greeting: {
        fontSize: 54,
        fontWeight: 'bold',
        marginBottom: 50,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 25,
        marginTop: 20,
    },
    horizontalRow: {
        marginBottom: 50,
        paddingBottom: 25, // increase padding to prevent shadow clipping
        paddingTop: 10,
        paddingLeft: 4,
    },
    playlistCard: {
        width: 220,
        height: 220,
        borderRadius: 12,
        marginRight: 20,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    playlistIconContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    playlistCardImage: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    playlistCardInfo: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
    },
    playlistCardName: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    playlistCardMeta: {
        fontSize: 14,
        textAlign: 'center',
    }
});
