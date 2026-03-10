import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Switch,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, useAlarmStore, useLibraryStore } from '../store';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface AlarmModalProps {
    visible: boolean;
    onClose: () => void;
}

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAY_FULL_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Generate arrays for scroll pickers
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const WheelPicker: React.FC<{
    data: number[];
    selectedIndex: number;
    onValueChange: (index: number) => void;
    formatValue?: (val: number) => string;
    primaryColor: string;
    textColor: string;
    textSecondaryColor: string;
}> = ({ data, selectedIndex, onValueChange, formatValue, primaryColor, textColor, textSecondaryColor }) => {
    const scrollRef = useRef<ScrollView>(null);
    const [currentIndex, setCurrentIndex] = useState(selectedIndex);

    useEffect(() => {
        // Scroll to initial position after mount
        setTimeout(() => {
            scrollRef.current?.scrollTo({
                y: selectedIndex * ITEM_HEIGHT,
                animated: false,
            });
        }, 150);
    }, []);

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
        setCurrentIndex(clampedIndex);
    }, [data.length]);

    const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
        setCurrentIndex(clampedIndex);
        onValueChange(clampedIndex);
    }, [data.length, onValueChange]);

    return (
        <View style={[styles.wheelContainer, { height: PICKER_HEIGHT }]}>
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                nestedScrollEnabled={true}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                contentContainerStyle={{
                    paddingVertical: ITEM_HEIGHT * 2, // 2 items of padding top and bottom
                }}
            >
                {data.map((item, index) => {
                    const isSelected = index === currentIndex;
                    const distance = Math.abs(index - currentIndex);
                    const displayValue = formatValue ? formatValue(item) : item.toString();
                    const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.15;

                    return (
                        <View key={index} style={[styles.wheelItem, { height: ITEM_HEIGHT }]}>
                            <Text
                                style={[
                                    styles.wheelItemText,
                                    {
                                        color: isSelected ? primaryColor : textSecondaryColor,
                                        opacity,
                                        fontSize: isSelected ? 56 : distance === 1 ? 36 : 28,
                                        fontWeight: isSelected ? '200' : '300',
                                    },
                                ]}
                            >
                                {displayValue}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

export const AlarmModal: React.FC<AlarmModalProps> = ({ visible, onClose }) => {
    const { currentTheme } = useThemeStore();
    const { config, setAlarm, cancelAlarm } = useAlarmStore();
    const { playlists, fetchPlaylists } = useLibraryStore();
    const customPlaylistImages = useLibraryStore(state => state.customPlaylistImages);

    // Time state in 12h format
    const [selectedHourIndex, setSelectedHourIndex] = useState(5); // 6 (index 5 = hour 6)
    const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(30);
    const [isAM, setIsAM] = useState(true);

    // Days of week
    const [selectedDays, setSelectedDays] = useState<boolean[]>([false, true, true, true, true, true, false]);

    // Alarm name
    const [alarmName, setAlarmName] = useState('');

    // Sound mode
    const [selectedMode, setSelectedMode] = useState<'all_random' | 'playlist' | 'song'>('all_random');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>();
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Snooze
    const [snoozeEnabled, setSnoozeEnabled] = useState(true);
    const [snoozeMinutes, setSnoozeMinutes] = useState(5);

    // Vibration
    const [vibrationEnabled, setVibrationEnabled] = useState(true);

    useEffect(() => {
        if (visible) {
            fetchPlaylists();
            if (config.isActive && config.timeMs) {
                const d = new Date(config.timeMs);
                let hours = d.getHours();
                const minutes = d.getMinutes();
                const am = hours < 12;
                if (hours === 0) hours = 12;
                else if (hours > 12) hours -= 12;
                setSelectedHourIndex(hours - 1);
                setSelectedMinuteIndex(minutes);
                setIsAM(am);
                setSelectedMode(config.mode);
                setSelectedPlaylistId(config.playlistId);
            }
        }
    }, [visible]);

    const handleSave = () => {
        const now = new Date();
        const target = new Date();
        let hours24 = HOURS[selectedHourIndex];
        if (isAM) {
            if (hours24 === 12) hours24 = 0; // 12 AM = 0
        } else {
            if (hours24 !== 12) hours24 += 12; // PM, except 12 PM stays 12
        }
        target.setHours(hours24);
        target.setMinutes(MINUTES[selectedMinuteIndex]);
        target.setSeconds(0);
        target.setMilliseconds(0);

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

    const toggleDay = (index: number) => {
        const newDays = [...selectedDays];
        newDays[index] = !newDays[index];
        setSelectedDays(newDays);
    };

    const getSelectedDaysText = () => {
        const activeDays = selectedDays.map((active, i) => active ? DAY_FULL_LABELS[i] : null).filter(Boolean);
        if (activeDays.length === 0) return 'Una sola vez';
        if (activeDays.length === 7) return 'Todos los días';
        if (activeDays.length === 5 && selectedDays[0] === false && selectedDays[6] === false) return 'Cada Lun, Mar, Mié, Jue, Vie';
        if (activeDays.length === 2 && selectedDays[0] === true && selectedDays[6] === true) return 'Fines de semana';
        return `Cada ${activeDays.join(', ')}`;
    };

    const getModeLabel = () => {
        if (selectedMode === 'all_random') return 'Toda la música (Aleatorio)';
        if (selectedMode === 'playlist' && selectedPlaylistId) {
            const pl = playlists.find(p => p.id === selectedPlaylistId);
            return pl ? pl.name : 'Seleccionar playlist';
        }
        return 'Seleccionar playlist';
    };

    const colors = currentTheme.colors;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={[styles.fullScreenContainer, { backgroundColor: colors.black }]}>
                {/* Top buttons */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={[styles.topBarText, { color: colors.textSecondary }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={[styles.topBarText, { color: colors.primary }]}>Guardar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContentContainer}
                >
                    {/* Time Picker Area */}
                    <View style={styles.timePickerArea}>
                        <View style={styles.timePickerRow}>
                            {/* Hour wheel */}
                            <WheelPicker
                                data={HOURS}
                                selectedIndex={selectedHourIndex}
                                onValueChange={setSelectedHourIndex}
                                formatValue={(v) => v.toString()}
                                primaryColor={colors.primary}
                                textColor={colors.text}
                                textSecondaryColor={colors.textSecondary}
                            />
                            <Text style={[styles.colonText, { color: colors.text }]}>:</Text>
                            {/* Minute wheel */}
                            <WheelPicker
                                data={MINUTES}
                                selectedIndex={selectedMinuteIndex}
                                onValueChange={setSelectedMinuteIndex}
                                formatValue={(v) => v.toString().padStart(2, '0')}
                                primaryColor={colors.primary}
                                textColor={colors.text}
                                textSecondaryColor={colors.textSecondary}
                            />
                            {/* AM/PM Toggle */}
                            <View style={styles.ampmContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.ampmButton,
                                        isAM && { backgroundColor: colors.primary + '22' },
                                    ]}
                                    onPress={() => setIsAM(true)}
                                >
                                    <Text style={[
                                        styles.ampmText,
                                        { color: isAM ? colors.primary : colors.textSecondary },
                                        isAM && styles.ampmTextActive,
                                    ]}>a.m.</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.ampmButton,
                                        !isAM && { backgroundColor: colors.primary + '22' },
                                    ]}
                                    onPress={() => setIsAM(false)}
                                >
                                    <Text style={[
                                        styles.ampmText,
                                        { color: !isAM ? colors.primary : colors.textSecondary },
                                        !isAM && styles.ampmTextActive,
                                    ]}>p.m.</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Settings Card */}
                    <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
                        {/* Days selector */}
                        <View style={styles.settingSection}>
                            <View style={styles.settingRowSpaced}>
                                <Text style={[styles.daysText, { color: colors.textSecondary }]}>
                                    {getSelectedDaysText()}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.daysRow}>
                                {DAY_LABELS.map((label, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dayChip,
                                            selectedDays[index]
                                                ? { backgroundColor: colors.primary }
                                                : { backgroundColor: 'transparent' },
                                        ]}
                                        onPress={() => toggleDay(index)}
                                    >
                                        <Text style={[
                                            styles.dayChipText,
                                            {
                                                color: selectedDays[index] ? colors.black : (index === 0 ? '#FF6B6B' : colors.textSecondary),
                                                fontWeight: selectedDays[index] ? '700' : '500',
                                            },
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.black + '40' }]} />

                        {/* Alarm name */}
                        <View style={styles.settingSection}>
                            <TextInput
                                style={[styles.nameInput, { color: colors.text, borderBottomColor: colors.textSecondary + '40' }]}
                                placeholder="Nombre de alarma"
                                placeholderTextColor={colors.textSecondary}
                                value={alarmName}
                                onChangeText={setAlarmName}
                            />
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.black + '40' }]} />

                        {/* Music selection - replaces "Sonido de alarma" */}
                        <View style={styles.settingSection}>
                            <View style={styles.settingRowSpaced}>
                                <View>
                                    <Text style={[styles.settingLabel, { color: colors.text }]}>Música de alarma</Text>
                                    <Text style={[styles.settingSubLabel, { color: colors.primary }]}>
                                        {getModeLabel()}
                                    </Text>
                                </View>
                                <Switch
                                    value={soundEnabled}
                                    onValueChange={setSoundEnabled}
                                    thumbColor={soundEnabled ? colors.primary : '#888'}
                                    trackColor={{ false: '#555', true: colors.primary + '55' }}
                                />
                            </View>

                            {soundEnabled && (
                                <View style={styles.musicOptions}>
                                    {/* All Random option */}
                                    <TouchableOpacity
                                        style={[
                                            styles.musicOptionRow,
                                            {
                                                backgroundColor: selectedMode === 'all_random' ? colors.primary + '20' : 'transparent',
                                                borderColor: selectedMode === 'all_random' ? colors.primary : colors.textSecondary + '30',
                                            },
                                        ]}
                                        onPress={() => setSelectedMode('all_random')}
                                    >
                                        <View style={[styles.musicOptionIcon, { backgroundColor: colors.primary + '22' }]}>
                                            <Ionicons name="shuffle" size={20} color={colors.primary} />
                                        </View>
                                        <View style={styles.musicOptionInfo}>
                                            <Text style={[styles.musicOptionTitle, { color: colors.text }]}>Aleatorio</Text>
                                            <Text style={[styles.musicOptionSub, { color: colors.textSecondary }]}>Toda tu música</Text>
                                        </View>
                                        {selectedMode === 'all_random' && (
                                            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>

                                    {/* Playlist option */}
                                    <TouchableOpacity
                                        style={[
                                            styles.musicOptionRow,
                                            {
                                                backgroundColor: selectedMode === 'playlist' ? colors.primary + '20' : 'transparent',
                                                borderColor: selectedMode === 'playlist' ? colors.primary : colors.textSecondary + '30',
                                            },
                                        ]}
                                        onPress={() => setSelectedMode('playlist')}
                                    >
                                        <View style={[styles.musicOptionIcon, { backgroundColor: colors.primary + '22' }]}>
                                            <Ionicons name="list" size={20} color={colors.primary} />
                                        </View>
                                        <View style={styles.musicOptionInfo}>
                                            <Text style={[styles.musicOptionTitle, { color: colors.text }]}>Playlist</Text>
                                            <Text style={[styles.musicOptionSub, { color: colors.textSecondary }]}>Selecciona una playlist</Text>
                                        </View>
                                        {selectedMode === 'playlist' && (
                                            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>

                                    {/* Playlist selection grid */}
                                    {selectedMode === 'playlist' && playlists.length > 0 && (
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={styles.playlistScrollRow}
                                            contentContainerStyle={styles.playlistScrollContent}
                                        >
                                            {playlists.map(pl => (
                                                <TouchableOpacity
                                                    key={pl.id}
                                                    style={[
                                                        styles.playlistCard,
                                                        {
                                                            borderColor: selectedPlaylistId === pl.id ? colors.primary : 'transparent',
                                                            backgroundColor: colors.black + '60',
                                                        },
                                                    ]}
                                                    onPress={() => setSelectedPlaylistId(pl.id)}
                                                >
                                                    {customPlaylistImages[pl.id] ? (
                                                        <Image
                                                            source={{ uri: customPlaylistImages[pl.id] }}
                                                            style={styles.playlistCardImage}
                                                        />
                                                    ) : (
                                                        <View style={[styles.playlistCardPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                                            <Ionicons name="musical-notes" size={24} color={colors.primary} />
                                                        </View>
                                                    )}
                                                    <Text
                                                        style={[styles.playlistCardName, { color: selectedPlaylistId === pl.id ? colors.primary : colors.text }]}
                                                        numberOfLines={2}
                                                    >
                                                        {pl.name}
                                                    </Text>
                                                    {selectedPlaylistId === pl.id && (
                                                        <View style={[styles.playlistCardCheck, { backgroundColor: colors.primary }]}>
                                                            <Ionicons name="checkmark" size={12} color={colors.black} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.black + '40' }]} />

                        {/* Vibration */}
                        <View style={styles.settingSection}>
                            <View style={styles.settingRowSpaced}>
                                <View>
                                    <Text style={[styles.settingLabel, { color: colors.text }]}>Vibración</Text>
                                    <Text style={[styles.settingSubLabel, { color: colors.primary }]}>Patrón suave</Text>
                                </View>
                                <Switch
                                    value={vibrationEnabled}
                                    onValueChange={setVibrationEnabled}
                                    thumbColor={vibrationEnabled ? colors.primary : '#888'}
                                    trackColor={{ false: '#555', true: colors.primary + '55' }}
                                />
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.black + '40' }]} />

                        {/* Snooze */}
                        <View style={styles.settingSection}>
                            <View style={styles.settingRowSpaced}>
                                <View>
                                    <Text style={[styles.settingLabel, { color: colors.text }]}>Aplazar</Text>
                                    <Text style={[styles.settingSubLabel, { color: colors.primary }]}>
                                        {snoozeMinutes} minutos, 3 veces
                                    </Text>
                                </View>
                                <Switch
                                    value={snoozeEnabled}
                                    onValueChange={setSnoozeEnabled}
                                    thumbColor={snoozeEnabled ? colors.primary : '#888'}
                                    trackColor={{ false: '#555', true: colors.primary + '55' }}
                                />
                            </View>
                            {snoozeEnabled && (
                                <View style={styles.snoozeAdjust}>
                                    <TouchableOpacity
                                        style={[styles.snoozeBtn, { borderColor: colors.textSecondary + '40' }]}
                                        onPress={() => setSnoozeMinutes(Math.max(1, snoozeMinutes - 1))}
                                    >
                                        <Ionicons name="remove" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                    <Text style={[styles.snoozeValue, { color: colors.text }]}>
                                        {snoozeMinutes} min
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.snoozeBtn, { borderColor: colors.textSecondary + '40' }]}
                                        onPress={() => setSnoozeMinutes(Math.min(30, snoozeMinutes + 1))}
                                    >
                                        <Ionicons name="add" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Active alarm status */}
                    {config.isActive && (
                        <View style={[styles.activeAlarmBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                            <Ionicons name="alarm" size={20} color={colors.primary} />
                            <Text style={[styles.activeAlarmText, { color: colors.primary }]}>
                                Alarma activa para las {new Date(config.timeMs || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    )}

                    {/* Deactivate alarm button */}
                    {config.isActive && (
                        <TouchableOpacity
                            style={[styles.deactivateButton]}
                            onPress={handleCancelAlarm}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                            <Text style={styles.deactivateText}>Desactivar alarma</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 12,
    },
    topBarText: {
        fontSize: 17,
        fontWeight: '600',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: 16,
    },

    // Time Picker
    timePickerArea: {
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 10,
    },
    timePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    wheelContainer: {
        width: 90,
        overflow: 'hidden',
    },
    wheelItem: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    wheelItemText: {
        fontVariant: ['tabular-nums'],
    },
    colonText: {
        fontSize: 48,
        fontWeight: '200',
        marginHorizontal: 4,
        paddingBottom: 4,
    },
    ampmContainer: {
        marginLeft: 16,
        justifyContent: 'center',
        gap: 8,
    },
    ampmButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    ampmText: {
        fontSize: 18,
        fontWeight: '400',
    },
    ampmTextActive: {
        fontWeight: '600',
    },

    // Settings Card
    settingsCard: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    settingSection: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    settingRowSpaced: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 20,
    },

    // Days
    daysText: {
        fontSize: 14,
        marginBottom: 12,
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayChip: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayChipText: {
        fontSize: 14,
    },

    // Name input
    nameInput: {
        fontSize: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },

    // Settings labels
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingSubLabel: {
        fontSize: 13,
        marginTop: 2,
    },

    // Music options
    musicOptions: {
        marginTop: 14,
        gap: 10,
    },
    musicOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    musicOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    musicOptionInfo: {
        flex: 1,
    },
    musicOptionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    musicOptionSub: {
        fontSize: 12,
        marginTop: 2,
    },

    // Playlist cards
    playlistScrollRow: {
        marginTop: 12,
    },
    playlistScrollContent: {
        gap: 10,
        paddingVertical: 4,
    },
    playlistCard: {
        width: 100,
        borderRadius: 12,
        borderWidth: 2,
        overflow: 'hidden',
        padding: 6,
        alignItems: 'center',
    },
    playlistCardImage: {
        width: 86,
        height: 86,
        borderRadius: 8,
    },
    playlistCardPlaceholder: {
        width: 86,
        height: 86,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playlistCardName: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 6,
        textAlign: 'center',
    },
    playlistCardCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Snooze
    snoozeAdjust: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        gap: 16,
    },
    snoozeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    snoozeValue: {
        fontSize: 16,
        fontWeight: '600',
        minWidth: 60,
        textAlign: 'center',
    },

    // Active alarm
    activeAlarmBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        marginTop: 16,
        borderWidth: 1,
    },
    activeAlarmText: {
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },

    // Deactivate
    deactivateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 14,
        gap: 8,
    },
    deactivateText: {
        color: '#FF6B6B',
        fontSize: 15,
        fontWeight: '600',
    },
});
