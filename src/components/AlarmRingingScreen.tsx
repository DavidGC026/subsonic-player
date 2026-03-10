import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlarmStore, usePlayerStore, useThemeStore } from '../store';
import { subsonicApi } from '../api/subsonic';
import { AnimatedBackground } from './AnimatedBackground';
import type { Alarm } from '../store/alarmStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AlarmRingingScreen: React.FC = () => {
    const isRinging = useAlarmStore(state => state.isRinging);
    const dismissAlarm = useAlarmStore(state => state.dismissAlarm);
    const snoozeAlarm = useAlarmStore(state => state.snoozeAlarm);
    const triggeredAlarmId = useAlarmStore(state => state.triggeredAlarmId);
    const alarms = useAlarmStore(state => state.alarms);
    const currentSong = usePlayerStore(state => state.player.currentSong);
    const { currentTheme } = useThemeStore();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [localSnoozeMinutes, setLocalSnoozeMinutes] = useState(5);

    // Find the triggered alarm to get its config
    const triggeredAlarm: Alarm | undefined = useMemo(() => {
        if (!triggeredAlarmId) return undefined;
        return alarms.find(a => a.id === triggeredAlarmId);
    }, [triggeredAlarmId, alarms]);

    useEffect(() => {
        if (triggeredAlarm?.snoozeMinutes) {
            setLocalSnoozeMinutes(triggeredAlarm.snoozeMinutes);
        }
    }, [triggeredAlarm]);

    useEffect(() => {
        if (!isRinging) return;
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, [isRinging]);

    const timeString = useMemo(() => {
        const hours = currentTime.getHours().toString().padStart(2, '0');
        const minutes = currentTime.getMinutes().toString().padStart(2, '0');
        return { hours, minutes };
    }, [currentTime]);

    const dateString = useMemo(() => {
        const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const day = days[currentTime.getDay()];
        const month = months[currentTime.getMonth()];
        const date = currentTime.getDate().toString().padStart(2, '0');
        return `${day}, ${month} ${date}`;
    }, [currentTime]);

    const coverArtUrl = useMemo(() => {
        if (currentSong?.coverArt) {
            return subsonicApi.getCoverArtUrl(currentSong.coverArt, 600);
        }
        return null;
    }, [currentSong]);

    const handleDismiss = () => {
        dismissAlarm();
    };

    const handleSnooze = () => {
        snoozeAlarm();
    };

    const colors = currentTheme.colors;
    const hasAnimatedBg = !!currentTheme.flags?.animatedBackground;

    if (!isRinging) return null;

    return (
        <Modal
            visible={isRinging}
            animationType="fade"
            transparent={false}
            onRequestClose={handleDismiss}
        >
            <View style={[styles.container, { backgroundColor: colors.black }]}>
                {/* Animated background if theme has one */}
                {hasAnimatedBg && currentTheme.flags?.animatedBackground && (
                    <View style={StyleSheet.absoluteFill}>
                        <AnimatedBackground {...currentTheme.flags.animatedBackground} />
                    </View>
                )}

                {/* Dark overlay for readability */}
                <View style={[StyleSheet.absoluteFill, styles.overlay]} />

                {/* Content */}
                <View style={styles.content}>
                    {/* Time Display */}
                    <View style={styles.timeContainer}>
                        <Text style={[styles.timeText, { color: colors.text }]}>
                            {timeString.hours}
                        </Text>
                        <Text style={[styles.timeText, { color: colors.text }]}>
                            {timeString.minutes}
                        </Text>
                    </View>

                    {/* Date */}
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                        {dateString}
                    </Text>

                    {/* Alarm label */}
                    <Text style={[styles.alarmLabel, { color: colors.textSecondary }]}>
                        {triggeredAlarm?.name || 'Alarma'}
                    </Text>

                    {/* Album Art */}
                    {coverArtUrl && (
                        <View style={styles.albumArtContainer}>
                            <Image
                                source={{ uri: coverArtUrl }}
                                style={styles.albumArt}
                                blurRadius={0}
                            />
                            {/* Song info overlay */}
                            <View style={styles.songInfoOverlay}>
                                <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
                                    {currentSong?.title}
                                </Text>
                                <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {currentSong?.artist}
                                </Text>
                            </View>
                        </View>
                    )}

                    {!coverArtUrl && (
                        <View style={styles.albumArtContainer}>
                            <View style={[styles.albumArtPlaceholder, { backgroundColor: colors.surface }]}>
                                <Ionicons name="musical-notes" size={80} color={colors.primary} />
                            </View>
                        </View>
                    )}

                    {/* Dismiss button (X) */}
                    <TouchableOpacity
                        style={[styles.dismissButton, { borderColor: colors.textSecondary + '60' }]}
                        onPress={handleDismiss}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={32} color={colors.text} />
                    </TouchableOpacity>

                    {/* Snooze control */}
                    {(triggeredAlarm?.snoozeEnabled !== false) && (
                        <View style={styles.snoozeContainer}>
                            <TouchableOpacity
                                style={[styles.snoozeAdjustBtn, { borderColor: colors.textSecondary + '40' }]}
                                onPress={() => setLocalSnoozeMinutes(Math.max(1, localSnoozeMinutes - 1))}
                            >
                                <Ionicons name="remove" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.snoozeMainBtn, { backgroundColor: colors.surface + '80' }]}
                                onPress={handleSnooze}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.snoozeText, { color: colors.text }]}>
                                    Aplazar {localSnoozeMinutes} min
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.snoozeAdjustBtn, { borderColor: colors.textSecondary + '40' }]}
                                onPress={() => setLocalSnoozeMinutes(Math.min(30, localSnoozeMinutes + 1))}
                            >
                                <Ionicons name="add" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Mute icon */}
                    <TouchableOpacity style={styles.muteButton} onPress={() => {/* toggle mute */ }}>
                        <Ionicons name="volume-mute-outline" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },

    // Time
    timeContainer: {
        alignItems: 'center',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 96,
        fontWeight: '100',
        lineHeight: 104,
        letterSpacing: 4,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '400',
        marginBottom: 4,
    },
    alarmLabel: {
        fontSize: 16,
        fontWeight: '400',
        marginBottom: 32,
    },

    // Album art
    albumArtContainer: {
        marginBottom: 40,
        alignItems: 'center',
    },
    albumArt: {
        width: SCREEN_WIDTH * 0.45,
        height: SCREEN_WIDTH * 0.45,
        borderRadius: 20,
    },
    albumArtPlaceholder: {
        width: SCREEN_WIDTH * 0.45,
        height: SCREEN_WIDTH * 0.45,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    songInfoOverlay: {
        marginTop: 12,
        alignItems: 'center',
    },
    songTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    songArtist: {
        fontSize: 14,
        marginTop: 2,
    },

    // Dismiss
    dismissButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },

    // Snooze
    snoozeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    snoozeAdjustBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    snoozeMainBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    snoozeText: {
        fontSize: 15,
        fontWeight: '500',
    },

    // Mute
    muteButton: {
        padding: 8,
    },
});
