import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useThemeStore } from '../../store';
import { VinylDisc, AnimatedBackground } from '../../components';

export const TVPlayerScreen = ({ navigation }: any) => {
    const {
        player,
        togglePlay,
        playNext,
        playPrevious,
        setRepeatMode,
        toggleShuffle,
        seekTo,
    } = usePlayerStore();

    const { currentSong, isPlaying, position, duration, repeatMode, shuffleMode } = player;
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

    const FocusableIconButton = ({ id, icon, onPress, size = 36, isPrimary = false }: any) => {
        const isFocused = focusedBtn === id;
        return (
            <TouchableOpacity
                onFocus={() => setFocusedBtn(id)}
                onPress={onPress}
                style={[
                    styles.iconBtn,
                    isPrimary && { backgroundColor: isFocused ? '#fff' : primaryColor, width: 80, height: 80, borderRadius: 40 },
                    isFocused && !isPrimary && { backgroundColor: 'rgba(255,255,255,0.2)' },
                    isFocused && {
                        transform: [{ scale: 1.1 }],
                        shadowColor: '#fff',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 10,
                        elevation: 10,
                    }
                ]}
                hasTVPreferredFocus={id === 'play'}
            >
                <Ionicons
                    name={icon}
                    size={size}
                    color={isPrimary ? (isFocused ? '#000' : '#fff') : '#fff'}
                    style={(!isPrimary && !isFocused && id.includes('shuffle') && !shuffleMode) || (!isPrimary && !isFocused && id.includes('repeat') && repeatMode === 'none') ? { opacity: 0.5 } : {}}
                />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Split Layout: Left Vinyl, Right Controls */}
            <View style={{ flex: 1, flexDirection: 'row', width: '100%', height: '100%' }}>
                {/* Left panel: Vinyl */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={styles.artWrapper}>
                        <VinylDisc
                            coverArtId={currentSong.coverArt}
                            size={400} // Large vinyl for TV
                            isPlaying={isPlaying}
                            primaryColor={primaryColor}
                        />
                    </View>
                </View>

                {/* Right panel: Controls */}
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 60, backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    {/* Top right buttons optionally... */}

                    <View style={styles.songInfo}>
                        <Text style={styles.songTitle} numberOfLines={2}>{currentSong.title}</Text>
                        <Text style={styles.songArtist} numberOfLines={1}>{currentSong.artist} • {currentSong.album}</Text>
                    </View>

                    {/* Progress Bar (Visual Only for now on TV) */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(position / displayDuration) * 100}%`, backgroundColor: primaryColor }]} />
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
                            size={28}
                            onPress={toggleShuffle}
                        />
                        <FocusableIconButton
                            id="prev"
                            icon="play-skip-back"
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
                            onPress={playNext}
                        />
                        <FocusableIconButton
                            id="repeat"
                            icon="repeat"
                            size={28}
                            onPress={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    artWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 20,
    },
    songInfo: {
        marginBottom: 40,
    },
    songTitle: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    songArtist: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 24,
    },
    progressSection: {
        marginBottom: 50,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    timeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
    },
    playbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
    },
    iconBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    }
});
