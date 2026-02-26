import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlbumArt } from './AlbumArt';
import type { Artist } from '../types';

interface ArtistCardProps {
  artist: Artist;
  onPress?: (artist: Artist) => void;
  size?: number;
}

export const ArtistCard: React.FC<ArtistCardProps> = React.memo(({
  artist,
  onPress,
  size = 130,
}) => {
  const handlePress = () => {
    onPress?.(artist);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <AlbumArt
        coverArtId={artist.coverArt}
        size={size}
        borderRadius={size / 2}
        iconSize={40}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {artist.name}
        </Text>
        {artist.albumCount && (
          <Text style={styles.albumCount} numberOfLines={1}>
            {artist.albumCount} {artist.albumCount === 1 ? 'álbum' : 'álbumes'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => prev.artist.id === next.artist.id && prev.size === next.size);

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  info: {
    marginTop: 8,
    alignItems: 'center',
  },
  name: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  albumCount: {
    color: '#b3b3b3',
    fontSize: 11,
    marginTop: 2,
  },
});

export default ArtistCard;
