import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    ImageBackground,
    NativeModules,
    Alert,
    Platform,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, useAlarmStore, useLibraryStore } from '../store';
import { AnimatedBackground } from './AnimatedBackground';
import type { Alarm, AlarmMode } from '../store/alarmStore';

const { AlarmModule } = NativeModules;

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

// ======================== WHEEL PICKER ========================
const WheelPicker: React.FC<{
    data: number[];
    selectedIndex: number;
    onValueChange: (index: number) => void;
    formatValue?: (val: number) => string;
    primaryColor: string;
    textColor: string;
    textSecondaryColor: string;
}> = ({ data, selectedIndex, onValueChange, formatValue, primaryColor, textSecondaryColor }) => {
    const scrollRef = useRef<ScrollView>(null);
    const [currentIndex, setCurrentIndex] = useState(selectedIndex);

    useEffect(() => {
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
        }, 150);
    }, []);

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        setCurrentIndex(Math.max(0, Math.min(index, data.length - 1)));
    }, [data.length]);

    const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(index, data.length - 1));
        setCurrentIndex(clamped);
        onValueChange(clamped);
    }, [data.length, onValueChange]);

    return (
        <View style={[pickerStyles.wheelContainer, { height: PICKER_HEIGHT }]}>
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                nestedScrollEnabled={true}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
            >
                {data.map((item, index) => {
                    const isSelected = index === currentIndex;
                    const distance = Math.abs(index - currentIndex);
                    const displayValue = formatValue ? formatValue(item) : item.toString();
                    const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.15;

                    return (
                        <View key={index} style={[pickerStyles.wheelItem, { height: ITEM_HEIGHT }]}>
                            <Text
                                style={[
                                    pickerStyles.wheelItemText,
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

// ======================== ALARM LIST ITEM ========================
const AlarmListItem: React.FC<{
    alarm: Alarm;
    colors: any;
    onToggle: () => void;
    onPress: () => void;
    onDelete: () => void;
}> = ({ alarm, colors, onToggle, onPress, onDelete }) => {
    const hour12 = alarm.hour === 0 ? 12 : alarm.hour > 12 ? alarm.hour - 12 : alarm.hour;
    const ampm = alarm.hour < 12 ? 'a.m.' : 'p.m.';
    const minuteStr = alarm.minute.toString().padStart(2, '0');
    const hasDays = alarm.days.some(d => d);

    const getDaysLabel = () => {
        if (!hasDays) {
            // show next fire date
            const now = new Date();
            const target = new Date();
            target.setHours(alarm.hour, alarm.minute, 0, 0);
            if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
            const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
            const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            return `${dayNames[target.getDay()]}, ${target.getDate()} ${months[target.getMonth()]}`;
        }
        const allDays = alarm.days.every(d => d);
        if (allDays) return 'Todos los días';
        const weekdays = alarm.days[1] && alarm.days[2] && alarm.days[3] && alarm.days[4] && alarm.days[5] && !alarm.days[0] && !alarm.days[6];
        if (weekdays) return 'Lun a Vie';
        const weekend = alarm.days[0] && alarm.days[6] && !alarm.days[1] && !alarm.days[2] && !alarm.days[3] && !alarm.days[4] && !alarm.days[5];
        if (weekend) return 'Fines de semana';
        return alarm.days.map((d, i) => d ? DAY_LABELS[i] : null).filter(Boolean).join(' ');
    };

    return (
        <TouchableOpacity
            style={[styles.alarmItem, { backgroundColor: colors.surface }]}
            onPress={onPress}
            onLongPress={() => {
                Alert.alert(
                    'Eliminar alarma',
                    `¿Eliminar la alarma de las ${hour12}:${minuteStr} ${ampm}?`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: onDelete },
                    ]
                );
            }}
            activeOpacity={0.7}
        >
            <View style={styles.alarmItemLeft}>
                <View style={styles.alarmTimeRow}>
                    <Text style={[styles.alarmTime, { color: alarm.enabled ? colors.text : colors.textSecondary }]}>
                        {hour12}:{minuteStr}
                    </Text>
                    <Text style={[styles.alarmAmPm, { color: alarm.enabled ? colors.text : colors.textSecondary }]}>
                        {ampm}
                    </Text>
                </View>
                <View style={styles.alarmMetaRow}>
                    {alarm.name ? (
                        <Text style={[styles.alarmName, { color: colors.textSecondary }]} numberOfLines={1}>
                            {alarm.name} • {getDaysLabel()}
                        </Text>
                    ) : (
                        <Text style={[styles.alarmDays, { color: colors.textSecondary }]}>
                            {getDaysLabel()}
                        </Text>
                    )}
                    {hasDays && (
                        <View style={styles.daysDotsRow}>
                            {alarm.days.map((active, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dayDot,
                                        { backgroundColor: active ? colors.primary : colors.textSecondary + '40' },
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </View>
            <Switch
                value={alarm.enabled}
                onValueChange={onToggle}
                thumbColor={alarm.enabled ? colors.primary : '#888'}
                trackColor={{ false: '#555', true: colors.primary + '55' }}
            />
        </TouchableOpacity>
    );
};

// ======================== MAIN ALARM MODAL ========================
export const AlarmModal: React.FC<AlarmModalProps> = ({ visible, onClose }) => {
    const { currentTheme } = useThemeStore();
    const { alarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm } = useAlarmStore();
    const { playlists, fetchPlaylists } = useLibraryStore();
    const customPlaylistImages = useLibraryStore(state => state.customPlaylistImages);

    // "list" = alarm list, "edit" = create/edit form
    const [screen, setScreen] = useState<'list' | 'edit'>('list');
    const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);

    // ---- Edit form state ----
    const [selectedHourIndex, setSelectedHourIndex] = useState(5);
    const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(30);
    const [isAM, setIsAM] = useState(true);
    const [selectedDays, setSelectedDays] = useState<boolean[]>([false, true, true, true, true, true, false]);
    const [alarmName, setAlarmName] = useState('');
    const [selectedMode, setSelectedMode] = useState<AlarmMode>('all_random');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>();
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [snoozeEnabled, setSnoozeEnabled] = useState(true);
    const [snoozeMinutes, setSnoozeMinutes] = useState(5);
    const [vibrationEnabled, setVibrationEnabled] = useState(true);

    // Sort alarms by time
    const sortedAlarms = useMemo(() => {
        return [...alarms].sort((a, b) => {
            const aMin = a.hour * 60 + a.minute;
            const bMin = b.hour * 60 + b.minute;
            return aMin - bMin;
        });
    }, [alarms]);

    useEffect(() => {
        if (visible) {
            fetchPlaylists();
            setScreen('list');
            setEditingAlarmId(null);
        }
    }, [visible]);

    const openCreateForm = () => {
        setEditingAlarmId(null);
        const now = new Date();
        let h = now.getHours();
        const m = now.getMinutes();
        const am = h < 12;
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;
        setSelectedHourIndex(h - 1);
        setSelectedMinuteIndex(m);
        setIsAM(am);
        setSelectedDays([false, true, true, true, true, true, false]);
        setAlarmName('');
        setSelectedMode('all_random');
        setSelectedPlaylistId(undefined);
        setSoundEnabled(true);
        setSnoozeEnabled(true);
        setSnoozeMinutes(5);
        setVibrationEnabled(true);
        setScreen('edit');
    };

    const openEditForm = (alarm: Alarm) => {
        setEditingAlarmId(alarm.id);
        let h = alarm.hour;
        const am = h < 12;
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;
        setSelectedHourIndex(h - 1);
        setSelectedMinuteIndex(alarm.minute);
        setIsAM(am);
        setSelectedDays([...alarm.days]);
        setAlarmName(alarm.name);
        setSelectedMode(alarm.mode);
        setSelectedPlaylistId(alarm.playlistId);
        setSnoozeEnabled(alarm.snoozeEnabled);
        setSnoozeMinutes(alarm.snoozeMinutes);
        setVibrationEnabled(alarm.vibrationEnabled);
        setSoundEnabled(true);
        setScreen('edit');
    };

    const handleSave = async () => {
        // Check permissions first on Android
        if (Platform.OS === 'android' && AlarmModule?.checkAllAlarmPermissions) {
            try {
                const permissions = await AlarmModule.checkAllAlarmPermissions();

                if (!permissions.areNotificationsEnabled) {
                    Alert.alert('Permisos de notificación',
                        'Las notificaciones están desactivadas. La alarma necesita notificaciones para funcionar.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Abrir Configuración', onPress: () => require('react-native').Linking.openSettings() },
                        ]
                    );
                    return;
                }
                if (!permissions.canScheduleExactAlarms) {
                    Alert.alert('Permiso de alarma exacta',
                        'Necesitas permitir "Alarmas y recordatorios" en la configuración.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Abrir Configuración', onPress: () => AlarmModule.canScheduleExactAlarms().catch(console.warn) },
                        ]
                    );
                    return;
                }
                if (!permissions.canUseFullScreenIntent) {
                    Alert.alert('Permiso de pantalla completa',
                        'Activa el permiso de "Pantalla completa" para que la alarma despierte tu teléfono.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Activar', onPress: () => AlarmModule.requestFullScreenIntentPermission().catch(console.warn) },
                        ]
                    );
                    return;
                }
                if (!permissions.isIgnoringBatteryOptimizations) {
                    Alert.alert('Optimización de batería',
                        'Samsung puede detener la alarma. Desactiva la optimización de batería.\n\nToca "Permitir" en el siguiente diálogo.',
                        [
                            { text: 'Omitir', style: 'cancel', onPress: () => proceedWithSave() },
                            {
                                text: 'Desactivar', onPress: async () => {
                                    try { await AlarmModule.requestBatteryOptimizationExemption(); } catch { }
                                    proceedWithSave();
                                }
                            },
                        ]
                    );
                    return;
                }
            } catch { }
        }
        proceedWithSave();
    };

    const proceedWithSave = () => {
        let hours24 = HOURS[selectedHourIndex];
        if (isAM) {
            if (hours24 === 12) hours24 = 0;
        } else {
            if (hours24 !== 12) hours24 += 12;
        }

        const alarmData = {
            hour: hours24,
            minute: MINUTES[selectedMinuteIndex],
            days: selectedDays,
            enabled: true,
            name: alarmName,
            mode: selectedMode,
            playlistId: selectedPlaylistId,
            snoozeEnabled,
            snoozeMinutes,
            vibrationEnabled,
        };

        if (editingAlarmId) {
            updateAlarm(editingAlarmId, alarmData);
        } else {
            addAlarm(alarmData);
        }
        setScreen('list');
    };

    const handleDeleteAlarm = (id: string) => {
        deleteAlarm(id);
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
        if (activeDays.length === 5 && !selectedDays[0] && !selectedDays[6]) return 'Lun a Vie';
        if (activeDays.length === 2 && selectedDays[0] && selectedDays[6]) return 'Fines de semana';
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
    const hasAnimatedBg = !!currentTheme.flags?.animatedBackground;
    const hasBgImage = !!currentTheme.flags?.useBackgroundImage;

    // Themed background wrapper
    const ThemedContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        if (hasAnimatedBg && currentTheme.flags?.animatedBackground) {
            return (
                <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
                    <View style={StyleSheet.absoluteFill}>
                        <AnimatedBackground {...currentTheme.flags.animatedBackground} />
                    </View>
                    {children}
                </View>
            );
        }
        if (hasBgImage) {
            return (
                <ImageBackground
                    source={require('../../assets/fondo.jpg')}
                    style={styles.fullScreenContainer}
                    resizeMode="cover"
                >
                    {children}
                </ImageBackground>
            );
        }
        return (
            <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
                {children}
            </View>
        );
    };

    // ======================== LIST SCREEN ========================
    const renderListScreen = () => (
        <ThemedContainer>
            <View style={styles.listHeader}>
                <TouchableOpacity onPress={onClose} style={styles.listHeaderBtn}>
                    <Ionicons name="close" size={26} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.listTitle, { color: colors.text }]}>Alarma</Text>
                <TouchableOpacity onPress={openCreateForm} style={styles.listHeaderBtn}>
                    <Ionicons name="add" size={28} color={colors.text} />
                </TouchableOpacity>
            </View>

            {sortedAlarms.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="alarm-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No hay alarmas</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Toca + para crear una alarma musical
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.alarmListScroll}
                    contentContainerStyle={styles.alarmListContent}
                    showsVerticalScrollIndicator={false}
                >
                    {sortedAlarms.map(alarm => (
                        <AlarmListItem
                            key={alarm.id}
                            alarm={alarm}
                            colors={colors}
                            onToggle={() => toggleAlarm(alarm.id)}
                            onPress={() => openEditForm(alarm)}
                            onDelete={() => handleDeleteAlarm(alarm.id)}
                        />
                    ))}
                </ScrollView>
            )}
        </ThemedContainer>
    );

    // ======================== EDIT SCREEN ========================
    const renderEditScreen = () => (
        <ThemedContainer>
            {/* Top buttons */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => setScreen('list')}>
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
                {/* Time Picker */}
                <View style={pickerStyles.timePickerArea}>
                    <View style={pickerStyles.timePickerRow}>
                        <WheelPicker
                            data={HOURS}
                            selectedIndex={selectedHourIndex}
                            onValueChange={setSelectedHourIndex}
                            formatValue={(v) => v.toString()}
                            primaryColor={colors.primary}
                            textColor={colors.text}
                            textSecondaryColor={colors.textSecondary}
                        />
                        <Text style={[pickerStyles.colonText, { color: colors.text }]}>:</Text>
                        <WheelPicker
                            data={MINUTES}
                            selectedIndex={selectedMinuteIndex}
                            onValueChange={setSelectedMinuteIndex}
                            formatValue={(v) => v.toString().padStart(2, '0')}
                            primaryColor={colors.primary}
                            textColor={colors.text}
                            textSecondaryColor={colors.textSecondary}
                        />
                        <View style={pickerStyles.ampmContainer}>
                            <TouchableOpacity
                                style={[pickerStyles.ampmButton, isAM && { backgroundColor: colors.primary + '22' }]}
                                onPress={() => setIsAM(true)}
                            >
                                <Text style={[pickerStyles.ampmText, { color: isAM ? colors.primary : colors.textSecondary }, isAM && pickerStyles.ampmTextActive]}>a.m.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[pickerStyles.ampmButton, !isAM && { backgroundColor: colors.primary + '22' }]}
                                onPress={() => setIsAM(false)}
                            >
                                <Text style={[pickerStyles.ampmText, { color: !isAM ? colors.primary : colors.textSecondary }, !isAM && pickerStyles.ampmTextActive]}>p.m.</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Settings Card */}
                <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
                    {/* Days selector */}
                    <View style={styles.settingSection}>
                        <View style={styles.settingRowSpaced}>
                            <Text style={[styles.daysText, { color: colors.textSecondary }]}>{getSelectedDaysText()}</Text>
                            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                        </View>
                        <View style={styles.daysRow}>
                            {DAY_LABELS.map((label, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.dayChip, selectedDays[index] ? { backgroundColor: colors.primary } : { backgroundColor: 'transparent' }]}
                                    onPress={() => toggleDay(index)}
                                >
                                    <Text style={[styles.dayChipText, {
                                        color: selectedDays[index] ? colors.black : (index === 0 ? '#FF6B6B' : colors.textSecondary),
                                        fontWeight: selectedDays[index] ? '700' : '500',
                                    }]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.black + '40' }]} />

                    {/* Name */}
                    <View style={styles.settingSection}>
                        <TextInput
                            style={[styles.nameInput, { color: colors.text, borderBottomColor: colors.textSecondary + '40' }]}
                            placeholder="Nombre de alarma"
                            placeholderTextColor={colors.textSecondary}
                            value={alarmName}
                            onChangeText={setAlarmName}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.black + '40' }]} />

                    {/* Music */}
                    <View style={styles.settingSection}>
                        <View style={styles.settingRowSpaced}>
                            <View>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Música de alarma</Text>
                                <Text style={[styles.settingSubLabel, { color: colors.primary }]}>{getModeLabel()}</Text>
                            </View>
                            <Switch value={soundEnabled} onValueChange={setSoundEnabled} thumbColor={soundEnabled ? colors.primary : '#888'} trackColor={{ false: '#555', true: colors.primary + '55' }} />
                        </View>

                        {soundEnabled && (
                            <View style={styles.musicOptions}>
                                <TouchableOpacity
                                    style={[styles.musicOptionRow, {
                                        backgroundColor: selectedMode === 'all_random' ? colors.primary + '20' : 'transparent',
                                        borderColor: selectedMode === 'all_random' ? colors.primary : colors.textSecondary + '30',
                                    }]}
                                    onPress={() => setSelectedMode('all_random')}
                                >
                                    <View style={[styles.musicOptionIcon, { backgroundColor: colors.primary + '22' }]}>
                                        <Ionicons name="shuffle" size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.musicOptionInfo}>
                                        <Text style={[styles.musicOptionTitle, { color: colors.text }]}>Aleatorio</Text>
                                        <Text style={[styles.musicOptionSub, { color: colors.textSecondary }]}>Toda tu música</Text>
                                    </View>
                                    {selectedMode === 'all_random' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.musicOptionRow, {
                                        backgroundColor: selectedMode === 'playlist' ? colors.primary + '20' : 'transparent',
                                        borderColor: selectedMode === 'playlist' ? colors.primary : colors.textSecondary + '30',
                                    }]}
                                    onPress={() => setSelectedMode('playlist')}
                                >
                                    <View style={[styles.musicOptionIcon, { backgroundColor: colors.primary + '22' }]}>
                                        <Ionicons name="list" size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.musicOptionInfo}>
                                        <Text style={[styles.musicOptionTitle, { color: colors.text }]}>Playlist</Text>
                                        <Text style={[styles.musicOptionSub, { color: colors.textSecondary }]}>Selecciona una playlist</Text>
                                    </View>
                                    {selectedMode === 'playlist' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                                </TouchableOpacity>

                                {selectedMode === 'playlist' && playlists.length > 0 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playlistScrollRow} contentContainerStyle={styles.playlistScrollContent}>
                                        {playlists.map(pl => (
                                            <TouchableOpacity
                                                key={pl.id}
                                                style={[styles.playlistCard, { borderColor: selectedPlaylistId === pl.id ? colors.primary : 'transparent', backgroundColor: colors.black + '60' }]}
                                                onPress={() => setSelectedPlaylistId(pl.id)}
                                            >
                                                {customPlaylistImages[pl.id] ? (
                                                    <Image source={{ uri: customPlaylistImages[pl.id] }} style={styles.playlistCardImage} />
                                                ) : (
                                                    <View style={[styles.playlistCardPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                                        <Ionicons name="musical-notes" size={24} color={colors.primary} />
                                                    </View>
                                                )}
                                                <Text style={[styles.playlistCardName, { color: selectedPlaylistId === pl.id ? colors.primary : colors.text }]} numberOfLines={2}>{pl.name}</Text>
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

                    <View style={[styles.divider, { backgroundColor: colors.black + '40' }]} />

                    {/* Vibration */}
                    <View style={styles.settingSection}>
                        <View style={styles.settingRowSpaced}>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>Vibración</Text>
                            <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} thumbColor={vibrationEnabled ? colors.primary : '#888'} trackColor={{ false: '#555', true: colors.primary + '55' }} />
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.black + '40' }]} />

                    {/* Snooze */}
                    <View style={styles.settingSection}>
                        <View style={styles.settingRowSpaced}>
                            <View>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Aplazar</Text>
                                <Text style={[styles.settingSubLabel, { color: colors.primary }]}>{snoozeMinutes} minutos</Text>
                            </View>
                            <Switch value={snoozeEnabled} onValueChange={setSnoozeEnabled} thumbColor={snoozeEnabled ? colors.primary : '#888'} trackColor={{ false: '#555', true: colors.primary + '55' }} />
                        </View>
                        {snoozeEnabled && (
                            <View style={styles.snoozeAdjust}>
                                <TouchableOpacity style={[styles.snoozeBtn, { borderColor: colors.textSecondary + '40' }]} onPress={() => setSnoozeMinutes(Math.max(1, snoozeMinutes - 1))}>
                                    <Ionicons name="remove" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <Text style={[styles.snoozeValue, { color: colors.text }]}>{snoozeMinutes} min</Text>
                                <TouchableOpacity style={[styles.snoozeBtn, { borderColor: colors.textSecondary + '40' }]} onPress={() => setSnoozeMinutes(Math.min(30, snoozeMinutes + 1))}>
                                    <Ionicons name="add" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Delete button (only when editing) */}
                {editingAlarmId && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                            deleteAlarm(editingAlarmId);
                            setScreen('list');
                        }}
                    >
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                        <Text style={styles.deleteButtonText}>Eliminar alarma</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </ThemedContainer>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => {
                if (screen === 'edit') setScreen('list');
                else onClose();
            }}
        >
            {screen === 'list' ? renderListScreen() : renderEditScreen()}
        </Modal>
    );
};

