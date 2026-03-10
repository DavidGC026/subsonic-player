import React, { useState, useCallback, useRef, memo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore, useThemeStore, useConfigStore, usePlayerStore } from '../../store';
import { AlbumCard, ArtistCard } from '../../components';

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

const FocusableWrapper = memo(({ children, onPress, colors, scaleTo = 1.05 }: any) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                marginRight: 20,
                transform: [{ scale: isFocused ? scaleTo : 1 }],
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
                    margin: -4
                }} />
            )}
            {children}
        </TouchableOpacity>
    );
});

export const TVSearchScreen = ({ navigation }: any) => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<{ artists: any[]; albums: any[]; songs: any[] }>({
        artists: [],
        albums: [],
        songs: []
    });

    const { currentTheme } = useThemeStore();
    const { search } = useLibraryStore();
    const { playSong } = usePlayerStore();
    const { isConfigured } = useConfigStore();
    const colors = currentTheme.colors;

    const [focusedTab, setFocusedTab] = useState('input');
    const inputRef = useRef<TextInput>(null);

    const handleFocusTab = useCallback((id: string) => {
        setFocusedTab(id);
    }, []);

    const handleSearch = useCallback(async () => {
        if (!query.trim() || !isConfigured) return;
        setIsSearching(true);
        try {
            const results = await search(query.trim());
            setSearchResults({
                artists: results.artist || [],
                albums: results.album || [],
                songs: results.song || [],
            });
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setIsSearching(false);
        }
    }, [query, isConfigured, search]);

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
                    isFocused={focusedTab === 'home'}
                    onFocus={handleFocusTab}
                    colors={colors}
                />
                <TVMenuButton
                    id="search"
                    icon="search"
                    label="Buscar"
                    onPress={() => { }}
                    isFocused={focusedTab === 'search'}
                    onFocus={handleFocusTab}
                    colors={colors}
                />
                <TVMenuButton
                    id="library"
                    icon="library"
                    label="Biblioteca"
                    onPress={() => navigation.navigate('TVLibrary')}
                    isFocused={focusedTab === 'library'}
                    onFocus={handleFocusTab}
                    colors={colors}
                />
                <TVMenuButton
                    id="settings"
                    icon="color-palette"
                    label="Temas"
                    onPress={() => navigation.navigate('TVSettings')}
                    isFocused={focusedTab === 'settings'}
                    onFocus={handleFocusTab}
                    colors={colors}
                />
            </View>

            <View style={styles.mainContent}>
                <View style={styles.searchHeader}>
                    <Ionicons name="search" size={32} color={colors.textSecondary} style={{ marginRight: 15 }} />
                    <TextInput
                        ref={inputRef}
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Buscar artistas, álbumes o canciones..."
                        placeholderTextColor={colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        onFocus={() => handleFocusTab('input')}
                    />
                </View>

                {isSearching ? (
                    <Text style={[styles.message, { color: colors.textSecondary }]}>Buscando...</Text>
                ) : (
                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        {/* Songs */}
                        {searchResults.songs.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Canciones</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                                    {searchResults.songs.map((song) => (
                                        <FocusableWrapper
                                            key={song.id}
                                            colors={colors}
                                            onPress={() => playSong(song, searchResults.songs)}
                                        >
                                            <View pointerEvents="none" style={[styles.songCard, { backgroundColor: colors.surface }]}>
                                                <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                                                <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>{song.artist}</Text>
                                            </View>
                                        </FocusableWrapper>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        {/* Albums */}
                        {searchResults.albums.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Álbumes</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                                    {searchResults.albums.map((album) => (
                                        <FocusableWrapper
                                            key={album.id}
                                            colors={colors}
                                            onPress={() => navigation.navigate('TVAlbumDetail', { albumId: album.id, albumName: album.name })}
                                        >
                                            <View pointerEvents="none">
                                                <AlbumCard album={album} size={220} onPress={() => { }} />
                                            </View>
                                        </FocusableWrapper>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        {/* Artists */}
                        {searchResults.artists.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Artistas</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                                    {searchResults.artists.map((artist) => (
                                        <FocusableWrapper
                                            key={artist.id}
                                            colors={colors}
                                            onPress={() => navigation.navigate('TVArtistDetail', { artistId: artist.id, artistName: artist.name })}
                                        >
                                            <View pointerEvents="none">
                                                <ArtistCard artist={artist} size={180} onPress={() => { }} />
                                            </View>
                                        </FocusableWrapper>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'row' },
    sidebar: { width: 250, paddingTop: 60, paddingHorizontal: 20 },
    menuButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, borderRadius: 12, marginBottom: 15 },
    menuLabel: { fontSize: 20, marginLeft: 15 },
    mainContent: { flex: 1, padding: 50 },
    searchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 15 },
    searchInput: { flex: 1, fontSize: 32, fontWeight: 'bold' },
    message: { fontSize: 24, marginTop: 40, textAlign: 'center' },
    sectionTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, marginTop: 20 },
    horizontalRow: { marginBottom: 50, paddingBottom: 25, paddingTop: 10, paddingLeft: 4 },
    songCard: { width: 300, padding: 20, borderRadius: 12, justifyContent: 'center' },
    songTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    songArtist: { fontSize: 16 }
});
