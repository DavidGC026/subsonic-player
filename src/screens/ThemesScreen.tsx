import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, Theme, defaultTheme } from '../store';

interface ThemesScreenProps {
    navigation?: any;
}

export const ThemesScreen: React.FC<ThemesScreenProps> = ({ navigation }) => {
    const { currentTheme, installedThemes, setTheme, installTheme, deleteTheme } = useThemeStore();
    const [themeUrl, setThemeUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadTheme = async () => {
        if (!themeUrl.trim()) return;

        setIsDownloading(true);
        try {
            const response = await fetch(themeUrl.trim());
            const themeData = await response.json();

            // Basic validation
            if (!themeData.id || !themeData.name || !themeData.colors) {
                throw new Error('El formato del tema no es válido.');
            }

            installTheme(themeData as Theme);
            setThemeUrl('');
            Alert.alert('Éxito', 'Tema descargado e instalado correctamente.');
        } catch (error) {
            console.error('Error downloading theme:', error);
            Alert.alert('Error', 'No se pudo descargar el tema. Verifica la URL y el formato.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDeleteTheme = (themeId: string) => {
        Alert.alert(
            'Eliminar Tema',
            '¿Estás seguro de que quieres eliminar este tema?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deleteTheme(themeId)
                },
            ]
        );
    };

    const renderThemeItem = ({ item }: { item: Theme }) => {
        const isSelected = item.id === currentTheme.id;
        const isDefault = item.id === defaultTheme.id;

        return (
            <TouchableOpacity
                style={[
                    styles.themeItem,
                    { backgroundColor: currentTheme.colors.surface },
                    isSelected && { borderColor: currentTheme.colors.primary, borderWidth: 2 }
                ]}
                onPress={() => setTheme(item.id)}
            >
                <View style={styles.themeInfo}>
                    <View style={styles.colorPreviewContainer}>
                        <View style={[styles.colorPreview, { backgroundColor: item.colors.background }]} />
                        <View style={[styles.colorPreview, { backgroundColor: item.colors.surface }]} />
                        <View style={[styles.colorPreview, { backgroundColor: item.colors.primary }]} />
                    </View>
                    <Text style={[styles.themeName, { color: currentTheme.colors.text }]}>
                        {item.name}
                    </Text>
                </View>

                <View style={styles.themeActions}>
                    {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={currentTheme.colors.primary} style={styles.checkIcon} />
                    )}
                    {!isDefault && !isSelected && (
                        <TouchableOpacity onPress={() => handleDeleteTheme(item.id)} style={styles.deleteButton}>
                            <Ionicons name="trash-outline" size={20} color={currentTheme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
                    <Ionicons name="arrow-back" size={28} color={currentTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>Temas</Text>
            </View>

            <FlatList
                data={installedThemes}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderThemeItem}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <>
                        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
                            Temas Instalados
                        </Text>
                    </>
                }
                ListFooterComponent={
                    <View style={styles.downloadContainer}>
                        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
                            Descargar Tema
                        </Text>
                        <Text style={[styles.downloadDescription, { color: currentTheme.colors.textSecondary }]}>
                            Ingresa la URL de un archivo JSON que contenga la configuración de un tema.
                        </Text>
                        <View style={[styles.inputRow, { backgroundColor: currentTheme.colors.surface }]}>
                            <Ionicons name="link" size={20} color={currentTheme.colors.textSecondary} />
                            <TextInput
                                style={[styles.input, { color: currentTheme.colors.text }]}
                                placeholder="https://ejemplo.com/tema.json"
                                placeholderTextColor={currentTheme.colors.textSecondary}
                                value={themeUrl}
                                onChangeText={setThemeUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.downloadButton,
                                { backgroundColor: currentTheme.colors.primary },
                                (!themeUrl.trim() || isDownloading) && { opacity: 0.5 }
                            ]}
                            onPress={handleDownloadTheme}
                            disabled={!themeUrl.trim() || isDownloading}
                        >
                            <Text style={[styles.downloadButtonText, { color: currentTheme.colors.black }]}>
                                {isDownloading ? 'Descargando...' : 'Descargar e Instalar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
    },
    backButton: {
        padding: 8,
        marginRight: 16,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        marginTop: 8,
    },
    themeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    themeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    colorPreviewContainer: {
        flexDirection: 'row',
        marginRight: 16,
        borderRadius: 4,
        overflow: 'hidden',
    },
    colorPreview: {
        width: 16,
        height: 32,
    },
    themeName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    themeActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkIcon: {
        marginLeft: 8,
    },
    deleteButton: {
        padding: 8,
        marginLeft: 8,
    },
    downloadContainer: {
        marginTop: 32,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 32,
    },
    downloadDescription: {
        fontSize: 14,
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 16,
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    downloadButton: {
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
    },
    downloadButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ThemesScreen;
