import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore, useThemeStore } from '../store';
import { SongItem, PlaylistEditModal } from '../components';
import type { Song, Playlist } from '../types';
import { subsonicApi } from '../api/subsonic';

interface PlaylistDetailScreenProps {
    navigation?: any;
    route?: { params?: { playlistId: string; playlistName: string } };
}

export const PlaylistDetailScreen: React.FC<PlaylistDetailScreenProps> = ({ navigation, route }) => {
    const playlistId = route?.params?.playlistId;
    const playlistName = route?.params?.playlistName;

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    const { playSong, customPlaylistImages } = useMusicStore();
    const { currentTheme } = useThemeStore();

    useEffect(() => {
        loadPlaylistDetails();
    }, [playlistId]);

    const loadPlaylistDetails = async () => {
        if (!playlistId) return;

        setIsLoading(true);
        try {
            const { playlist: playlistData, songs: playlistSongs } = await subsonicApi.getPlaylist(playlistId);
            setPlaylist(playlistData);
            setSongs(playlistSongs);
        } catch (error) {
            console.error('Error loading playlist:', error);
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
            <View style={[styles.loadingContainer, { backgroundColor: currentTheme.colors.background }]}>
                <Text style={[styles.loadingText, { color: currentTheme.colors.textSecondary }]}>Cargando...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <FlatList
                data={songs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation?.goBack()}
                            >
                                <Ionicons name="arrow-back" size={28} color={currentTheme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.optionsButton}
                                onPress={() => setIsEditModalVisible(true)}
                            >
                                <Ionicons name="ellipsis-vertical" size={24} color={currentTheme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.infoContainer}>
                            {playlistId && customPlaylistImages[playlistId] ? (
                                <Image source={{ uri: customPlaylistImages[playlistId] }} style={styles.playlistCover} />
                            ) : null}
                            <Text style={[styles.playlistName, { color: currentTheme.colors.text }]} numberOfLines={2}>
                                {playlist?.name || playlistName}
                            </Text>
                            <Text style={[styles.metaInfo, { color: currentTheme.colors.textSecondary }]}>
                                {playlist?.songCount || songs.length} canciones • {formatDuration(playlist?.duration || 0)}
                            </Text>
                        </View>

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

                        <Text style={[styles.songsTitle, { color: currentTheme.colors.text }]}>Canciones</Text>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <SongItem
                        song={item}
                        onPress={handleSongPress}
                        showArt={true}
                        index={index}
                    />
                )}
            />
            <PlaylistEditModal
                visible={isEditModalVisible}
                playlist={playlist}
                onClose={() => {
                    setIsEditModalVisible(false);
                    loadPlaylistDetails(); // Refresh details after possible rename
                }}
                onDeleted={() => {
                    navigation?.goBack();
                }}
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
    header: {
        paddingTop: 60,
        paddingBottom: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 8,
    },
    optionsButton: {
        padding: 8,
    },
    infoContainer: {
        paddingHorizontal: 24,
        paddingTop: 48,
        marginBottom: 24,
        alignItems: 'center',
    },
    playlistCover: {
        width: 180,
        height: 180,
        borderRadius: 8,
        marginBottom: 16,
    },
    playlistName: {
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
    songsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 24,
        marginBottom: 8,
    },
});

export default PlaylistDetailScreen;
