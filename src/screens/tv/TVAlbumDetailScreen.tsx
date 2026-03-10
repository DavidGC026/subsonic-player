import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useThemeStore } from '../../store';
import { AlbumArt } from '../../components';
import type { Song, Album } from '../../types';
import { subsonicApi } from '../../api/subsonic';

export const TVAlbumDetailScreen = ({ navigation, route }: any) => {
    const albumId = route?.params?.albumId;
    const albumName = route?.params?.albumName;

    const [album, setAlbum] = useState<Album | null>(null);
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { playSong } = usePlayerStore();
    const { currentTheme } = useThemeStore();
    const colors = currentTheme.colors;

    const [focusedItem, setFocusedItem] = useState<string>('play');

    useEffect(() => {
        loadAlbumDetails();
    }, [albumId]);

    const loadAlbumDetails = async () => {
        if (!albumId) return;
        setIsLoading(true);
        try {
            const { album: albumData, songs: albumSongs } = await subsonicApi.getAlbum(albumId);
            setAlbum(albumData);
            setSongs(albumSongs);
        } catch (err) {
            console.error('Error loading album:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlayAll = () => {
        if (songs.length > 0) {
            playSong(songs[0], songs);
            navigation.navigate('TVPlayer');
        }
    };

    const handleShufflePlay = () => {
        if (songs.length > 0) {
            const shuffled = [...songs].sort(() => Math.random() - 0.5);
            playSong(shuffled[0], shuffled);
            navigation.navigate('TVPlayer');
        }
    };

    const handleSongPress = (song: Song) => {
        playSong(song, songs);
        navigation.navigate('TVPlayer');
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatAlbumDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        if (hours > 0) return `${hours}h ${remainingMins}m`;
        return `${mins} min`;
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
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando álbum...</Text>
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

            <View style={styles.content}>
                {/* Left: Album Art & Info */}
                <View style={styles.leftPanel}>
                    <View style={styles.artWrapper}>
                        <AlbumArt
                            coverArtId={album?.coverArt}
                            size={340}
                            borderRadius={12}
                            iconSize={80}
                        />
                    </View>
                    <Text style={[styles.albumTitle, { color: colors.text }]} numberOfLines={2}>
                        {album?.name || albumName}
                    </Text>
                    <TouchableOpacity
                        onFocus={() => setFocusedItem('artist-link')}
                        onPress={() => album?.artistId && navigation.navigate('TVArtistDetail', {
                            artistId: album.artistId,
                            artistName: album.artist,
                        })}
                        style={focusedItem === 'artist-link' ? { transform: [{ scale: 1.05 }] } : {}}
                    >
                        <Text style={[styles.albumArtist, { color: colors.primary }]}>{album?.artist}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.albumMeta, { color: colors.textSecondary }]}>
                        {album?.year ? `${album.year} • ` : ''}
                        {songs.length} canciones • {formatAlbumDuration(album?.duration || 0)}
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

                {/* Right: Song List */}
                <View style={styles.rightPanel}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Canciones</Text>
                    <ScrollView style={styles.songList} showsVerticalScrollIndicator={false}>
                        {songs.map((song, index) => {
                            const songId = `song-${index}`;
                            const isFocused = focusedItem === songId;
                            return (
                                <TouchableOpacity
                                    key={song.id}
                                    style={[
                                        styles.songItem,
                                        { borderBottomColor: colors.surface + '40' },
                                        isFocused && {
                                            backgroundColor: colors.primary + '20',
                                            borderRadius: 12,
                                            transform: [{ scale: 1.02 }],
                                        }
                                    ]}
                                    onFocus={() => setFocusedItem(songId)}
                                    onPress={() => handleSongPress(song)}
                                >
                                    <Text style={[styles.songNumber, { color: isFocused ? colors.primary : colors.textSecondary }]}>
                                        {index + 1}
                                    </Text>
                                    <View style={styles.songInfo}>
                                        <Text style={[styles.songTitle, { color: isFocused ? colors.primary : colors.text }]} numberOfLines={1}>
                                            {song.title}
                                        </Text>
                                        <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {song.artist}
                                        </Text>
                                    </View>
                                    <Text style={[styles.songDuration, { color: colors.textSecondary }]}>
                                        {formatDuration(song.duration)}
                                    </Text>
                                    {isFocused && (
                                        <Ionicons name="play" size={20} color={colors.primary} style={{ marginLeft: 10 }} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                        <View style={{ height: 60 }} />
                    </ScrollView>
                </View>
            </View>
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
    content: {
        flex: 1,
        flexDirection: 'row',
        paddingTop: 40,
    },
    leftPanel: {
        width: 420,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    artWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.6,
        shadowRadius: 25,
        elevation: 15,
        marginBottom: 24,
    },
    albumTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    albumArtist: {
        fontSize: 22,
        textAlign: 'center',
        marginBottom: 8,
    },
    albumMeta: {
        fontSize: 16,
        textAlign: 'center',
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
    rightPanel: {
        flex: 1,
        paddingRight: 40,
        paddingTop: 20,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    songList: {
        flex: 1,
    },
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    songNumber: {
        fontSize: 18,
        width: 40,
        textAlign: 'center',
    },
    songInfo: {
        flex: 1,
        marginLeft: 12,
    },
    songTitle: {
        fontSize: 20,
        fontWeight: '500',
        marginBottom: 4,
    },
    songArtist: {
        fontSize: 16,
    },
    songDuration: {
        fontSize: 16,
        marginLeft: 12,
    },
});

export default TVAlbumDetailScreen;
