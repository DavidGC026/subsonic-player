import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore, useThemeStore, useConfigStore, usePlayerStore } from '../../store';

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

const FocusableThemeItem = memo(({ theme, onPress, isFocused, onFocus, isSelected, colors }: any) => {
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            onFocus={() => onFocus(`theme-${theme.id}`)}
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.themeItem,
                { backgroundColor: colors.surface },
                isFocused && {
                    backgroundColor: colors.primary + '20',
                    transform: [{ scale: 1.02 }],
                    borderColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.8,
                    shadowRadius: 20,
                    elevation: 10,
                },
                isSelected && !isFocused && {
                    borderColor: colors.primary,
                    borderWidth: 2,
                }
            ]}
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
            <View style={styles.themeInfo}>
                <View style={[styles.colorPreview, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.themeItemName, { color: isFocused ? colors.primary : colors.text }]}>
                    {theme.name}
                </Text>
            </View>
            {isSelected && (
                <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            )}
        </TouchableOpacity>
    );
});

export const TVSettingsScreen = ({ navigation }: any) => {
    const { currentTheme, installedThemes, setTheme } = useThemeStore();
    const { player } = usePlayerStore();
    const colors = currentTheme.colors;

    const [focusedItem, setFocusedItem] = useState('settings');

    const handleFocusItem = useCallback((id: string) => {
        setFocusedItem(id);
    }, []);

    const handleThemeSelect = useCallback((themeId: string) => {
        setTheme(themeId);
    }, [setTheme]);

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
                    isFocused={focusedItem === 'home'}
                    onFocus={handleFocusItem}
                    colors={colors}
                />
                <TVMenuButton
                    id="search"
                    icon="search"
                    label="Buscar"
                    onPress={() => navigation.navigate('TVSearch')}
                    isFocused={focusedItem === 'search'}
                    onFocus={handleFocusItem}
                    colors={colors}
                />
                <TVMenuButton
                    id="library"
                    icon="library"
                    label="Biblioteca"
                    onPress={() => navigation.navigate('TVLibrary')}
                    isFocused={focusedItem === 'library'}
                    onFocus={handleFocusItem}
                    colors={colors}
                />
                <TVMenuButton
                    id="settings"
                    icon="settings"
                    label="Temas"
                    onPress={() => { }}
                    isFocused={focusedItem === 'settings'}
                    onFocus={handleFocusItem}
                    colors={colors}
                    hasTVPreferredFocus={true}
                />

                {player.currentSong && (
                    <View style={{ marginTop: 'auto', marginBottom: 20 }}>
                        <TVMenuButton
                            id="player"
                            icon="play-circle"
                            label="Reproduciendo"
                            onPress={() => navigation.navigate('TVPlayer')}
                            isFocused={focusedItem === 'player'}
                            onFocus={handleFocusItem}
                            colors={colors}
                        />
                    </View>
                )}
            </View>

            <View style={styles.mainContent}>
                <Text style={[styles.title, { color: colors.text }]}>Temas de la aplicación</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Selecciona un tema para cambiar la apariencia de la pantalla de reproducción y la interfaz.</Text>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={styles.themeList}>
                        {installedThemes.map((theme) => (
                            <FocusableThemeItem
                                key={theme.id}
                                theme={theme}
                                isSelected={currentTheme.id === theme.id}
                                isFocused={focusedItem === `theme-${theme.id}`}
                                onFocus={handleFocusItem}
                                onPress={() => handleThemeSelect(theme.id)}
                                colors={colors}
                            />
                        ))}
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </View>
    );
};

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
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 40,
    },
    themeList: {
        marginTop: 10,
        gap: 15,
    },
    themeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    themeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    colorPreview: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 20,
    },
    themeItemName: {
        fontSize: 24,
        fontWeight: '600',
    },
});

export default TVSettingsScreen;
