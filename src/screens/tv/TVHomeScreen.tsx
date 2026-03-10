import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore, useThemeStore, useConfigStore, usePlayerStore } from '../../store';
import { AlbumCard, ArtistCard } from '../../components';

export const TVHomeScreen = ({ navigation }: any) => {
    const { albums, artists, fetchAlbums, fetchArtists, fetchPlaylists } = useLibraryStore();
    const { isConfigured } = useConfigStore();
    const { currentTheme } = useThemeStore();
    const { player } = usePlayerStore();
    const colors = currentTheme.colors;

    useEffect(() => {
        if (isConfigured) {
            fetchAlbums();
            fetchArtists();
            fetchPlaylists();
        }
    }, [isConfigured]);

    const [focusedTab, setFocusedTab] = useState('home');

    const SidebarMenu = () => {
        const MenuButton = ({ id, icon, label, onPress }: { id: string, icon: any, label: string, onPress?: () => void }) => {
            const isFocused = focusedTab === id;
            return (
                <TouchableOpacity
                    style={[
                        styles.menuButton,
                        isFocused && { backgroundColor: colors.primary }
                    ]}
                    onFocus={() => setFocusedTab(id)}
                    onPress={onPress}
                    hasTVPreferredFocus={id === 'home'}
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
                <MenuButton id="home" icon="home" label="Inicio" />
                <MenuButton id="search" icon="search" label="Buscar" onPress={() => navigation.navigate('TVSearch')} />
                <MenuButton id="library" icon="library" label="Biblioteca" />

                {/* Show Now Playing icon if there is an active song */}
                {player.currentSong && (
                    <View style={{ marginTop: 'auto', marginBottom: 20 }}>
                        <TouchableOpacity
                            style={[styles.menuButton, focusedTab === 'player' && { backgroundColor: colors.primary }]}
                            onFocus={() => setFocusedTab('player')}
                            onPress={() => navigation.navigate('TVPlayer')}
                        >
                            <Ionicons name="play-circle" size={28} color={focusedTab === 'player' ? colors.black : colors.primary} />
                            <Text style={[styles.menuLabel, { color: focusedTab === 'player' ? colors.black : colors.primary, fontWeight: 'bold' }]}>
                                Reproduciendo
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    const FocusableWrapper = ({ children, onPress }: any) => {
        const [isFocused, setIsFocused] = useState(false);
        return (
            <TouchableOpacity
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onPress={onPress}
                style={{
                    marginRight: 20,
                    transform: [{ scale: isFocused ? 1.05 : 1 }],
                    shadowColor: isFocused ? colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.8,
                    shadowRadius: 20,
                    elevation: isFocused ? 10 : 0,
                    borderRadius: 12,
                }}
            >
                {/* Border effect for TV focus */}
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
    };

    return (
        <View style={styles.container}>
            <SidebarMenu />

            <ScrollView style={styles.mainContent}>
                <Text style={[styles.greeting, { color: colors.text }]}>Buenos días</Text>

                {/* Albums */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Agregados Recientemente</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                    {albums.slice(0, 15).map((album) => (
                        <FocusableWrapper key={album.id} onPress={() => { }}>
                            <View pointerEvents="none">
                                <AlbumCard
                                    album={album}
                                    size={220}
                                    onPress={() => { }}
                                />
                            </View>
                        </FocusableWrapper>
                    ))}
                </ScrollView>

                {/* Artists */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Artistas Populares</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                    {artists.slice(0, 10).map((artist) => (
                        <FocusableWrapper key={artist.id} onPress={() => { }}>
                            <View pointerEvents="none">
                                <ArtistCard
                                    artist={artist}
                                    size={180}
                                    onPress={() => { }}
                                />
                            </View>
                        </FocusableWrapper>
                    ))}
                </ScrollView>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

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
    greeting: {
        fontSize: 54,
        fontWeight: 'bold',
        marginBottom: 50,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 25,
        marginTop: 20,
    },
    horizontalRow: {
        marginBottom: 50,
        paddingBottom: 20, // space for shadows
        paddingTop: 10,
    }
});
