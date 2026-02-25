import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store';
import type { Song } from '../types';
import { AlbumArt } from './AlbumArt';

interface Props {
    visible: boolean;
    song: Song | null;
    onClose: () => void;
    onAddToPlaylist: () => void;
}

export const SongOptionsModal: React.FC<Props> = ({ visible, song, onClose, onAddToPlaylist }) => {
    const { addToQueue, player } = useMusicStore();

    if (!song) return null;

    const handlePlayNext = () => {
        // Insert into queue right after current index
        const newQueue = [...player.queue];
        const insertIndex = player.currentIndex >= 0 ? player.currentIndex + 1 : 0;
        newQueue.splice(insertIndex, 0, song);
        useMusicStore.getState().setQueue(newQueue);
        onClose();
    };

    const handleAddToQueue = () => {
        addToQueue(song);
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
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

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
