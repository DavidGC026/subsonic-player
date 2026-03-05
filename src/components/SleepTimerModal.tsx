import React, { useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store';
import { useSleepTimerStore } from '../store/sleepTimerStore';

interface SleepTimerModalProps {
    visible: boolean;
    onClose: () => void;
}

const TIMER_OPTIONS = [
    { label: '5 min', minutes: 5, icon: 'time-outline' as const },
    { label: '10 min', minutes: 10, icon: 'time-outline' as const },
    { label: '15 min', minutes: 15, icon: 'time-outline' as const },
    { label: '30 min', minutes: 30, icon: 'time-outline' as const },
    { label: '45 min', minutes: 45, icon: 'time-outline' as const },
    { label: '1 hora', minutes: 60, icon: 'moon-outline' as const },
    { label: '1.5 h', minutes: 90, icon: 'moon-outline' as const },
    { label: '2 horas', minutes: 120, icon: 'moon-outline' as const },
];

const formatRemaining = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ visible, onClose }) => {
    const { currentTheme } = useThemeStore();
    const {
        remainingSeconds,
        isActive,
        finishCurrentSong,
        waitingForSongEnd,
        startTimer,
        cancelTimer,
        toggleFinishCurrentSong,
    } = useSleepTimerStore();

    const colors = currentTheme.colors;
    const isGlassmorphism = currentTheme.flags?.useGlassmorphism;

    const handleSelectTime = useCallback((minutes: number) => {
        startTimer(minutes);
        onClose();
    }, [startTimer, onClose]);

    const handleCancel = useCallback(() => {
        cancelTimer();
        onClose();
    }, [cancelTimer, onClose]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={[
                        styles.container,
                        {
                            backgroundColor: isGlassmorphism
                                ? 'rgba(30, 30, 30, 0.92)'
                                : colors.surface,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="moon" size={24} color={colors.primary} />
                            <Text style={[styles.title, { color: colors.text }]}>
                                Temporizador de sueño
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Active timer status */}
                    {isActive && (
                        <View style={[styles.activeContainer, { backgroundColor: `${colors.primary}15` }]}>
                            <View style={styles.activeInfo}>
                                <Ionicons
                                    name={waitingForSongEnd ? 'hourglass' : 'timer'}
                                    size={32}
                                    color={colors.primary}
                                />
                                <View style={styles.activeTextContainer}>
                                    {waitingForSongEnd ? (
                                        <>
                                            <Text style={[styles.activeTitle, { color: colors.primary }]}>
                                                Esperando fin de canción…
                                            </Text>
                                            <Text style={[styles.activeSubtitle, { color: colors.textSecondary }]}>
                                                La música se detendrá al terminar la canción actual
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={[styles.activeTitle, { color: colors.primary }]}>
                                                Tiempo restante
                                            </Text>
                                            <Text style={[styles.remainingTime, { color: colors.text }]}>
                                                {formatRemaining(remainingSeconds)}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.cancelButton, { borderColor: colors.primary }]}
                                onPress={handleCancel}
                            >
                                <Ionicons name="close-circle" size={18} color={colors.primary} />
                                <Text style={[styles.cancelText, { color: colors.primary }]}>
                                    Cancelar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Timer options grid */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        {isActive ? 'Cambiar tiempo' : 'Apagar música en…'}
                    </Text>
                    <View style={styles.optionsGrid}>
                        {TIMER_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.minutes}
                                style={[
                                    styles.optionButton,
                                    {
                                        backgroundColor: `${colors.primary}12`,
                                        borderColor: `${colors.primary}30`,
                                    },
                                ]}
                                onPress={() => handleSelectTime(option.minutes)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={option.icon}
                                    size={22}
                                    color={colors.primary}
                                    style={styles.optionIcon}
                                />
                                <Text style={[styles.optionLabel, { color: colors.text }]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Finish current song toggle */}
                    <TouchableOpacity
                        style={[styles.toggleRow, { borderTopColor: `${colors.textSecondary}20` }]}
                        onPress={toggleFinishCurrentSong}
                        activeOpacity={0.7}
                    >
                        <View style={styles.toggleLeft}>
                            <Ionicons
                                name="musical-note"
                                size={20}
                                color={colors.textSecondary}
                            />
                            <Text style={[styles.toggleLabel, { color: colors.text }]}>
                                Terminar canción actual
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.toggleSwitch,
                                {
                                    backgroundColor: finishCurrentSong
                                        ? colors.primary
                                        : `${colors.textSecondary}40`,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.toggleThumb,
                                    finishCurrentSong && styles.toggleThumbActive,
                                ]}
                            />
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OPTION_SIZE = (SCREEN_WIDTH - 48 - 36) / 4; // 4 columns with gaps

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    activeContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    activeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 12,
    },
    activeTextContainer: {
        flex: 1,
    },
    activeTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    activeSubtitle: {
        fontSize: 12,
    },
    remainingTime: {
        fontSize: 28,
        fontWeight: '300',
        fontVariant: ['tabular-nums'],
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    cancelText: {
        fontSize: 13,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    optionButton: {
        width: OPTION_SIZE,
        aspectRatio: 1,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    optionIcon: {
        marginBottom: 6,
    },
    optionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTopWidth: 1,
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    toggleSwitch: {
        width: 48,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    toggleThumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fff',
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
});

export default SleepTimerModal;
