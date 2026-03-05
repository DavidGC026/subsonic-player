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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { CustomSlider } from './CustomSlider';
import { usePlayerStore, useThemeStore } from '../store';
import { useSleepTimerStore } from '../store/sleepTimerStore';
import { AlbumArt } from './AlbumArt';
import { VinylDisc } from './VinylDisc';
import { ThemeIcon } from './ThemeIcon';
import { AnimatedBackground } from './AnimatedBackground';
import { SleepTimerModal } from './SleepTimerModal';
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

// ─── Immersive Fullscreen View ───────────────────────────────────────────────

interface ImmersiveViewProps {
  currentSong: Song;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose?: () => void;
  onToggleStar: () => void;
  onToggleShuffle: () => void;
  onSetRepeatMode: () => void;
  shuffleMode: boolean;
  repeatMode: 'none' | 'all' | 'one';
  position: number;
  duration: number;
  onSeek: (value: number) => void;
  screenWidth: number;
  screenHeight: number;
  currentTheme: any;
}

const ImmersiveView: React.FC<ImmersiveViewProps> = ({
  currentSong,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  onClose,
  onToggleStar,
  onToggleShuffle,
  onSetRepeatMode,
  shuffleMode,
  repeatMode,
  position,
  duration,
  onSeek,
  screenWidth,
  screenHeight,
  currentTheme,
}) => {
  const [showControls, setShowControls] = useState(false);
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const heartScaleAnim = useRef(new RNAnimated.Value(0)).current;
  const heartOpacityAnim = useRef(new RNAnimated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPos, setSeekPos] = useState(0);

  const artSize = Math.min(screenWidth, screenHeight) * 0.55;
  const isStarred = !!currentSong.starred;
  const primaryColor = currentTheme.colors.primary;

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    }, 4000);
  }, [fadeAnim]);

  const toggleControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);

    if (showControls) {
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      setShowControls(true);
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      scheduleHide();
    }
  }, [showControls, fadeAnim, scheduleHide]);

  const handleToggleStar = useCallback(() => {
    // Giant heart animation
    heartScaleAnim.setValue(0);
    heartOpacityAnim.setValue(1);
    RNAnimated.sequence([
      RNAnimated.spring(heartScaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      RNAnimated.timing(heartOpacityAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    onToggleStar();
    // Reset auto-hide timer
    scheduleHide();
  }, [onToggleStar, heartScaleAnim, heartOpacityAnim, scheduleHide]);

  const handleSeekStart = useCallback((value: number) => {
    setIsSeeking(true);
    setSeekPos(value);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const handleSeekComplete = useCallback((value: number) => {
    onSeek(value);
    setIsSeeking(false);
    scheduleHide();
  }, [onSeek, scheduleHide]);

  const handleSeekChange = useCallback((value: number) => {
    setSeekPos(value);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const displayPosition = isSeeking ? seekPos : position;
  const displayDuration = duration || currentSong.duration * 1000;

  // Theme background rendering
  const renderBackground = () => {
    if (currentTheme.flags?.animatedBackground) {
      return <AnimatedBackground {...currentTheme.flags.animatedBackground} />;
    }
    if (currentTheme.flags?.useBackgroundImage) {
      return (
        <ImageBackground
          source={require('../../assets/fondo.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        </ImageBackground>
      );
    }
    // Default: gradient based on theme background color
    const bg = currentTheme.colors.background === 'transparent' ? '#121212' : currentTheme.colors.background;
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />;
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={immersiveStyles.container}
      onPress={toggleControls}
    >
      <StatusBar hidden />

      {/* Theme-aware background */}
      <View style={StyleSheet.absoluteFill}>
        {renderBackground()}
      </View>

      {/* Album art as Vinyl Disc */}
      <View style={immersiveStyles.artWrapper}>
        <VinylDisc
          coverArtId={currentSong.coverArt}
          size={artSize}
          isPlaying={isPlaying}
          primaryColor={currentTheme.colors.primary}
        />
      </View>

      {/* Song info (always visible, subtle) */}
      <View style={immersiveStyles.songInfoMinimal}>
        <Text style={immersiveStyles.songTitleMinimal} numberOfLines={1}>{currentSong.title}</Text>
        <Text style={immersiveStyles.songArtistMinimal} numberOfLines={1}>{currentSong.artist}</Text>
      </View>

      {/* Giant heart animation overlay (appears on star toggle) */}
      <RNAnimated.View
        pointerEvents="none"
        style={[
          immersiveStyles.giantHeartOverlay,
          {
            opacity: heartOpacityAnim,
            transform: [{ scale: heartScaleAnim }],
          },
        ]}
      >
        <Ionicons
          name={isStarred ? 'heart-outline' : 'heart'}
          size={120}
          color={primaryColor}
        />
      </RNAnimated.View>

      {/* Controls overlay (shown on tap) */}
      {showControls && (
        <RNAnimated.View style={[immersiveStyles.controlsOverlay, { opacity: fadeAnim }]}>
          {/* Top bar: close button */}
          <View style={immersiveStyles.topBar}>
            <TouchableOpacity
              style={immersiveStyles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Ionicons name="chevron-down" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Center: Giant heart button */}
          <View style={immersiveStyles.heartSection}>
            <TouchableOpacity
              onPress={handleToggleStar}
              activeOpacity={0.7}
              style={immersiveStyles.heartButton}
            >
              <Ionicons
                name={isStarred ? 'heart' : 'heart-outline'}
                size={80}
                color={isStarred ? primaryColor : 'rgba(255,255,255,0.8)'}
              />
            </TouchableOpacity>
          </View>

          {/* Bottom section: progress + controls */}
          <View style={immersiveStyles.bottomSection}>
            {/* Song info */}
            <View style={immersiveStyles.songInfoOverlay}>
              <Text style={immersiveStyles.songTitleOverlay} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={immersiveStyles.songArtistOverlay} numberOfLines={1}>{currentSong.artist} • {currentSong.album}</Text>
            </View>

            {/* Progress bar */}
            <View style={immersiveStyles.progressSection}>
              <CustomSlider
                style={immersiveStyles.slider}
                minimumValue={0}
                maximumValue={displayDuration}
                value={displayPosition}
                onSlidingStart={handleSeekStart}
                onSlidingComplete={handleSeekComplete}
                onValueChange={handleSeekChange}
                minimumTrackTintColor={primaryColor}
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor="#fff"
              />
              <View style={immersiveStyles.timeRow}>
                <Text style={immersiveStyles.timeText}>{formatTime(displayPosition)}</Text>
                <Text style={immersiveStyles.timeText}>{formatTime(displayDuration)}</Text>
              </View>
            </View>

            {/* Playback controls */}
            <View style={immersiveStyles.playbackRow}>
              <TouchableOpacity
                onPress={() => { onToggleShuffle(); scheduleHide(); }}
                style={immersiveStyles.secondaryBtn}
              >
                <ThemeIcon
                  name="shuffle"
                  size={22}
                  color={shuffleMode ? primaryColor : 'rgba(255,255,255,0.6)'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { onPrevious(); scheduleHide(); }}
                style={immersiveStyles.controlBtn}
              >
                <ThemeIcon name="play-skip-back" size={32} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { onTogglePlay(); scheduleHide(); }}
                style={[immersiveStyles.playBtn, { backgroundColor: primaryColor }]}
              >
                <ThemeIcon
                  name={isPlaying ? 'pause' : 'play'}
                  size={36}
                  color="#fff"
                  style={isPlaying ? {} : { marginLeft: 3 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { onNext(); scheduleHide(); }}
                style={immersiveStyles.controlBtn}
              >
                <ThemeIcon name="play-skip-forward" size={32} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { onSetRepeatMode(); scheduleHide(); }}
                style={immersiveStyles.secondaryBtn}
              >
                <ThemeIcon
                  name="repeat"
                  size={22}
                  color={repeatMode !== 'none' ? primaryColor : 'rgba(255,255,255,0.6)'}
                />
                {repeatMode === 'one' && (
                  <View style={[immersiveStyles.repeatBadge, { backgroundColor: primaryColor }]}>
                    <Text style={immersiveStyles.repeatBadgeText}>1</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </RNAnimated.View>
      )}
    </TouchableOpacity>
  );
};

const immersiveStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  coverArt: {
    borderRadius: 16,
  },
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfoMinimal: {
    position: 'absolute',
    bottom: 32,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  songTitleMinimal: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtistMinimal: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  giantHeartOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  closeBtn: {
    padding: 8,
  },
  heartSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    padding: 20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  songInfoOverlay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  songTitleOverlay: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  songArtistOverlay: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  secondaryBtn: {
    padding: 10,
  },
  controlBtn: {
    padding: 10,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  repeatBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatBadgeText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#fff',
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
  const [isImmersive, setIsImmersive] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const { currentTheme } = useThemeStore();
  const sleepTimerActive = useSleepTimerStore((s) => s.isActive);
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

  // ── Immersive Mode: Landscape on phones OR manually triggered ──
  if ((isLandscape && !isTablet) || isImmersive) {
    return (
      <ImmersiveView
        currentSong={currentSong}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onNext={playNext}
        onPrevious={playPrevious}
        onClose={() => {
          if (isImmersive) {
            setIsImmersive(false);
          } else if (onClose) {
            onClose();
          }
        }}
        onToggleStar={() => usePlayerStore.getState().toggleStar(currentSong.id, 'song', !!currentSong.starred)}
        onToggleShuffle={toggleShuffle}
        onSetRepeatMode={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
        shuffleMode={shuffleMode}
        repeatMode={repeatMode}
        position={position}
        duration={duration || currentSong.duration * 1000}
        onSeek={seekTo}
        screenWidth={isImmersive ? screenWidth : lsWidth}
        screenHeight={isImmersive ? screenWidth * 1.5 : lsHeight}
        currentTheme={currentTheme}
      />
    );
  }

  const displayPosition = isSeeking ? seekPosition : position;
  const displayDuration = duration || currentSong.duration * 1000;

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
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
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.moreButton} onPress={() => setShowSleepTimer(true)}>
            <Ionicons
              name={sleepTimerActive ? 'moon' : 'moon-outline'}
              size={22}
              color={sleepTimerActive ? currentTheme.colors.primary : currentTheme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton} onPress={() => setIsImmersive(true)}>
            <Ionicons name="expand" size={22} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton} onPress={() => setShowQueue(!showQueue)}>
            <Ionicons name={showQueue ? "close" : "list"} size={26} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>
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
            <VinylDisc
              coverArtId={currentSong.coverArt}
              size={artSize}
              isPlaying={isPlaying}
              primaryColor={currentTheme.colors.primary}
            />
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

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        visible={showSleepTimer}
        onClose={() => setShowSleepTimer(false)}
      />
    </GestureHandlerRootView>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
