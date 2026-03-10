import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground, findNodeHandle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useThemeStore } from '../../store';
import { VinylDisc, AnimatedBackground, AlbumArt } from '../../components';

// ── Standalone focusable button for TV (defined outside to avoid re-mounts) ──
const TVFocusButton = React.memo(({
    id,
    icon,
    onPress,
    size = 36,
    isPrimary = false,
    isFocused = false,
    onFocusChange,
    primaryColor,
    hasTVPreferredFocus,
    isActive = true,
}: {
    id: string;
    icon: string;
    onPress: () => void;
    size?: number;
    isPrimary?: boolean;
    isFocused?: boolean;
    onFocusChange?: (id: string) => void;
    primaryColor: string;
    hasTVPreferredFocus?: boolean;
    isActive?: boolean;
}) => {
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={id}
            hasTVPreferredFocus={hasTVPreferredFocus}
            onFocus={() => onFocusChange?.(id)}
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.iconBtn,
                isPrimary && {
                    backgroundColor: primaryColor,
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                },
                isFocused && isPrimary && {
                    backgroundColor: '#fff',
                    transform: [{ scale: 1.25 }],
                    borderWidth: 3,
                    borderColor: primaryColor,
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 25,
                    elevation: 20,
                },
                isFocused && !isPrimary && {
                    backgroundColor: primaryColor + '40',
                    borderWidth: 3,
                    borderColor: primaryColor,
                    transform: [{ scale: 1.3 }],
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 20,
                    elevation: 15,
                },
            ]}
        >
            <Ionicons
                name={icon as any}
                size={isFocused ? size + 4 : size}
                color={
                    isPrimary
                        ? (isFocused ? '#000' : '#fff')
                        : (isFocused ? '#fff' : 'rgba(255,255,255,0.7)')
                }
                style={!isActive && !isFocused ? { opacity: 0.4 } : {}}
            />
        </TouchableOpacity>
    );
});

