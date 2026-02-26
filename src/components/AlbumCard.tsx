import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlbumArt } from './AlbumArt';
import type { Album } from '../types';

interface AlbumCardProps {
  album: Album;
  onPress?: (album: Album) => void;
  size?: number;
}

export const AlbumCard: React.FC<AlbumCardProps> = React.memo(({
  album,
  onPress,
  size = 130,
}) => {
  const handlePress = () => {
    onPress?.(album);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <AlbumArt
        coverArtId={album.coverArt}
        size={size}
        borderRadius={8}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {album.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
          {album.artist}
        </Text>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => prev.album.id === next.album.id && prev.size === next.size);

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  info: {
    marginTop: 8,
  },
  name: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 11,
    marginTop: 2,
  },
});

export default AlbumCard;
