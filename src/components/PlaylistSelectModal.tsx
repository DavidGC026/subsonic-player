import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store';
import type { Song } from '../types';

interface Props {
    visible: boolean;
    song: Song | null;
    onClose: () => void;
}

export const PlaylistSelectModal: React.FC<Props> = ({ visible, song, onClose }) => {
    const { playlists, fetchPlaylists, createPlaylist, addSongToPlaylist } = useMusicStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    useEffect(() => {
        if (visible) {
            fetchPlaylists();
            setIsCreating(false);
            setNewPlaylistName('');
        }
    }, [visible]);

    if (!song) return null;

    const handleSelectPlaylist = async (playlistId: string) => {
        await addSongToPlaylist(playlistId, song.id);
        onClose();
    };

    const handleCreatePlaylist = async () => {
        if (newPlaylistName.trim()) {
            await createPlaylist(newPlaylistName.trim());
            setIsCreating(false);
            setNewPlaylistName('');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Añadir a playlist</Text>
                                <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                                    <Ionicons name="close" size={24} color="#ffffff" />
                                </TouchableOpacity>
                            </View>

                            {isCreating ? (
                                <View style={styles.createContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nombre de la nueva playlist"
                                        placeholderTextColor="#b3b3b3"
                                        value={newPlaylistName}
                                        onChangeText={setNewPlaylistName}
                                        autoFocus
                                    />
                                    <View style={styles.createActions}>
                                        <TouchableOpacity style={styles.cancelButton} onPress={() => setIsCreating(false)}>
                                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.saveButton} onPress={handleCreatePlaylist}>
                                            <Text style={styles.saveButtonText}>Guardar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.createOption} onPress={() => setIsCreating(true)}>
                                        <View style={styles.createIcon}>
                                            <Ionicons name="add" size={24} color="#ffffff" />
                                        </View>
                                        <Text style={styles.createOptionText}>Nueva playlist</Text>
                                    </TouchableOpacity>

                                    <FlatList
                                        data={playlists}
                                        keyExtractor={(item) => item.id}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity style={styles.playlistItem} onPress={() => handleSelectPlaylist(item.id)}>
                                                <Text style={styles.playlistName}>{item.name}</Text>
                                                <Text style={styles.playlistCount}>{item.songCount} canciones</Text>
                                            </TouchableOpacity>
                                        )}
                                        style={styles.list}
                                    />
                                </>
                            )}
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
        backgroundColor: '#121212',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: '70%',
        padding: 16,
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    createOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#282828',
        marginBottom: 8,
    },
    createIcon: {
        width: 48,
        height: 48,
        backgroundColor: '#282828',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    createOptionText: {
        color: '#ffffff',
        fontSize: 16,
        marginLeft: 12,
    },
    list: {
        flex: 1,
    },
    playlistItem: {
        paddingVertical: 12,
    },
    playlistName: {
        color: '#ffffff',
        fontSize: 16,
        marginBottom: 4,
    },
    playlistCount: {
        color: '#b3b3b3',
        fontSize: 14,
    },
    createContainer: {
        marginTop: 16,
    },
    input: {
        backgroundColor: '#282828',
        color: '#ffffff',
        padding: 16,
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 16,
    },
    createActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
    },
    cancelButton: {
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 24,
        paddingRight: 24,
    },
    cancelButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#B22222',
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 24,
        paddingRight: 24,
        borderRadius: 24,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
