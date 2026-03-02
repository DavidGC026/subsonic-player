import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMusicStore, useDownloadStore } from '../store';
import type { Playlist, Song } from '../types';
import { subsonicApi } from '../api/subsonic';

interface Props {
    visible: boolean;
    playlist: Playlist | null;
    onClose: () => void;
    onDeleted?: () => void;
    onAddSongs?: () => void;
    songs?: Song[];
}

export const PlaylistEditModal: React.FC<Props> = ({ visible, playlist, onClose, onDeleted, onAddSongs, songs }) => {
    const { updatePlaylistName, deletePlaylist, setCustomPlaylistImage, customPlaylistImages } = useMusicStore();
    const { downloadPlaylist, removeDownload, isDownloaded, playlistDownloadProgress, cancelPlaylistDownload } = useDownloadStore();
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        if (visible && playlist) {
            setNewName(playlist.name);
            setIsEditing(false);
        }
    }, [visible, playlist]);

    if (!playlist) return null;

    const isDownloadingThisPlaylist = playlistDownloadProgress?.playlistId === playlist.id;

    // Check if all songs in the playlist are downloaded
    const allSongsDownloaded = songs && songs.length > 0 && songs.every((s) => isDownloaded(s.id));
    const someSongsDownloaded = songs && songs.some((s) => isDownloaded(s.id));

    const handleSaveName = async () => {
        if (newName.trim() && newName !== playlist.name) {
            await updatePlaylistName(playlist.id, newName.trim());
            onClose();
        } else {
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Eliminar Playlist",
            `¿Estás seguro de que deseas eliminar la playlist "${playlist.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        await deletePlaylist(playlist.id);
                        onClose();
                        if (onDeleted) onDeleted();
                    }
                }
            ]
        );
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            await setCustomPlaylistImage(playlist.id, result.assets[0].uri);
        }
    };

    const handleRemoveImage = async () => {
        await setCustomPlaylistImage(playlist.id, null);
    };

    const handleDownloadPlaylist = async () => {
        if (!songs || songs.length === 0) {
            // If songs weren't passed, fetch them
            try {
                const { songs: playlistSongs } = await subsonicApi.getPlaylist(playlist.id);
                onClose();
                await downloadPlaylist(playlist, playlistSongs);
            } catch (error) {
                console.error('Error fetching playlist songs for download:', error);
            }
        } else {
            onClose();
            await downloadPlaylist(playlist, songs);
        }
    };

    const handleRemovePlaylistDownloads = () => {
        if (!songs) return;
        Alert.alert(
            "Eliminar descargas",
            `¿Eliminar todas las descargas de "${playlist.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        for (const song of songs) {
                            if (isDownloaded(song.id)) {
                                await removeDownload(song.id);
                            }
                        }
                        useDownloadStore.getState().removePlaylistDownload(playlist.id);
                        onClose();
                    }
                }
            ]
        );
    };

    const handleCancelDownload = () => {
        cancelPlaylistDownload();
    };

    const customImage = customPlaylistImages[playlist?.id || ''];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Opciones de Playlist</Text>
                                <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                                    <Ionicons name="close" size={24} color="#ffffff" />
                                </TouchableOpacity>
                            </View>

                            {isEditing ? (
                                <View style={styles.editContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={newName}
                                        onChangeText={setNewName}
                                        placeholder="Nombre de la playlist"
                                        placeholderTextColor="#b3b3b3"
                                        autoFocus
                                        selectionColor="#B22222"
                                    />
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
                                            <Text style={styles.saveButtonText}>Guardar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.playlistInfo}>
                                        {customImage ? (
                                            <Image source={{ uri: customImage }} style={styles.customImage} />
                                        ) : (
                                            <Ionicons name="musical-notes" size={48} color="#b3b3b3" />
                                        )}
                                        <Text style={styles.playlistName} numberOfLines={2}>{playlist.name}</Text>
                                    </View>

                                    <TouchableOpacity style={styles.option} onPress={() => setIsEditing(true)}>
                                        <Ionicons name="pencil" size={24} color="#ffffff" />
                                        <Text style={styles.optionText}>Renombrar playlist</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.option} onPress={handlePickImage}>
                                        <Ionicons name="image" size={24} color="#ffffff" />
                                        <Text style={styles.optionText}>Cambiar imagen de portada</Text>
                                    </TouchableOpacity>

                                    {/* Add songs custom option */}
                                    <TouchableOpacity style={styles.option} onPress={() => {
                                        if (onAddSongs) {
                                            onClose();
                                            onAddSongs();
                                        }
                                    }}>
                                        <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
                                        <Text style={styles.optionText}>Añadir canciones</Text>
                                    </TouchableOpacity>

                                    {customImage && (
                                        <TouchableOpacity style={styles.option} onPress={handleRemoveImage}>
                                            <Ionicons name="trash-outline" size={24} color="#ffffff" />
                                            <Text style={styles.optionText}>Quitar imagen personalizada</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Download playlist options */}
                                    {isDownloadingThisPlaylist ? (
                                        <TouchableOpacity style={styles.option} onPress={handleCancelDownload}>
                                            <ActivityIndicator size={24} color="#1DB954" />
                                            <View style={styles.downloadProgressContainer}>
                                                <Text style={[styles.optionText, { color: '#1DB954' }]}>
                                                    Descargando {playlistDownloadProgress.completed}/{playlistDownloadProgress.total}
                                                </Text>
                                                <Text style={styles.downloadProgressSong} numberOfLines={1}>
                                                    {playlistDownloadProgress.currentSongTitle}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ) : allSongsDownloaded ? (
                                        <TouchableOpacity style={styles.option} onPress={handleRemovePlaylistDownloads}>
                                            <Ionicons name="cloud-done" size={24} color="#1DB954" />
                                            <Text style={[styles.optionText, { color: '#1DB954' }]}>Eliminar descargas de playlist</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity style={styles.option} onPress={handleDownloadPlaylist}>
                                            <Ionicons name="download-outline" size={24} color="#ffffff" />
                                            <Text style={styles.optionText}>
                                                {someSongsDownloaded ? 'Descargar canciones restantes' : 'Descargar playlist'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity style={styles.optionDestructive} onPress={handleDelete}>
                                        <Ionicons name="trash" size={24} color="#B22222" />
                                        <Text style={styles.optionTextDestructive}>Eliminar playlist</Text>
                                    </TouchableOpacity>
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
    playlistInfo: {
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#282828',
        marginBottom: 8,
    },
    customImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    playlistName: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 12,
        textAlign: 'center',
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
    optionDestructive: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    optionTextDestructive: {
        color: '#B22222',
        fontSize: 16,
        marginLeft: 16,
    },
    downloadProgressContainer: {
        marginLeft: 16,
        flex: 1,
    },
    downloadProgressSong: {
        color: '#b3b3b3',
        fontSize: 12,
        marginTop: 2,
    },
    editContainer: {
        marginTop: 8,
    },
    input: {
        backgroundColor: '#282828',
        color: '#ffffff',
        padding: 16,
        borderRadius: 8,
        fontSize: 18,
        marginBottom: 16,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    cancelButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#B22222',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default PlaylistEditModal;
