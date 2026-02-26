import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore, useThemeStore, useModalStore } from '../store';
import { SongItem, PlaylistEditModal, PlaylistAddSongsModal } from '../components';
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
    const [isAddSongsModalVisible, setIsAddSongsModalVisible] = useState(false);

    const { playSong, customPlaylistImages, removeSongFromPlaylist } = useMusicStore();
    const setOptionsModalSong = useModalStore(state => state.setOptionsModalSong);
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

    const handleRemoveFromPlaylist = (song: Song, index: number) => {
        // Native Alert to confirm
        Alert.alert(
            "Eliminar de la playlist",
            `¿Estás seguro de que deseas eliminar "${song.title}" de la playlist?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        if (playlistId) {
                            await removeSongFromPlaylist(playlistId, index);
                            loadPlaylistDetails();
                        }
                    }
                }
            ]
        );
    };

    const handleSongOptions = (song: Song, index: number) => {
        // We can show an ActionSheet in iOS/Android, or use a custom modal
        // Since we already have SongOptionsModal but it's global, we can use Alert for quick actions
        // Or if we want to integrate with standard UI, we can use a local state for the modal.
        // The simplest and most native react-native way without extra packages is Alert ActionSheet or simple Alert
        Alert.alert(
            "Opciones de Canción",
            `${song.title} - ${song.artist}`,
            [
                {
                    text: "Añadir a la cola",
                    onPress: () => {
                        useMusicStore.getState().addToQueue(song);
                    }
                },
                {
                    text: "Eliminar de la playlist",
                    style: "destructive",
                    onPress: () => handleRemoveFromPlaylist(song, index)
                },
                {
                    text: "Más opciones",
                    onPress: () => setOptionsModalSong(song)
                },
                { text: "Cancelar", style: "cancel" }
            ]
        );
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
                keyExtractor={(item, index) => `${item.id}-${index}`}
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
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={5}
                getItemLayout={(data, index) => ({
                    length: 66, // Includes album art
                    offset: 66 * index,
                    index,
                })}
                renderItem={({ item, index }) => (
                    <SongItem
                        song={item}
                        onPress={handleSongPress}
                        onOptionsPress={() => handleSongOptions(item, index)}
                        showArt={true}
                        index={index}
                    />
                )}
            />
            <PlaylistEditModal
                visible={isEditModalVisible}
                playlist={playlist}
                songs={songs}
                onClose={() => {
                    setIsEditModalVisible(false);
                    loadPlaylistDetails(); // Refresh details after possible rename
                }}
                onDeleted={() => {
                    navigation?.goBack();
                }}
                onAddSongs={() => {
                    setIsAddSongsModalVisible(true);
                }}
            />
            {playlistId && (
                <PlaylistAddSongsModal
                    visible={isAddSongsModalVisible}
                    playlistId={playlistId}
                    onClose={() => {
                        setIsAddSongsModalVisible(false);
                        loadPlaylistDetails(); // Refresh to show newly added songs
                    }}
                />
            )}
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
