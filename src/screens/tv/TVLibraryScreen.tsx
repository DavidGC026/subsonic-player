import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore, useThemeStore, useConfigStore, usePlayerStore } from '../../store';
import { AlbumCard, ArtistCard } from '../../components';
import { subsonicApi } from '../../api/subsonic';

type LibraryTab = 'albums' | 'artists' | 'playlists';

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

const FocusableWrapper = memo(({ children, onPress, colors, id, isFocused, onFocus }: any) => {
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            onFocus={() => onFocus(id)}
            onPress={onPress}
            activeOpacity={0.7}
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
});

const TVTabButton = memo(({ tab, label, isActive, isFocused, onPress, onFocus, colors, hasTVPreferredFocus }: any) => {
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            style={[
                styles.tabButton,
                isActive && { backgroundColor: colors.primary },
                isFocused && !isActive && { backgroundColor: colors.surface, transform: [{ scale: 1.05 }] },
                isFocused && isActive && {
                    transform: [{ scale: 1.05 }],
                    borderWidth: 2,
                    borderColor: '#fff',
                }
            ]}
            onFocus={() => onFocus(`tab-${tab}`)}
            onPress={() => onPress(tab)}
            hasTVPreferredFocus={hasTVPreferredFocus}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.tabButtonText,
                { color: isActive ? colors.black : (isFocused ? colors.primary : colors.text) }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
});

const TVPlaylistListItem = memo(({
    playlist,
    customImage,
    isFocused,
    onFocus,
    onPress,
    colors
}: any) => {
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            style={[
                styles.playlistItem,
                { borderBottomColor: colors.surface + '40' },
                isFocused && {
                    backgroundColor: colors.primary + '20',
                    borderRadius: 12,
                    transform: [{ scale: 1.02 }],
                    borderWidth: 2,
                    borderColor: colors.primary,
                    marginVertical: 4,
                }
            ]}
            onFocus={() => onFocus(`playlist-${playlist.id}`)}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {customImage ? (
                <Image source={{ uri: customImage }} style={styles.playlistIcon} />
            ) : (
                <View style={[styles.playlistIcon, { backgroundColor: colors.surface }]}>
                    <Ionicons name="musical-notes" size={32} color={isFocused ? colors.primary : colors.textSecondary} />
                </View>
            )}
            <View style={styles.playlistInfo}>
                <Text style={[styles.playlistName, { color: isFocused ? colors.primary : colors.text }]}>
                    {playlist.name}
                </Text>
                <Text style={[styles.playlistMeta, { color: colors.textSecondary }]}>
                    {playlist.songCount} canciones • {Math.floor(playlist.duration / 60)} min
                </Text>
            </View>
            {isFocused && (
                <Ionicons name="play" size={24} color={colors.primary} style={{ marginRight: 10 }} />
            )}
        </TouchableOpacity>
    );
});

