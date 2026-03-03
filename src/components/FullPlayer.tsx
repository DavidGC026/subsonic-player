import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  Animated as RNAnimated,
  Image,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { CustomSlider } from './CustomSlider';
import { usePlayerStore, useThemeStore } from '../store';
import { AlbumArt } from './AlbumArt';
import { ThemeIcon } from './ThemeIcon';
import { AnimatedBackground } from './AnimatedBackground';
import { useIsTablet } from '../hooks/useIsTablet';
import { useLandscape } from '../hooks/useLandscape';
import { subsonicApi } from '../api/subsonic';
import type { Song } from '../types';

interface FullPlayerProps {
  onClose?: () => void;
}

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ─── Immersive Landscape View ────────────────────────────────────────────────

interface ImmersiveViewProps {
  currentSong: Song;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose?: () => void;
  screenWidth: number;
  screenHeight: number;
}

const ImmersiveView: React.FC<ImmersiveViewProps> = ({
  currentSong,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  onClose,
  screenWidth,
  screenHeight,
}) => {
  const [showControls, setShowControls] = useState(false);
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const artSize = Math.min(screenWidth, screenHeight) * 0.85;
  const coverUrl = subsonicApi.getCoverArtUrl(currentSong.coverArt, 1000);

  const toggleControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);

    if (showControls) {
      // Hide
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      // Show
      setShowControls(true);
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 4 seconds
      hideTimer.current = setTimeout(() => {
        RNAnimated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }, 4000);
    }
  }, [showControls, fadeAnim]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={immersiveStyles.container}
      onPress={toggleControls}
    >
      <StatusBar hidden />

      {/* Full-screen cover art */}
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={[immersiveStyles.coverArt, { width: artSize, height: artSize }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[immersiveStyles.placeholder, { width: artSize, height: artSize }]}>
          <Ionicons name="musical-note" size={120} color="#333" />
        </View>
      )}

      {/* Song title at bottom */}
      <View style={immersiveStyles.songInfo}>
        <Text style={immersiveStyles.songTitle} numberOfLines={1}>{currentSong.title}</Text>
        <Text style={immersiveStyles.songArtist} numberOfLines={1}>{currentSong.artist}</Text>
      </View>

      {/* Overlay controls (shown on tap) */}
      {showControls && (
        <RNAnimated.View style={[immersiveStyles.controlsOverlay, { opacity: fadeAnim }]}>
          {/* Close button */}
          <TouchableOpacity
            style={immersiveStyles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name="chevron-down" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Playback controls */}
          <View style={immersiveStyles.playbackRow}>
            <TouchableOpacity onPress={onPrevious} style={immersiveStyles.controlBtn}>
              <Ionicons name="play-skip-back" size={36} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onTogglePlay} style={immersiveStyles.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={48} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onNext} style={immersiveStyles.controlBtn}>
              <Ionicons name="play-skip-forward" size={36} color="#fff" />
            </TouchableOpacity>
          </View>
        </RNAnimated.View>
      )}
    </TouchableOpacity>
  );
};

const immersiveStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverArt: {
    borderRadius: 4,
  },
  placeholder: {
    backgroundColor: '#111',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  songTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  controlBtn: {
    padding: 12,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── Queue Item for Drag & Drop ─────────────────────────────────────────────

interface QueueItemProps {
  item: Song;
  index: number;
  currentIndex: number;
  currentTheme: any;
  onPress: (song: Song) => void;
  drag: () => void;
  isActive: boolean;
}

const QueueItem: React.FC<QueueItemProps> = React.memo(({
  item,
  index,
  currentIndex,
  currentTheme,
  onPress,
  drag,
  isActive,
}) => {
  return (
    <ScaleDecorator>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.queueItem,
          index === currentIndex && { backgroundColor: `${currentTheme.colors.primary}1A` },
          isActive && {
            backgroundColor: `${currentTheme.colors.primary}33`,
            shadowColor: currentTheme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
        ]}
        onPress={() => onPress(item)}
        onLongPress={drag}
        delayLongPress={150}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle}>
          <Ionicons
            name="reorder-three"
            size={20}
            color={isActive ? currentTheme.colors.primary : currentTheme.colors.textSecondary}
          />
        </View>

        <AlbumArt coverArtId={item.coverArt} size={48} borderRadius={4} iconSize={24} />
        <View style={styles.queueItemInfo}>
          <Text
            style={[
              styles.queueItemTitle,
              { color: currentTheme.colors.text },
              index === currentIndex && { color: currentTheme.colors.primary },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.queueItemArtist,
              { color: currentTheme.colors.textSecondary },
              index === currentIndex && { color: currentTheme.colors.primary },
            ]}
            numberOfLines={1}
          >
            {item.artist}
          </Text>
        </View>
        {index === currentIndex && (
          <Ionicons name="volume-medium" size={20} color={currentTheme.colors.primary} />
        )}
      </TouchableOpacity>
    </ScaleDecorator>
  );
});

