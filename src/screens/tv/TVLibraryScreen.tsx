import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore, useThemeStore, useConfigStore, usePlayerStore } from '../../store';
import { AlbumCard, ArtistCard } from '../../components';
import { subsonicApi } from '../../api/subsonic';

type LibraryTab = 'albums' | 'artists' | 'playlists';

export const TVLibraryScreen = ({ navigation }: any) => {
    const {
        albums, artists, playlists,
        fetchAlbums, fetchArtists, fetchPlaylists,
        fetchAlbumSongs,
        customPlaylistImages,
    } = useLibraryStore();
    const { isConfigured } = useConfigStore();
    const { currentTheme } = useThemeStore();
    const { playSong, player } = usePlayerStore();
    const colors = currentTheme.colors;

    const [activeTab, setActiveTab] = useState<LibraryTab>('albums');
    const [focusedItem, setFocusedItem] = useState<string>('tab-albums');

    useEffect(() => {
        if (isConfigured) {
            fetchAlbums();
            fetchArtists();
            fetchPlaylists();
        }
    }, [isConfigured]);

    const handleAlbumPress = (album: any) => {
        navigation.navigate('TVAlbumDetail', { albumId: album.id, albumName: album.name });
    };

    const handleArtistPress = (artist: any) => {
        navigation.navigate('TVArtistDetail', { artistId: artist.id, artistName: artist.name });
    };

    const handlePlaylistPress = async (playlist: any) => {
        // For TV: load playlist songs and play them
        try {
            const data = await subsonicApi.getPlaylist(playlist.id);
            if (data.songs && data.songs.length > 0) {
                playSong(data.songs[0], data.songs);
                navigation.navigate('TVPlayer');
            }
        } catch (error) {
            console.error('Error loading playlist:', error);
        }
    };

    const SidebarMenu = () => {
        const MenuButton = ({ id, icon, label, onPress }: { id: string, icon: any, label: string, onPress?: () => void }) => {
            const isFocused = focusedItem === id;
            return (
                <TouchableOpacity
                    style={[
                        styles.menuButton,
                        isFocused && { backgroundColor: colors.primary }
                    ]}
                    onFocus={() => setFocusedItem(id)}
                    onPress={onPress}
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
        };

        return (
            <View style={[styles.sidebar, { backgroundColor: colors.surface + '90' }]}>
                <View style={{ marginBottom: 60, alignItems: 'center' }}>
                    <Ionicons name="musical-notes" size={60} color={colors.primary} />
                </View>
                <MenuButton id="home" icon="home" label="Inicio" onPress={() => navigation.navigate('TVHome')} />
                <MenuButton id="search" icon="search" label="Buscar" onPress={() => navigation.navigate('TVSearch')} />
                <MenuButton id="library" icon="library" label="Biblioteca" />

                {player.currentSong && (
                    <View style={{ marginTop: 'auto', marginBottom: 20 }}>
                        <TouchableOpacity
                            style={[styles.menuButton, focusedItem === 'player' && { backgroundColor: colors.primary }]}
                            onFocus={() => setFocusedItem('player')}
                            onPress={() => navigation.navigate('TVPlayer')}
                        >
                            <Ionicons name="play-circle" size={28} color={focusedItem === 'player' ? colors.black : colors.primary} />
                            <Text style={[styles.menuLabel, { color: focusedItem === 'player' ? colors.black : colors.primary, fontWeight: 'bold' }]}>
                                Reproduciendo
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
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

    const TabButton = ({ tab, label }: { tab: LibraryTab, label: string }) => {
        const isActive = activeTab === tab;
        const isFocused = focusedItem === `tab-${tab}`;
        return (
            <TouchableOpacity
                style={[
                    styles.tabButton,
                    isActive && { backgroundColor: colors.primary },
                    isFocused && !isActive && { backgroundColor: colors.surface, transform: [{ scale: 1.05 }] },
                ]}
                onFocus={() => setFocusedItem(`tab-${tab}`)}
                onPress={() => setActiveTab(tab)}
                hasTVPreferredFocus={tab === 'albums'}
            >
                <Text style={[
                    styles.tabButtonText,
                    { color: isActive ? colors.black : colors.text }
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderAlbums = () => (
        <View style={styles.gridContent}>
            {albums.map((album) => (
                <FocusableWrapper key={album.id} id={`album-${album.id}`} onPress={() => handleAlbumPress(album)}>
                    <View pointerEvents="none">
                        <AlbumCard album={album} size={200} onPress={() => { }} />
                    </View>
                </FocusableWrapper>
            ))}
        </View>
    );

    const renderArtists = () => (
        <View style={styles.gridContent}>
            {artists.map((artist) => (
                <FocusableWrapper key={artist.id} id={`artist-${artist.id}`} onPress={() => handleArtistPress(artist)}>
                    <View pointerEvents="none">
                        <ArtistCard artist={artist} size={180} onPress={() => { }} />
                    </View>
                </FocusableWrapper>
            ))}
        </View>
    );

    const renderPlaylists = () => (
        <View style={styles.playlistList}>
            {playlists.map((playlist) => {
                const isFocused = focusedItem === `playlist-${playlist.id}`;
                return (
                    <TouchableOpacity
                        key={playlist.id}
                        style={[
                            styles.playlistItem,
                            { borderBottomColor: colors.surface + '40' },
                            isFocused && {
                                backgroundColor: colors.primary + '20',
                                borderRadius: 12,
                                transform: [{ scale: 1.02 }],
                            }
                        ]}
                        onFocus={() => setFocusedItem(`playlist-${playlist.id}`)}
                        onPress={() => handlePlaylistPress(playlist)}
                    >
                        {customPlaylistImages[playlist.id] ? (
                            <Image source={{ uri: customPlaylistImages[playlist.id] }} style={styles.playlistIcon} />
                        ) : (
                            <View style={[styles.playlistIcon, { backgroundColor: colors.surface }]}>
                                <Ionicons name="musical-notes" size={32} color={colors.textSecondary} />
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
                            <Ionicons name="play" size={24} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <SidebarMenu />

            <View style={styles.mainContent}>
                <Text style={[styles.title, { color: colors.text }]}>Tu Biblioteca</Text>

                {/* Tabs */}
                <View style={styles.tabsRow}>
                    <TabButton tab="albums" label="Álbumes" />
                    <TabButton tab="artists" label="Artistas" />
                    <TabButton tab="playlists" label="Playlists" />
                </View>

                {/* Content */}
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {activeTab === 'albums' && renderAlbums()}
                    {activeTab === 'artists' && renderArtists()}
                    {activeTab === 'playlists' && renderPlaylists()}
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
    },
    tabButtonText: {
        fontSize: 20,
        fontWeight: '600',
    },
    gridContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    playlistList: {
        flex: 1,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
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
