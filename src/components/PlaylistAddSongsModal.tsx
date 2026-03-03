import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../store';
import type { Song } from '../types';
import { SongItem } from './SongItem';

interface Props {
    visible: boolean;
    playlistId: string;
    onClose: () => void;
}

export const PlaylistAddSongsModal: React.FC<Props> = ({ visible, playlistId, onClose }) => {
    const { search, addSongToPlaylist } = useLibraryStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Song[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [addingSongId, setAddingSongId] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setQuery('');
            setResults([]);
            setIsSearching(false);
            setAddingSongId(null);
        }
    }, [visible]);

    // Handle search debounce naturally
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim().length > 2) {
                setIsSearching(true);
                const searchData = await search(query);
                setResults(searchData.song || []);
                setIsSearching(false);
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleAddSong = async (song: Song) => {
        if (!playlistId || addingSongId === song.id) return;
        setAddingSongId(song.id);
        await addSongToPlaylist(playlistId, song.id);
        setAddingSongId(null);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Añadir canciones</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#ffffff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#b3b3b3" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Buscar canciones..."
                                    placeholderTextColor="#b3b3b3"
                                    value={query}
                                    onChangeText={setQuery}
                                    autoFocus
                                    returnKeyType="search"
                                />
                                {query.length > 0 && (
                                    <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                                        <Ionicons name="close-circle" size={16} color="#b3b3b3" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {isSearching ? (
                                <View style={styles.centerContainer}>
                                    <ActivityIndicator size="large" color="#B22222" />
                                </View>
                            ) : results.length > 0 ? (
                                <FlatList
                                    data={results}
                                    keyExtractor={(item, index) => `${item.id}-${index}`}
                                    style={styles.list}
                                    contentContainerStyle={styles.listContent}
                                    renderItem={({ item, index }) => (
                                        <View style={styles.songRow}>
                                            <View style={styles.songItemWrapper}>
                                                <SongItem song={item} showArt={true} index={index} />
                                            </View>
                                            <TouchableOpacity
                                                style={styles.addButton}
                                                onPress={() => handleAddSong(item)}
                                                disabled={addingSongId === item.id}
                                            >
                                                {addingSongId === item.id ? (
                                                    <ActivityIndicator size="small" color="#1DB954" />
                                                ) : (
                                                    <Ionicons name="add-circle-outline" size={28} color="#b3b3b3" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                            ) : query.length > 2 ? (
                                <View style={styles.centerContainer}>
                                    <Ionicons name="search-outline" size={48} color="#404040" />
                                    <Text style={styles.emptyText}>No se encontraron canciones</Text>
                                </View>
                            ) : (
                                <View style={styles.centerContainer}>
                                    <Ionicons name="musical-notes-outline" size={48} color="#404040" />
                                    <Text style={styles.emptyText}>Busca por título o artista</Text>
                                </View>
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
        height: '80%',
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
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282828',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#ffffff',
        fontSize: 16,
        paddingVertical: 12,
    },
    clearButton: {
        padding: 8,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 24,
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#282828',
    },
    songItemWrapper: {
        flex: 1,
    },
    addButton: {
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#b3b3b3',
        fontSize: 16,
        marginTop: 16,
    },
});

export default PlaylistAddSongsModal;
