import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useDownloadStore } from '../store';
import type { Song } from '../types';
import { AlbumArt } from './AlbumArt';

interface Props {
    visible: boolean;
    song: Song | null;
    onClose: () => void;
    onAddToPlaylist: () => void;
}

export const SongOptionsModal: React.FC<Props> = React.memo(({ visible, song, onClose, onAddToPlaylist }) => {
    const addToQueue = usePlayerStore(state => state.addToQueue);
    const player = usePlayerStore(state => state.player);
    const { downloadSong, removeDownload, isDownloaded, currentDownload } = useDownloadStore();

    if (!song) return null;

    const songIsDownloaded = isDownloaded(song.id);
    const isCurrentlyDownloading = currentDownload?.songId === song.id;

    const handlePlayNext = () => {
        usePlayerStore.getState().addNext(song);
        onClose();
    };

    const handleAddToQueue = () => {
        addToQueue(song);
        onClose();
    };

    const handleDownload = async () => {
        onClose();
        await downloadSong(song);
    };

    const handleRemoveDownload = async () => {
        await removeDownload(song.id);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            <View style={styles.header}>
                                <AlbumArt coverArtId={song.coverArt} size={48} borderRadius={4} iconSize={24} />
                                <View style={styles.headerInfo}>
                                    <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
                                    <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
                                </View>
                                {songIsDownloaded && (
                                    <Ionicons name="checkmark-circle" size={20} color="#1DB954" style={styles.downloadedBadge} />
                                )}
                            </View>

                            <TouchableOpacity style={styles.option} onPress={handlePlayNext}>
                                <Ionicons name="play-forward" size={24} color="#b3b3b3" />
                                <Text style={styles.optionText}>Reproducir a continuación</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.option} onPress={handleAddToQueue}>
                                <Ionicons name="list" size={24} color="#b3b3b3" />
                                <Text style={styles.optionText}>Añadir a la cola</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.option} onPress={onAddToPlaylist}>
                                <Ionicons name="add-circle-outline" size={24} color="#b3b3b3" />
                                <Text style={styles.optionText}>Añadir a playlist</Text>
                            </TouchableOpacity>

                            {songIsDownloaded ? (
                                <TouchableOpacity style={styles.option} onPress={handleRemoveDownload}>
                                    <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
                                    <Text style={[styles.optionText, { color: '#ff6b6b' }]}>Eliminar descarga</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={handleDownload}
                                    disabled={isCurrentlyDownloading}
                                >
                                    {isCurrentlyDownloading ? (
                                        <>
                                            <ActivityIndicator size={24} color="#1DB954" />
                                            <Text style={[styles.optionText, { color: '#1DB954' }]}>Descargando...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="download-outline" size={24} color="#b3b3b3" />
                                            <Text style={styles.optionText}>Descargar</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#282828',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#404040',
        paddingBottom: 16,
    },
    headerInfo: {
        marginLeft: 12,
        flex: 1,
    },
    title: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    artist: {
        color: '#b3b3b3',
        fontSize: 14,
        marginTop: 4,
    },
    downloadedBadge: {
        marginLeft: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    optionText: {
        color: '#ffffff',
        fontSize: 16,
        marginLeft: 16,
    },
});