// ── Standalone queue item for TV ──
const TVQueueItem = React.memo(({
    song,
    index,
    isFocused,
    onFocusChange,
    onPress,
    primaryColor,
    formatDuration,
}: {
    song: any;
    index: number;
    isFocused: boolean;
    onFocusChange: (id: string) => void;
    onPress: () => void;
    primaryColor: string;
    formatDuration: (s: number) => string;
}) => {
    const songId = `queue-${index}`;
    return (
        <TouchableOpacity
            focusable={true}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Reproducir ${song.title}`}
            onFocus={() => onFocusChange(songId)}
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.queueItem,
                isFocused && {
                    backgroundColor: primaryColor + '25',
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: primaryColor,
                    transform: [{ scale: 1.04 }],
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 15,
                    elevation: 10,
                    marginVertical: 2,
                },
            ]}
        >
            {isFocused && (
                <View style={[styles.focusIndicator, { backgroundColor: primaryColor }]} />
            )}
            <AlbumArt
                coverArtId={song.coverArt}
                size={isFocused ? 52 : 44}
                borderRadius={isFocused ? 8 : 6}
                iconSize={20}
            />
            <View style={styles.queueItemInfo}>
                <Text
                    style={[
                        styles.queueItemTitle,
                        isFocused && { color: '#fff', fontSize: 17, fontWeight: 'bold' },
                    ]}
                    numberOfLines={1}
                >
                    {song.title}
                </Text>
                <Text
                    style={[
                        styles.queueItemArtist,
                        isFocused && { color: 'rgba(255,255,255,0.7)' },
                    ]}
                    numberOfLines={1}
                >
                    {song.artist}
                </Text>
            </View>
            <Text
                style={[
                    styles.queueItemDuration,
                    isFocused && { color: 'rgba(255,255,255,0.7)' },
                ]}
            >
                {formatDuration(song.duration)}
            </Text>
            {isFocused && (
                <View style={[styles.playIndicator, { backgroundColor: primaryColor }]}>
                    <Ionicons name="play" size={18} color="#fff" />
                </View>
            )}
        </TouchableOpacity>
    );
});

// ── Main TV Player Screen ──
export const TVPlayerScreen = ({ navigation }: any) => {
    const {
        player,
        togglePlay,
        playNext,
        playPrevious,
        setRepeatMode,
        toggleShuffle,
        playSong,
    } = usePlayerStore();

    const { currentSong, isPlaying, position, duration, repeatMode, shuffleMode, queue, currentIndex } = player;
    const { currentTheme } = useThemeStore();
    const primaryColor = currentTheme.colors.primary;

    const [focusedBtn, setFocusedBtn] = useState('play');

    const handleFocusChange = useCallback((id: string) => {
        setFocusedBtn(id);
    }, []);

    // Return to home if nothing is playing
    useEffect(() => {
        if (!currentSong) {
            navigation.goBack();
        }
    }, [currentSong]);

    if (!currentSong) return null;

    const displayDuration = duration || currentSong.duration * 1000;

    const formatTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatSongDuration = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Next songs in queue (up to 10 after current)
    const upcomingSongs = queue.slice(currentIndex + 1, currentIndex + 11);

    const handleQueueSongPress = useCallback((song: any) => {
        playSong(song, queue);
    }, [playSong, queue]);

    const handleRepeatPress = useCallback(() => {
        setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none');
    }, [repeatMode, setRepeatMode]);

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    // Theme background rendering (same as mobile ImmersiveView)
    const renderBackground = () => {
        if (currentTheme.flags?.animatedBackground) {
            return <AnimatedBackground {...currentTheme.flags.animatedBackground} />;
        }
        if (currentTheme.flags?.useBackgroundImage) {
            return (
                <ImageBackground
                    source={require('../../../assets/fondo.jpg')}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
                </ImageBackground>
            );
        }
        const bg = currentTheme.colors.background === 'transparent' ? '#121212' : currentTheme.colors.background;
        return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />;
    };

    const isBackFocused = focusedBtn === 'back';

    return (
        <View style={styles.container}>
            {/* Background */}
            <View style={StyleSheet.absoluteFill}>
                {renderBackground()}
            </View>

            {/* Full layout: Left = Vinyl | Right = Controls + Queue */}
            <View style={styles.mainLayout}>
                {/* Back button */}
                <TouchableOpacity
                    focusable={true}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                    onFocus={() => handleFocusChange('back')}
                    onPress={handleGoBack}
                    activeOpacity={0.7}
                    style={[
                        styles.backButton,
                        isBackFocused && {
                            backgroundColor: primaryColor,
                            transform: [{ scale: 1.2 }],
                            borderWidth: 3,
                            borderColor: '#fff',
                            shadowColor: primaryColor,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 1,
                            shadowRadius: 20,
                            elevation: 15,
                        },
                    ]}
                >
                    <Ionicons
                        name="chevron-down"
                        size={isBackFocused ? 34 : 30}
                        color={isBackFocused ? '#000' : '#fff'}
                    />
                </TouchableOpacity>

                {/* Left panel: Vinyl disc */}
                <View style={styles.leftPanel}>
                    <View style={styles.artWrapper}>
                        <VinylDisc
                            coverArtId={currentSong.coverArt}
                            size={420}
                            isPlaying={isPlaying}
                            primaryColor={primaryColor}
                        />
                    </View>
                </View>

                {/* Right panel: Controls + Queue */}
                <View style={styles.rightPanel}>
                    {/* Song info */}
                    <View style={styles.songInfo}>
                        <Text style={styles.songTitle} numberOfLines={2}>
                            {currentSong.title}
                        </Text>
                        <Text style={styles.songArtist} numberOfLines={1}>
                            {currentSong.artist} • {currentSong.album}
                        </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${(position / displayDuration) * 100}%`,
                                        backgroundColor: primaryColor,
                                    },
                                ]}
                            />
                        </View>
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(position)}</Text>
                            <Text style={styles.timeText}>{formatTime(displayDuration)}</Text>
                        </View>
                    </View>

                    {/* Controls Row — each button is a stable, standalone component */}
                    <View style={styles.playbackRow}>
                        <TVFocusButton
                            id="shuffle"
                            icon="shuffle"
                            size={24}
                            onPress={toggleShuffle}
                            isFocused={focusedBtn === 'shuffle'}
                            onFocusChange={handleFocusChange}
                            primaryColor={primaryColor}
                            isActive={shuffleMode}
                        />
                        <TVFocusButton
                            id="prev"
                            icon="play-skip-back"
                            size={32}
                            onPress={playPrevious}
                            isFocused={focusedBtn === 'prev'}
                            onFocusChange={handleFocusChange}
                            primaryColor={primaryColor}
                        />
                        <TVFocusButton
                            id="play"
                            icon={isPlaying ? 'pause' : 'play'}
                            size={42}
                            isPrimary={true}
                            onPress={togglePlay}
                            isFocused={focusedBtn === 'play'}
                            onFocusChange={handleFocusChange}
                            primaryColor={primaryColor}
                            hasTVPreferredFocus={true}
                        />
                        <TVFocusButton
                            id="next"
                            icon="play-skip-forward"
                            size={32}
                            onPress={playNext}
                            isFocused={focusedBtn === 'next'}
                            onFocusChange={handleFocusChange}
                            primaryColor={primaryColor}
                        />
                        <TVFocusButton
                            id="repeat"
                            icon="repeat"
                            size={24}
                            onPress={handleRepeatPress}
                            isFocused={focusedBtn === 'repeat'}
                            onFocusChange={handleFocusChange}
                            primaryColor={primaryColor}
                            isActive={repeatMode !== 'none'}
                        />
                    </View>

                    {/* Queue Section */}
                    {upcomingSongs.length > 0 && (
                        <View style={styles.queueSection}>
                            <View style={styles.queueHeader}>
                                <Ionicons name="list" size={18} color="rgba(255,255,255,0.5)" />
                                <Text style={styles.queueTitle}>Siguiente en la cola</Text>
                            </View>
                            <ScrollView
                                style={styles.queueList}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
                            >
                                {upcomingSongs.map((song, idx) => (
                                    <TVQueueItem
                                        key={`${song.id}-${idx}`}
                                        song={song}
                                        index={idx}
                                        isFocused={focusedBtn === `queue-${idx}`}
                                        onFocusChange={handleFocusChange}
                                        onPress={() => handleQueueSongPress(song)}
                                        primaryColor={primaryColor}
                                        formatDuration={formatSongDuration}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftPanel: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    artWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 20,
    },
    rightPanel: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    songInfo: {
        marginBottom: 24,
        alignItems: 'center',
    },
    songTitle: {
        color: '#fff',
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    songArtist: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 18,
        textAlign: 'center',
    },
    progressSection: {
        marginBottom: 20,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    timeText: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 13,
    },
    playbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 28,
    },
    iconBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    repeatBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        borderRadius: 6,
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    repeatBadgeText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#fff',
    },
    // Queue styles
    queueSection: {
        flex: 1,
        maxHeight: 260,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 16,
    },
    queueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    queueTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    queueList: {
        flex: 1,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 2,
    },
    queueItemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    queueItemTitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    queueItemArtist: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
    },
    queueItemDuration: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 13,
        marginLeft: 10,
    },
    focusIndicator: {
        width: 4,
        height: '80%',
        borderRadius: 2,
        marginRight: 8,
    },
    playIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
