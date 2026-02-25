import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useMusicStore, useThemeStore } from '../store';
import { AlbumArt } from './AlbumArt';
import { ThemeIcon } from './ThemeIcon';

const { width: screenWidth } = Dimensions.get('window');

interface MiniPlayerProps {
  onPress?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const { player, togglePlay, playNext } = useMusicStore();
  const { currentTheme } = useThemeStore();
  const { currentSong, isPlaying } = player;

  if (!currentSong) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: currentTheme.colors.surface, borderTopColor: currentTheme.colors.background }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.content}>
        <AlbumArt
          coverArtId={currentSong.coverArt}
          size={48}
          borderRadius={4}
          iconSize={20}
        />

        <View style={styles.info}>
          <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
            {currentSong.title}
          </Text>
          <Text style={[styles.artist, { color: currentTheme.colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
            {currentSong.artist}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThemeIcon
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color={currentTheme.colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={(e) => {
              e.stopPropagation();
              playNext();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThemeIcon name="play-skip-forward" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: currentTheme.colors.background }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: currentTheme.colors.primary,
              width: player.duration > 0
                ? `${(player.position / player.duration) * 100}%`
                : '0%',
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    marginLeft: 16,
    padding: 4,
  },
  progressBar: {
    height: 2,
  },
  progressFill: {
    height: '100%',
  },
});

export default MiniPlayer;