// ======================== STYLES ========================
const styles = StyleSheet.create({
    fullScreenContainer: { flex: 1 },

    // List screen
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
    },
    listTitle: { fontSize: 24, fontWeight: 'bold' },
    listHeaderBtn: { padding: 8 },
    alarmListScroll: { flex: 1 },
    alarmListContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },

    // Alarm list item
    alarmItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    alarmItemLeft: { flex: 1, marginRight: 16 },
    alarmTimeRow: { flexDirection: 'row', alignItems: 'baseline' },
    alarmTime: { fontSize: 42, fontWeight: '200', letterSpacing: 1 },
    alarmAmPm: { fontSize: 16, fontWeight: '400', marginLeft: 6 },
    alarmMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 10 },
    alarmName: { fontSize: 13, fontWeight: '400' },
    alarmDays: { fontSize: 13, fontWeight: '400' },
    daysDotsRow: { flexDirection: 'row', gap: 4 },
    dayDot: { width: 5, height: 5, borderRadius: 2.5 },

    // Edit screen - top bar
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 12,
    },
    topBarText: { fontSize: 17, fontWeight: '600' },
    scrollContainer: { flex: 1 },
    scrollContentContainer: { paddingHorizontal: 16 },

    // Settings Card
    settingsCard: { borderRadius: 20, overflow: 'hidden' },
    settingSection: { paddingHorizontal: 20, paddingVertical: 16 },
    settingRowSpaced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },

    daysText: { fontSize: 14, marginBottom: 12 },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayChip: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    dayChipText: { fontSize: 14 },

    nameInput: { fontSize: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },

    settingLabel: { fontSize: 16, fontWeight: '500' },
    settingSubLabel: { fontSize: 13, marginTop: 2 },

    musicOptions: { marginTop: 14, gap: 10 },
    musicOptionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1 },
    musicOptionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    musicOptionInfo: { flex: 1 },
    musicOptionTitle: { fontSize: 15, fontWeight: '600' },
    musicOptionSub: { fontSize: 12, marginTop: 2 },

    playlistScrollRow: { marginTop: 12 },
    playlistScrollContent: { gap: 10, paddingVertical: 4 },
    playlistCard: { width: 100, borderRadius: 12, borderWidth: 2, overflow: 'hidden', padding: 6, alignItems: 'center' },
    playlistCardImage: { width: 86, height: 86, borderRadius: 8 },
    playlistCardPlaceholder: { width: 86, height: 86, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    playlistCardName: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },
    playlistCardCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    snoozeAdjust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 16 },
    snoozeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    snoozeValue: { fontSize: 16, fontWeight: '600', minWidth: 60, textAlign: 'center' },

    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 14, gap: 8 },
    deleteButtonText: { color: '#FF6B6B', fontSize: 16, fontWeight: '500' },
});

const pickerStyles = StyleSheet.create({
    timePickerArea: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
    timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    wheelContainer: { width: 90, overflow: 'hidden' },
    wheelItem: { justifyContent: 'center', alignItems: 'center' },
    wheelItemText: { fontVariant: ['tabular-nums'] },
    colonText: { fontSize: 48, fontWeight: '200', marginHorizontal: 4, paddingBottom: 4 },
    ampmContainer: { marginLeft: 16, justifyContent: 'center', gap: 8 },
    ampmButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    ampmText: { fontSize: 18, fontWeight: '400' },
    ampmTextActive: { fontWeight: '600' },
});
