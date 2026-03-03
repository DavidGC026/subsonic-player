import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AlbumArt } from './AlbumArt';
import type { Song } from '../types';
import { usePlayerStore, useThemeStore, useDownloadStore } from '../store';
import { useModalStore } from '../store/modalStore';

interface SongItemProps {
  song: Song;
  onPress?: (song: Song) => void;
  onOptionsPress?: (song: Song) => void;
  isPlaying?: boolean;
  showArt?: boolean;
  index?: number;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SongItem: React.FC<SongItemProps> = React.memo(({
  song,
  onPress,
  onOptionsPress,
  isPlaying = false,
  showArt = true,
  index,
}) => {
  const currentTheme = useThemeStore(state => state.currentTheme);
  const songIsDownloaded = useDownloadStore(state => state.isDownloaded(song.id));
  const isCurrentlyDownloading = useDownloadStore(state => state.currentDownload?.songId === song.id);

  const handlePress = () => {
    onPress?.(song);
  };

  const handleOptionsPress = () => {
    if (onOptionsPress) {
      onOptionsPress(song);
    } else {
      // Defer state update to after touch animation completes
      InteractionManager.runAfterInteractions(() => {
        useModalStore.getState().setOptionsModalSong(song);
      });
    }
  };

  const handleStarPress = () => {
    usePlayerStore.getState().toggleStar(song.id, 'song', !!song.starred);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.playingContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {index !== undefined && (
        <View style={styles.indexContainer}>
          {isPlaying ? (
            <Ionicons name="volume-medium" size={16} color={currentTheme.colors.primary} />
          ) : (
            <Text style={[styles.index, { color: currentTheme.colors.textSecondary }]}>{index + 1}</Text>
          )}
        </View>
      )}

      {showArt && (
        <AlbumArt
          coverArtId={song.coverArt}
          size={50}
          borderRadius={4}
          iconSize={24}
        />
      )}

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: currentTheme.colors.text }, isPlaying && { color: currentTheme.colors.primary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {song.title}
          </Text>
          {songIsDownloaded && (
            <Ionicons name="arrow-down-circle" size={14} color="#1DB954" style={styles.downloadedIcon} />
          )}
          {isCurrentlyDownloading && (
            <Ionicons name="cloud-download-outline" size={14} color={currentTheme.colors.textSecondary} style={styles.downloadedIcon} />
          )}
        </View>
        <Text style={[styles.artist, { color: currentTheme.colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
          {song.artist}
        </Text>
      </View>

      <Text style={[styles.duration, { color: currentTheme.colors.textSecondary }]}>
        {formatDuration(song.duration)}
      </Text>

      <TouchableOpacity
        style={styles.starButton}
        onPress={handleStarPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={song.starred ? "heart" : "heart-outline"}
          size={20}
          color={song.starred ? currentTheme.colors.primary : currentTheme.colors.textSecondary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionsButton}
        onPress={handleOptionsPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={currentTheme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.song.id === nextProps.song.id &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.index === nextProps.index &&
    prevProps.showArt === nextProps.showArt;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  playingContainer: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  indexContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  index: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flexShrink: 1,
  },
  downloadedIcon: {
    marginLeft: 6,
  },
  playingTitle: {
    color: '#B22222',
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 2,
  },
  duration: {
    color: '#b3b3b3',
    fontSize: 14,
    marginLeft: 8,
  },
  starButton: {
    padding: 4,
    marginLeft: 8,
  },
  optionsButton: {
    padding: 4,
    marginLeft: 4,
  },
});

export default SongItem;