// ─── Main FullPlayer Component ──────────────────────────────────────────────

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
  } = usePlayerStore();

  const { currentSong, isPlaying, position, duration, repeatMode, shuffleMode, volume, queue, currentIndex } = player;
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const { currentTheme } = useThemeStore();
  const { isTablet, screenWidth } = useIsTablet();
  const { isLandscape, screenWidth: lsWidth, screenHeight: lsHeight } = useLandscape();
  const artSize = isTablet ? screenWidth * 0.35 : screenWidth * 0.75;

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

  const handleQueueItemPress = useCallback((song: Song) => {
    playSong(song, queue);
    setShowQueue(false);
  }, [playSong, queue]);

  const handleDragEnd = useCallback(({ from, to }: { from: number; to: number }) => {
    if (from !== to) {
      reorderQueue(from, to);
    }
  }, [reorderQueue]);

  const renderQueueItem = useCallback(({ item, getIndex, drag, isActive }: RenderItemParams<Song>) => {
    const index = getIndex() ?? 0;
    return (
      <QueueItem
        item={item}
        index={index}
        currentIndex={currentIndex}
        currentTheme={currentTheme}
        onPress={handleQueueItemPress}
        drag={drag}
        isActive={isActive}
      />
    );
  }, [currentIndex, currentTheme, handleQueueItemPress]);

  if (!currentSong) {
    return null;
  }

  // ── Immersive Mode: Landscape on phones ──
  if (isLandscape && !isTablet) {
    return (
      <ImmersiveView
        currentSong={currentSong}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onNext={playNext}
        onPrevious={playPrevious}
        onClose={onClose}
        screenWidth={lsWidth}
        screenHeight={lsHeight}
      />
    );
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
            source={require('../../assets/fondo.jpg')}
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
          <DraggableFlatList
            data={queue}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderQueueItem}
            onDragEnd={handleDragEnd}
            showsVerticalScrollIndicator={false}
            containerStyle={styles.dragListContainer}
            activationDistance={10}
          />
        </View>
      ) : isTablet ? (
        /* Tablet: side-by-side layout */
        <View style={styles.tabletContent}>
          <View style={styles.tabletArtSide}>
            <AlbumArt coverArtId={currentSong.coverArt} size={artSize} borderRadius={12} iconSize={80} />
            <View style={[styles.infoContainer, { marginTop: 16 }]}>
              <View style={styles.titleRow}>
                <View style={styles.titleInfo}>
                  <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={1}>{currentSong.title}</Text>
                  <Text style={[styles.artist, { color: currentTheme.colors.textSecondary }]} numberOfLines={1}>{currentSong.artist} • {currentSong.album}</Text>
                </View>
                <TouchableOpacity style={styles.starButton} onPress={() => usePlayerStore.getState().toggleStar(currentSong.id, 'song', !!currentSong.starred)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={currentSong.starred ? "heart" : "heart-outline"} size={28} color={currentSong.starred ? currentTheme.colors.primary : currentTheme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.tabletControlsSide}>
            <View style={styles.progressContainer}>
              <CustomSlider style={styles.slider} minimumValue={0} maximumValue={displayDuration} value={displayPosition} onSlidingStart={handleSlidingStart} onSlidingComplete={handleSlidingComplete} onValueChange={handleValueChange} minimumTrackTintColor={currentTheme.colors.primary} maximumTrackTintColor={currentTheme.colors.surface} thumbTintColor={currentTheme.colors.text} />
              <View style={styles.timeContainer}>
                <Text style={[styles.timeText, { color: currentTheme.colors.textSecondary }]}>{formatTime(displayPosition)}</Text>
                <Text style={[styles.timeText, { color: currentTheme.colors.textSecondary }]}>{formatTime(displayDuration)}</Text>
              </View>
            </View>
            <View style={styles.controlsContainer}>
              <TouchableOpacity style={styles.secondaryControl} onPress={toggleShuffle}>
                <ThemeIcon name="shuffle" size={24} color={shuffleMode ? currentTheme.colors.primary : currentTheme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.mainControl} onPress={playPrevious}>
                <ThemeIcon name="play-skip-back" size={35} color={currentTheme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
                <View style={[styles.playButtonBackground, { backgroundColor: currentTheme.colors.text }]}>
                  <ThemeIcon name={isPlaying ? 'pause' : 'play'} size={40} color={currentTheme.colors.background} style={isPlaying ? {} : { marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mainControl} onPress={playNext}>
                <ThemeIcon name="play-skip-forward" size={35} color={currentTheme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryControl} onPress={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}>
                <ThemeIcon name="repeat" size={24} color={repeatMode !== 'none' ? currentTheme.colors.primary : currentTheme.colors.textSecondary} />
                {repeatMode === 'one' && (
                  <View style={[styles.repeatOneBadge, { backgroundColor: currentTheme.colors.primary }]}>
                    <Text style={[styles.repeatOneText, { color: currentTheme.colors.background }]}>1</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.volumeContainer}>
              <Ionicons name="volume-low" size={20} color={currentTheme.colors.textSecondary} />
              <CustomSlider style={styles.volumeSlider} minimumValue={0} maximumValue={1} value={volume} onValueChange={setVolume} minimumTrackTintColor={currentTheme.colors.text} maximumTrackTintColor={currentTheme.colors.surface} thumbTintColor={currentTheme.colors.text} />
              <Ionicons name="volume-high" size={20} color={currentTheme.colors.textSecondary} />
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Phone: vertical layout */}
          <View style={styles.artContainer}>
            <AlbumArt coverArtId={currentSong.coverArt} size={artSize} borderRadius={12} iconSize={80} />
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.titleRow}>
              <View style={styles.titleInfo}>
                <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{currentSong.title}</Text>
                <Text style={[styles.artist, { color: currentTheme.colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{currentSong.artist} • {currentSong.album}</Text>
              </View>
              <TouchableOpacity style={styles.starButton} onPress={() => usePlayerStore.getState().toggleStar(currentSong.id, 'song', !!currentSong.starred)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={currentSong.starred ? "heart" : "heart-outline"} size={28} color={currentSong.starred ? currentTheme.colors.primary : currentTheme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <CustomSlider style={styles.slider} minimumValue={0} maximumValue={displayDuration} value={displayPosition} onSlidingStart={handleSlidingStart} onSlidingComplete={handleSlidingComplete} onValueChange={handleValueChange} minimumTrackTintColor={currentTheme.colors.primary} maximumTrackTintColor={currentTheme.colors.surface} thumbTintColor={currentTheme.colors.text} />
            <View style={styles.timeContainer}>
              <Text style={[styles.timeText, { color: currentTheme.colors.textSecondary }]}>{formatTime(displayPosition)}</Text>
              <Text style={[styles.timeText, { color: currentTheme.colors.textSecondary }]}>{formatTime(displayDuration)}</Text>
            </View>
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.secondaryControl} onPress={toggleShuffle}>
              <ThemeIcon name="shuffle" size={24} color={shuffleMode ? currentTheme.colors.primary : currentTheme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mainControl} onPress={playPrevious}>
              <ThemeIcon name="play-skip-back" size={35} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
              <View style={[styles.playButtonBackground, { backgroundColor: currentTheme.colors.text }]}>
                <ThemeIcon name={isPlaying ? 'pause' : 'play'} size={40} color={currentTheme.colors.background} style={isPlaying ? {} : { marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mainControl} onPress={playNext}>
              <ThemeIcon name="play-skip-forward" size={35} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryControl} onPress={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}>
              <ThemeIcon name="repeat" size={24} color={repeatMode !== 'none' ? currentTheme.colors.primary : currentTheme.colors.textSecondary} />
              {repeatMode === 'one' && (
                <View style={[styles.repeatOneBadge, { backgroundColor: currentTheme.colors.primary }]}>
                  <Text style={[styles.repeatOneText, { color: currentTheme.colors.background }]}>1</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.volumeContainer}>
            <Ionicons name="volume-low" size={20} color={currentTheme.colors.textSecondary} />
            <CustomSlider style={styles.volumeSlider} minimumValue={0} maximumValue={1} value={volume} onValueChange={setVolume} minimumTrackTintColor={currentTheme.colors.text} maximumTrackTintColor={currentTheme.colors.surface} thumbTintColor={currentTheme.colors.text} />
            <Ionicons name="volume-high" size={20} color={currentTheme.colors.textSecondary} />
          </View>
        </>
      )}
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
  // Queue with Drag & Drop
  queueContainer: {
    flex: 1,
    paddingBottom: 16,
  },
  dragListContainer: {
    paddingHorizontal: 16,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  dragHandle: {
    paddingRight: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Tablet styles
  tabletContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  tabletArtSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletControlsSide: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
});

export default FullPlayer;
