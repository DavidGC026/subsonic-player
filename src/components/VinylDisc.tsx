import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subsonicApi } from '../api/subsonic';

interface VinylDiscProps {
    coverArtId?: string;
    size: number;
    isPlaying: boolean;
    primaryColor?: string;
}

/**
 * A vinyl record component that displays album art as a spinning disc.
 * The cover art is shown in the center of a vinyl record, and the disc
 * spins continuously while isPlaying is true.
 */
export const VinylDisc: React.FC<VinylDiscProps> = ({
    coverArtId,
    size,
    isPlaying,
    primaryColor = '#B22222',
}) => {
    const spinAnim = useRef(new Animated.Value(0)).current;
    const animRef = useRef<Animated.CompositeAnimation | null>(null);

    // The cover art circle is ~55% of the total disc size
    const coverSize = size * 0.55;
    // The center hole
    const holeSize = size * 0.06;
    // Groove ring sizes
    const grooveRingOuter = size * 0.92;
    const grooveRingInner = size * 0.72;

    const imageUrl = subsonicApi.getCoverArtUrl(coverArtId, Math.round(coverSize * 2));

    useEffect(() => {
        if (isPlaying) {
            // Start or resume spinning
            animRef.current = Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 12000, // 12 seconds per revolution for a nice slow spin
                    easing: Easing.linear,
                    useNativeDriver: true,
                    isInteraction: false,
                })
            );
            animRef.current.start();
        } else {
            // Stop the animation but keep the current rotation value
            if (animRef.current) {
                animRef.current.stop();
                animRef.current = null;
            }
        }

        return () => {
            if (animRef.current) {
                animRef.current.stop();
            }
        };
    }, [isPlaying, spinAnim]);

    // Reset spin when cover art changes (new song)
    useEffect(() => {
        spinAnim.setValue(0);
    }, [coverArtId]);

    const rotation = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Animated.View
                style={[
                    styles.disc,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        transform: [{ rotate: rotation }],
                    },
                ]}
            >
                {/* Vinyl base (black disc) */}
                <View
                    style={[
                        styles.vinylBase,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                        },
                    ]}
                />

                {/* Outer groove ring */}
                <View
                    style={[
                        styles.grooveRing,
                        {
                            width: grooveRingOuter,
                            height: grooveRingOuter,
                            borderRadius: grooveRingOuter / 2,
                            borderColor: 'rgba(60, 60, 60, 0.6)',
                        },
                    ]}
                />

                {/* Inner groove ring */}
                <View
                    style={[
                        styles.grooveRing,
                        {
                            width: grooveRingInner,
                            height: grooveRingInner,
                            borderRadius: grooveRingInner / 2,
                            borderColor: 'rgba(70, 70, 70, 0.5)',
                        },
                    ]}
                />

                {/* Groove lines (decorative) */}
                {[0.96, 0.88, 0.84, 0.78, 0.74].map((ratio, i) => {
                    const ringSize = size * ratio;
                    return (
                        <View
                            key={i}
                            style={[
                                styles.grooveLine,
                                {
                                    width: ringSize,
                                    height: ringSize,
                                    borderRadius: ringSize / 2,
                                },
                            ]}
                        />
                    );
                })}

                {/* Cover art (label area) */}
                <View
                    style={[
                        styles.coverContainer,
                        {
                            width: coverSize,
                            height: coverSize,
                            borderRadius: coverSize / 2,
                        },
                    ]}
                >
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={{
                                width: coverSize,
                                height: coverSize,
                                borderRadius: coverSize / 2,
                            }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            style={[
                                styles.placeholder,
                                {
                                    width: coverSize,
                                    height: coverSize,
                                    borderRadius: coverSize / 2,
                                },
                            ]}
                        >
                            <Ionicons name="musical-note" size={coverSize * 0.4} color="#b3b3b3" />
                        </View>
                    )}
                </View>

                {/* Center hole */}
                <View
                    style={[
                        styles.centerHole,
                        {
                            width: holeSize,
                            height: holeSize,
                            borderRadius: holeSize / 2,
                        },
                    ]}
                />

                {/* Shiny highlight reflection on the vinyl */}
                <View
                    style={[
                        styles.reflection,
                        {
                            width: size * 0.85,
                            height: size * 0.85,
                            borderRadius: (size * 0.85) / 2,
                        },
                    ]}
                />
            </Animated.View>

            {/* Shadow underneath */}
            <View
                style={[
                    styles.shadow,
                    {
                        width: size * 0.9,
                        height: size * 0.08,
                        bottom: -size * 0.02,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    disc: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    vinylBase: {
        position: 'absolute',
        backgroundColor: '#1a1a1a',
        // Subtle radial gradient effect via border
        borderWidth: 1,
        borderColor: '#333',
    },
    grooveRing: {
        position: 'absolute',
        borderWidth: 1,
    },
    grooveLine: {
        position: 'absolute',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(50, 50, 50, 0.4)',
    },
    coverContainer: {
        position: 'absolute',
        overflow: 'hidden',
        // Subtle border to separate label from vinyl
        borderWidth: 2,
        borderColor: 'rgba(0, 0, 0, 0.3)',
    },
    placeholder: {
        backgroundColor: '#282828',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerHole: {
        position: 'absolute',
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#444',
    },
    reflection: {
        position: 'absolute',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.04)',
        // Offset the reflection slightly for realism
        transform: [{ translateX: -2 }, { translateY: -2 }],
    },
    shadow: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 100,
    },
});

export default VinylDisc;
