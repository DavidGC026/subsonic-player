import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomSlider } from './CustomSlider';
import { useMusicStore, useThemeStore } from '../store';
import { AlbumArt } from './AlbumArt';
import { ThemeIcon } from './ThemeIcon';
import { AnimatedBackground } from './AnimatedBackground';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FullPlayerProps {
  onClose?: () => void;
}

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const FullPlayer: React.FC<FullPlayerProps> = ({ onClose }) => {
  const {
    player,
    togglePlay,
    playNext,
    playPrevious,
    setRepeatMode,
    toggleShuffle,
    setVolume,
    seekTo,
    playSong,
    reorderQueue,
  } = useMusicStore();

  const { currentSong, isPlaying, position, duration, repeatMode, shuffleMode, volume, queue, currentIndex } = player;
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const { currentTheme } = useThemeStore();

  const handleSeek = useCallback(async (value: number) => {
    await seekTo(value);
    setIsSeeking(false);
  }, [seekTo]);

  const handleSlidingStart = useCallback((value: number) => {
    setIsSeeking(true);
    setSeekPosition(value);
  }, []);

  const handleSlidingComplete = useCallback((value: number) => {
    handleSeek(value);
  }, [handleSeek]);

  const handleValueChange = useCallback((value: number) => {
    setSeekPosition(value);
  }, []);

  if (!currentSong) {
    return null;
  }

  const displayPosition = isSeeking ? seekPosition : position;
  const displayDuration = duration || currentSong.duration * 1000;

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Background */}
      <View style={styles.background}>
        {currentTheme.flags?.animatedBackground ? (
          <AnimatedBackground {...currentTheme.flags.animatedBackground} />
        ) : currentTheme.flags?.useBackgroundImage ? (
          <ImageBackground
            source={require('../../assets/fondo.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          >
            {/* Dark overlay for readability */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          </ImageBackground>
        ) : (
          <View style={[styles.gradient, { backgroundColor: currentTheme.colors.background }]} />
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="chevron-down" size={32} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>{showQueue ? 'COLA' : 'REPRODUCIENDO'}</Text>
        <TouchableOpacity style={styles.moreButton} onPress={() => setShowQueue(!showQueue)}>
          <Ionicons name={showQueue ? "close" : "list"} size={26} color={currentTheme.colors.text} />
        </TouchableOpacity>
      </View>

      {showQueue ? (
        <View style={styles.queueContainer}>
          <FlatList
            data={queue}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.queueItem,
                  index === currentIndex && { backgroundColor: `${currentTheme.colors.primary}1A` }
                ]}
                onPress={() => {
                  playSong(item, queue);
                  setShowQueue(false);
                }}
              >
                <AlbumArt coverArtId={item.coverArt} size={48} borderRadius={4} iconSize={24} />
                <View style={styles.queueItemInfo}>
                  <Text style={[styles.queueItemTitle, { color: currentTheme.colors.text }, index === currentIndex && { color: currentTheme.colors.primary }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.queueItemArtist, { color: currentTheme.colors.textSecondary }, index === currentIndex && { color: currentTheme.colors.primary }]} numberOfLines={1}>{item.artist}</Text>
                </View>
                {index === currentIndex ? (
                  <Ionicons name="volume-medium" size={20} color={currentTheme.colors.primary} />
                ) : (
                  <View style={styles.queueItemActions}>
                    {index !== undefined && index > 0 && (
                      <TouchableOpacity
                        onPress={() => reorderQueue(index, index - 1)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="chevron-up" size={20} color={currentTheme.colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    {index !== undefined && index < queue.length - 1 && (
                      <TouchableOpacity
                        onPress={() => reorderQueue(index, index + 1)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="chevron-down" size={20} color={currentTheme.colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <>
          {/* Album Art */}
          <View style={styles.artContainer}>
            <AlbumArt
              coverArtId={currentSong.coverArt}
              size={screenWidth * 0.75}
              borderRadius={12}
              iconSize={80}
            />
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.titleRow}>
              <View style={styles.titleInfo}>
                <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                  {currentSong.title}
                </Text>
                <Text style={[styles.artist, { color: currentTheme.colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                  {currentSong.artist} • {currentSong.album}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.starButton}
                onPress={() => useMusicStore.getState().toggleStar(currentSong.id, 'song', !!currentSong.starred)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={currentSong.starred ? "heart" : "heart-outline"}
                  size={28}
                  color={currentSong.starred ? currentTheme.colors.primary : currentTheme.colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <CustomSlider
          style={styles.slider}
          minimumValue={0}
          maximumValue={displayDuration}
          value={displayPosition}
          onSlidingStart={handleSlidingStart}
          onSlidingComplete={handleSlidingComplete}
          onValueChange={handleValueChange}
          minimumTrackTintColor={currentTheme.colors.primary}
          maximumTrackTintColor={currentTheme.colors.surface}
          thumbTintColor={currentTheme.colors.text}
        />
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: currentTheme.colors.textSecondary }]}>{formatTime(displayPosition)}</Text>
          <Text style={[styles.timeText, { color: currentTheme.colors.textSecondary }]}>{formatTime(displayDuration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.secondaryControl}
          onPress={toggleShuffle}
        >
          <ThemeIcon
            name="shuffle"
            size={24}
            color={shuffleMode ? currentTheme.colors.primary : currentTheme.colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainControl}
          onPress={playPrevious}
        >
          <ThemeIcon name="play-skip-back" size={35} color={currentTheme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlay}
        >
          <View style={[styles.playButtonBackground, { backgroundColor: currentTheme.colors.text }]}>
            <ThemeIcon
              name={isPlaying ? 'pause' : 'play'}
              size={40}
              color={currentTheme.colors.background}
              style={isPlaying ? {} : { marginLeft: 4 }}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainControl}
          onPress={playNext}
        >
          <ThemeIcon name="play-skip-forward" size={35} color={currentTheme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryControl}
          onPress={() => setRepeatMode(
            repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none'
          )}
        >
          <ThemeIcon
            name="repeat"
            size={24}
            color={repeatMode !== 'none' ? currentTheme.colors.primary : currentTheme.colors.textSecondary}
          />
          {repeatMode === 'one' && (
            <View style={[styles.repeatOneBadge, { backgroundColor: currentTheme.colors.primary }]}>
              <Text style={[styles.repeatOneText, { color: currentTheme.colors.background }]}>1</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Volume Control */}
      <View style={styles.volumeContainer}>
        <Ionicons name="volume-low" size={20} color={currentTheme.colors.textSecondary} />
        <CustomSlider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={setVolume}
          minimumTrackTintColor={currentTheme.colors.text}
          maximumTrackTintColor={currentTheme.colors.surface}
          thumbTintColor={currentTheme.colors.text}
        />
        <Ionicons name="volume-high" size={20} color={currentTheme.colors.textSecondary} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
  moreButton: {
    padding: 8,
  },
  artContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  infoContainer: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleInfo: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  starButton: {
    padding: 8,
  },
  artist: {
    fontSize: 14,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  timeText: {
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  secondaryControl: {
    padding: 16,
  },
  mainControl: {
    padding: 16,
  },
  playButton: {
    padding: 16,
    marginHorizontal: 16,
  },
  playButtonBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 16,
    height: 40,
  },
  repeatOneBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatOneText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  queueContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  queueItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  queueItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  queueItemArtist: {
    fontSize: 14,
  },
  queueItemActions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
    gap: 2,
  },
});

export default FullPlayer;