export const TVLibraryScreen = ({ navigation }: any) => {
    const {
        albums, artists, playlists,
        fetchAlbums, fetchArtists, fetchPlaylists,
        customPlaylistImages,
    } = useLibraryStore();
    const { isConfigured } = useConfigStore();
    const { currentTheme } = useThemeStore();
    const { playSong, player } = usePlayerStore();
    const colors = currentTheme.colors;

    const [activeTab, setActiveTab] = useState<LibraryTab>('albums');
    const [focusedItem, setFocusedItem] = useState<string>('tab-albums');

    const handleFocusItem = useCallback((id: string) => {
        setFocusedItem(id);
    }, []);

    const handleChangeTab = useCallback((tab: LibraryTab) => {
        setActiveTab(tab);
    }, []);

    useEffect(() => {
        if (isConfigured) {
            fetchAlbums();
            fetchArtists();
            fetchPlaylists();
        }
    }, [isConfigured]);

    const handleAlbumPress = useCallback((album: any) => {
        navigation.navigate('TVAlbumDetail', { albumId: album.id, albumName: album.name });
    }, [navigation]);

    const handleArtistPress = useCallback((artist: any) => {
        navigation.navigate('TVArtistDetail', { artistId: artist.id, artistName: artist.name });
    }, [navigation]);

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
                    onPress={() => navigation.navigate('TVHome')}
                    isFocused={focusedItem === 'home'}
                    onFocus={handleFocusItem}
                    colors={colors}
                />
                <TVMenuButton
                    id="search"
                    icon="search"
                    label="Buscar"
                    onPress={() => navigation.navigate('TVSearch')}
                    isFocused={focusedItem === 'search'}
                    onFocus={handleFocusItem}
                    colors={colors}
                />
                <TVMenuButton
                    id="library"
                    icon="library"
                    label="Biblioteca"
                    onPress={() => { }}
                    isFocused={focusedItem === 'library'}
                    onFocus={handleFocusItem}
                    colors={colors}
                />
                <TVMenuButton
                    id="settings"
                    icon="color-palette"
                    label="Temas"
                    onPress={() => navigation.navigate('TVSettings')}
                    isFocused={focusedItem === 'settings'}
                    onFocus={handleFocusItem}
                    colors={colors}
                />

                {player.currentSong && (
                    <View style={{ marginTop: 'auto', marginBottom: 20 }}>
                        <TVMenuButton
                            id="player"
                            icon="play-circle"
                            label="Reproduciendo"
                            onPress={() => navigation.navigate('TVPlayer')}
                            isFocused={focusedItem === 'player'}
                            onFocus={handleFocusItem}
                            colors={colors}
                        />
                    </View>
                )}
            </View>

            <View style={styles.mainContent}>
                <Text style={[styles.title, { color: colors.text }]}>Tu Biblioteca</Text>

                {/* Tabs */}
                <View style={styles.tabsRow}>
                    <TVTabButton
                        tab="albums"
                        label="Álbumes"
                        isActive={activeTab === 'albums'}
                        isFocused={focusedItem === 'tab-albums'}
                        onPress={handleChangeTab}
                        onFocus={handleFocusItem}
                        colors={colors}
                        hasTVPreferredFocus={true}
                    />
                    <TVTabButton
                        tab="artists"
                        label="Artistas"
                        isActive={activeTab === 'artists'}
                        isFocused={focusedItem === 'tab-artists'}
                        onPress={handleChangeTab}
                        onFocus={handleFocusItem}
                        colors={colors}
                    />
                    <TVTabButton
                        tab="playlists"
                        label="Playlists"
                        isActive={activeTab === 'playlists'}
                        isFocused={focusedItem === 'tab-playlists'}
                        onPress={handleChangeTab}
                        onFocus={handleFocusItem}
                        colors={colors}
                    />
                </View>

                {/* Content */}
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {activeTab === 'albums' && (
                        <View style={styles.gridContent}>
                            {albums.map((album) => (
                                <FocusableWrapper
                                    key={album.id}
                                    id={`album-${album.id}`}
                                    isFocused={focusedItem === `album-${album.id}`}
                                    onFocus={handleFocusItem}
                                    onPress={() => handleAlbumPress(album)}
                                    colors={colors}
                                >
                                    <View pointerEvents="none">
                                        <AlbumCard album={album} size={200} onPress={() => { }} />
                                    </View>
                                </FocusableWrapper>
                            ))}
                        </View>
                    )}

                    {activeTab === 'artists' && (
                        <View style={styles.gridContent}>
                            {artists.map((artist) => (
                                <FocusableWrapper
                                    key={artist.id}
                                    id={`artist-${artist.id}`}
                                    isFocused={focusedItem === `artist-${artist.id}`}
                                    onFocus={handleFocusItem}
                                    onPress={() => handleArtistPress(artist)}
                                    colors={colors}
                                >
                                    <View pointerEvents="none">
                                        <ArtistCard artist={artist} size={180} onPress={() => { }} />
                                    </View>
                                </FocusableWrapper>
                            ))}
                        </View>
                    )}

                    {activeTab === 'playlists' && (
                        <View style={styles.playlistList}>
                            {playlists.map((playlist) => (
                                <TVPlaylistListItem
                                    key={playlist.id}
                                    playlist={playlist}
                                    customImage={customPlaylistImages[playlist.id]}
                                    isFocused={focusedItem === `playlist-${playlist.id}`}
                                    onFocus={handleFocusItem}
                                    onPress={() => handlePlaylistPress(playlist)}
                                    colors={colors}
                                />
                            ))}
                        </View>
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </View>
    );
};

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
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    tabsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 30,
    },
    tabButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    tabButtonText: {
        fontSize: 20,
        fontWeight: '600',
    },
    gridContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingTop: 10,
        paddingLeft: 4,
    },
    playlistList: {
        flex: 1,
        marginTop: 10,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    playlistIcon: {
        width: 70,
        height: 70,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playlistInfo: {
        flex: 1,
        marginLeft: 20,
    },
    playlistName: {
        fontSize: 22,
        fontWeight: '600',
    },
    playlistMeta: {
        fontSize: 16,
        marginTop: 4,
    },
});

export default TVLibraryScreen;
