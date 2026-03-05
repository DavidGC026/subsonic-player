import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, useAlarmStore, useLibraryStore } from '../store';
import { ThemeIcon } from './ThemeIcon';

interface AlarmModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({ visible, onClose }) => {
    const { currentTheme } = useThemeStore();
    const { config, setAlarm, cancelAlarm } = useAlarmStore();
    const { playlists, fetchPlaylists } = useLibraryStore();

    const [hours, setHours] = useState('06');
    const [minutes, setMinutes] = useState('30');

    // What to play
    const [selectedMode, setSelectedMode] = useState<'all_random' | 'playlist' | 'song'>('all_random');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>();

    useEffect(() => {
        if (visible) {
            fetchPlaylists();
            if (config.isActive && config.timeMs) {
                const d = new Date(config.timeMs);
                setHours(d.getHours().toString().padStart(2, '0'));
                setMinutes(d.getMinutes().toString().padStart(2, '0'));
                setSelectedMode(config.mode);
                setSelectedPlaylistId(config.playlistId);
            }
        }
    }, [visible]);

    const handleSave = () => {
        const now = new Date();
        const target = new Date();
        target.setHours(parseInt(hours, 10));
        target.setMinutes(parseInt(minutes, 10));
        target.setSeconds(0);
        target.setMilliseconds(0);

        // If the time already passed today, set it for tomorrow
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }

        setAlarm(target.getTime(), selectedMode, selectedPlaylistId);
        onClose();
    };

    const handleCancelAlarm = () => {
        cancelAlarm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Alarma Musical</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent}>

                        {/* TIME PICKER */}
                        <View style={styles.timePickerContainer}>
                            <TextInput
                                style={[styles.timeInput, { color: currentTheme.colors.text, borderColor: currentTheme.colors.surface }]}
                                keyboardType="numeric"
                                maxLength={2}
                                value={hours}
                                onChangeText={(val) => setHours(val.replace(/[^0-9]/g, ''))}
                                onBlur={() => {
                                    let h = parseInt(hours || '0', 10);
                                    if (h > 23) h = 23;
                                    setHours(h.toString().padStart(2, '0'));
                                }}
                            />
                            <Text style={[styles.timeColon, { color: currentTheme.colors.text }]}>:</Text>
                            <TextInput
                                style={[styles.timeInput, { color: currentTheme.colors.text, borderColor: currentTheme.colors.surface }]}
                                keyboardType="numeric"
                                maxLength={2}
                                value={minutes}
                                onChangeText={(val) => setMinutes(val.replace(/[^0-9]/g, ''))}
                                onBlur={() => {
                                    let m = parseInt(minutes || '0', 10);
                                    if (m > 59) m = 59;
                                    setMinutes(m.toString().padStart(2, '0'));
                                }}
                            />
                        </View>
                        <Text style={{ textAlign: 'center', color: currentTheme.colors.textSecondary, marginBottom: 24 }}>
                            Formato 24 horas (ej. 06:30 o 22:15)
                        </Text>

                        {/* WHAT TO PLAY */}
                        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>¿Qué deseas escuchar?</Text>

                        <TouchableOpacity
                            style={[
                                styles.optionRow,
                                { backgroundColor: selectedMode === 'all_random' ? currentTheme.colors.primary + '33' : currentTheme.colors.surface }
                            ]}
                            onPress={() => setSelectedMode('all_random')}
                        >
                            <Ionicons name="shuffle" size={24} color={selectedMode === 'all_random' ? currentTheme.colors.primary : currentTheme.colors.text} />
                            <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Toda la música (Aleatorio)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.optionRow,
                                { backgroundColor: selectedMode === 'playlist' ? currentTheme.colors.primary + '33' : currentTheme.colors.surface }
                            ]}
                            onPress={() => setSelectedMode('playlist')}
                        >
                            <Ionicons name="list" size={24} color={selectedMode === 'playlist' ? currentTheme.colors.primary : currentTheme.colors.text} />
                            <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Una Playlist específica</Text>
                        </TouchableOpacity>

                        {selectedMode === 'playlist' && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playlistScroll}>
                                {playlists.map(pl => (
                                    <TouchableOpacity
                                        key={pl.id}
                                        style={[
                                            styles.playlistChip,
                                            {
                                                backgroundColor: selectedPlaylistId === pl.id ? currentTheme.colors.primary : currentTheme.colors.surface,
                                            }
                                        ]}
                                        onPress={() => setSelectedPlaylistId(pl.id)}
                                    >
                                        <Text style={{ color: selectedPlaylistId === pl.id ? currentTheme.colors.background : currentTheme.colors.text }}>
                                            {pl.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {/* STATUS & CANCEL */}
                        {config.isActive && (
                            <View style={styles.activeStatusContainer}>
                                <Ionicons name="alarm" size={20} color={currentTheme.colors.primary} />
                                <Text style={{ color: currentTheme.colors.primary, marginLeft: 8, flex: 1 }}>
                                    Alarma activa para las {new Date(config.timeMs || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}

                    </ScrollView>

                    <View style={styles.footer}>
                        {config.isActive ? (
                            <TouchableOpacity
                                style={[styles.footerButton, { backgroundColor: '#FF4444' }]}
                                onPress={handleCancelAlarm}
                            >
                                <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Desactivar</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flex: 1 }} />
                        )}

                        <TouchableOpacity
                            style={[styles.footerButton, { backgroundColor: currentTheme.colors.primary, marginLeft: 16 }]}
                            onPress={handleSave}
                        >
                            <Text style={[styles.footerButtonText, { color: currentTheme.colors.background }]}>Guardar Alarma</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: '60%',
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    timePickerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    timeInput: {
        fontSize: 48,
        fontWeight: 'bold',
        textAlign: 'center',
        borderWidth: 2,
        borderRadius: 16,
        padding: 16,
        width: 100,
    },
    timeColon: {
        fontSize: 48,
        fontWeight: 'bold',
        marginHorizontal: 16,
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 16,
    },
    playlistScroll: {
        marginBottom: 24,
        marginLeft: 8,
    },
    playlistChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
    },
    activeStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00000020',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 20,
    },
    footer: {
        flexDirection: 'row',
        padding: 24,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: '#ffffff20',
    },
    footerButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
