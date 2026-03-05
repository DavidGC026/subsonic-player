import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subsonicApi } from '../api/subsonic';
import { CacheManager } from '../services/CacheManager';

interface AlbumArtProps {
  coverArtId?: string;
  size?: number;
  borderRadius?: number;
  iconSize?: number;
}

export const AlbumArt: React.FC<AlbumArtProps> = ({
  coverArtId,
  size = 150,
  borderRadius = 8,
  iconSize = 50,
}) => {
  const remoteUrl = subsonicApi.getCoverArtUrl(coverArtId, size * 2);
  // Use cached cover art if available (offline support), fall back to remote
  const imageUrl = CacheManager.getCoverArtUri(coverArtId, remoteUrl);

  if (!imageUrl) {
    return (
      <View
        style={[
          styles.placeholder,
          {
            width: size,
            height: size,
            borderRadius,
          },
        ]}
      >
        <Ionicons name="musical-note" size={iconSize} color="#b3b3b3" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={{
        width: size,
        height: size,
        borderRadius,
      }}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AlbumArt;
