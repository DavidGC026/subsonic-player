import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useThemeStore } from '../../store';
import { VinylDisc, AnimatedBackground, AlbumArt } from '../../components';

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

    // Return to home if nothing is playing or queue finished
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

    const formatSongDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Next songs in queue (up to 10 after current)
    const upcomingSongs = queue.slice(currentIndex + 1, currentIndex + 11);

    const handleQueueSongPress = (song: any) => {
        playSong(song, queue);
    };

    const FocusableIconButton = ({ id, icon, onPress, size = 36, isPrimary = false }: any) => {
        const isFocused = focusedBtn === id;
        return (
            <TouchableOpacity
                onFocus={() => setFocusedBtn(id)}
                onPress={onPress}
                style={[
                    styles.iconBtn,
                    isPrimary && {
                        backgroundColor: isFocused ? '#fff' : primaryColor,
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                    },
                    isFocused && !isPrimary && { backgroundColor: 'rgba(255,255,255,0.15)' },
                    isFocused && {
                        transform: [{ scale: 1.1 }],
                        shadowColor: '#fff',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 10,
                        elevation: 10,
                    },
                ]}
                hasTVPreferredFocus={id === 'play'}
            >
                <Ionicons
                    name={icon}
                    size={size}
                    color={isPrimary ? (isFocused ? '#000' : '#fff') : '#fff'}
                    style={
                        (!isPrimary && !isFocused && id.includes('shuffle') && !shuffleMode) ||
                            (!isPrimary && !isFocused && id.includes('repeat') && repeatMode === 'none')
                            ? { opacity: 0.5 }
                            : {}
                    }
                />
                {id === 'repeat' && repeatMode === 'one' && (
                    <View style={[styles.repeatBadge, { backgroundColor: primaryColor }]}>
                        <Text style={styles.repeatBadgeText}>1</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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

    return (
        <View style={styles.container}>
            {/* Background - matching mobile immersive */}
            <View style={StyleSheet.absoluteFill}>
                {renderBackground()}
            </View>

            {/* Full layout: Left = Vinyl | Right = Controls + Queue */}
            <View style={styles.mainLayout}>
                {/* Back button */}
                <TouchableOpacity
                    onFocus={() => setFocusedBtn('back')}
                    onPress={() => navigation.goBack()}
                    style={[
                        styles.backButton,
                        focusedBtn === 'back' && {
                            backgroundColor: 'rgba(255,255,255,0.35)',
                            transform: [{ scale: 1.1 }],
                        },
                    ]}
                >
                    <Ionicons name="chevron-down" size={30} color="#fff" />
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

                    {/* Controls Row */}
                    <View style={styles.playbackRow}>
                        <FocusableIconButton
                            id="shuffle"
                            icon="shuffle"
                            size={24}
                            onPress={toggleShuffle}
                        />
                        <FocusableIconButton
                            id="prev"
                            icon="play-skip-back"
                            size={32}
                            onPress={playPrevious}
                        />
                        <FocusableIconButton
                            id="play"
                            icon={isPlaying ? 'pause' : 'play'}
                            size={42}
                            isPrimary={true}
                            onPress={togglePlay}
                        />
                        <FocusableIconButton
                            id="next"
                            icon="play-skip-forward"
                            size={32}
                            onPress={playNext}
                        />
                        <FocusableIconButton
                            id="repeat"
                            icon="repeat"
                            size={24}
                            onPress={() =>
                                setRepeatMode(
                                    repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none'
                                )
                            }
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
                                {upcomingSongs.map((song, idx) => {
                                    const songId = `queue-${idx}`;
                                    const isFocused = focusedBtn === songId;
                                    return (
                                        <TouchableOpacity
                                            key={`${song.id}-${idx}`}
                                            style={[
                                                styles.queueItem,
                                                isFocused && {
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: 10,
                                                    transform: [{ scale: 1.02 }],
                                                },
                                            ]}
                                            onFocus={() => setFocusedBtn(songId)}
                                            onPress={() => handleQueueSongPress(song)}
                                        >
                                            <AlbumArt
                                                coverArtId={song.coverArt}
                                                size={44}
                                                borderRadius={6}
                                                iconSize={20}
                                            />
                                            <View style={styles.queueItemInfo}>
                                                <Text
                                                    style={[
                                                        styles.queueItemTitle,
                                                        isFocused && { color: primaryColor },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {song.title}
                                                </Text>
                                                <Text style={styles.queueItemArtist} numberOfLines={1}>
                                                    {song.artist}
                                                </Text>
                                            </View>
                                            <Text style={styles.queueItemDuration}>
                                                {formatSongDuration(song.duration)}
                                            </Text>
                                            {isFocused && (
                                                <Ionicons
                                                    name="play"
                                                    size={16}
                                                    color={primaryColor}
                                                    style={{ marginLeft: 8 }}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
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
});
