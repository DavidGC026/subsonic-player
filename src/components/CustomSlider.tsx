import React, { useCallback, useRef } from 'react';
import {
    View,
    StyleSheet,
    PanResponder,
    LayoutChangeEvent,
    ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useThemeStore } from '../store';

interface CustomSliderProps {
    style?: ViewStyle;
    minimumValue?: number;
    maximumValue?: number;
    value?: number;
    onValueChange?: (value: number) => void;
    onSlidingStart?: (value: number) => void;
    onSlidingComplete?: (value: number) => void;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
    style,
    minimumValue = 0,
    maximumValue = 1,
    value = 0,
    onValueChange,
    onSlidingStart,
    onSlidingComplete,
    minimumTrackTintColor = '#B22222',
    maximumTrackTintColor = '#404040',
    thumbTintColor = '#ffffff',
}) => {
    const widthRef = useRef(0);
    const valueRef = useRef(value);
    valueRef.current = value;
    const { currentTheme } = useThemeStore();
    const useNyanCat = currentTheme.flags?.useNyanCatSlider ?? false;

    const clamp = (val: number, min: number, max: number) =>
        Math.min(Math.max(val, min), max);

    const getValueFromOffset = useCallback(
        (offsetX: number) => {
            const ratio = clamp(offsetX / widthRef.current, 0, 1);
            return minimumValue + ratio * (maximumValue - minimumValue);
        },
        [minimumValue, maximumValue]
    );

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                // Ignore clicks that are outside normal logic, but to prevent jumps, we just calculate from the current value
                valueRef.current = value;
                // If they just tapped somewhere, we can try to jump:
                const offsetX = evt.nativeEvent.locationX;
                let newValue = value;

                // Only jump if it's a reasonably large move (means they tapped, didn't drag thumb)
                const currentOffset = widthRef.current * ((value - minimumValue) / range);
                if (Math.abs(offsetX - currentOffset) > 20) {
                    newValue = getValueFromOffset(offsetX);
                    valueRef.current = newValue;
                }

                onSlidingStart?.(newValue);
                onValueChange?.(newValue);
            },
            onPanResponderMove: (evt, gestureState) => {
                // Use gestureState.dx to add to the initial value for smooth relative dragging
                const offsetDelta = gestureState.dx;
                const valueDelta = range > 0 ? (offsetDelta / widthRef.current) * range : 0;

                const newValue = clamp(valueRef.current + valueDelta, minimumValue, maximumValue);
                onValueChange?.(newValue);
            },
            onPanResponderRelease: (evt, gestureState) => {
                const offsetDelta = gestureState.dx;
                const valueDelta = range > 0 ? (offsetDelta / widthRef.current) * range : 0;

                const newValue = clamp(valueRef.current + valueDelta, minimumValue, maximumValue);
                onSlidingComplete?.(newValue);
            },
        })
    ).current;

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        widthRef.current = event.nativeEvent.layout.width;
    }, []);

    const range = maximumValue - minimumValue;
    const progress = range > 0 ? clamp((value - minimumValue) / range, 0, 1) : 0;

    return (
        <View
            style={[styles.container, style]}
            onLayout={handleLayout}
            {...panResponder.panHandlers}
        >
            <View style={styles.trackContainer} pointerEvents="none">
                <View
                    style={[
                        styles.track,
                        { backgroundColor: maximumTrackTintColor },
                    ]}
                >
                    {useNyanCat ? (
                        <LinearGradient
                            colors={['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={[
                                styles.filledTrack,
                                { width: `${progress * 100}%` },
                            ]}
                        />
                    ) : (
                        <View
                            style={[
                                styles.filledTrack,
                                {
                                    backgroundColor: minimumTrackTintColor,
                                    width: `${progress * 100}%`,
                                },
                            ]}
                        />
                    )}
                </View>
                {useNyanCat ? (
                    <View
                        style={[
                            styles.nyanThumbContainer,
                            { left: `${progress * 100}%` },
                        ]}
                    >
                        <Image
                            source={require('../../assets/nyan-cat.gif')}
                            style={styles.nyanThumb}
                            contentFit="contain"
                        />
                    </View>
                ) : (
                    <View
                        style={[
                            styles.thumb,
                            {
                                backgroundColor: thumbTintColor,
                                left: `${progress * 100}%`,
                            },
                        ]}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 40,
        justifyContent: 'center',
    },
    trackContainer: {
        height: 40,
        justifyContent: 'center',
        position: 'relative',
    },
    track: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    filledTrack: {
        height: '100%',
        borderRadius: 2,
    },
    thumb: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        marginLeft: -8,
        top: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    nyanThumbContainer: {
        position: 'absolute',
        width: 48,
        height: 32,
        marginLeft: -24,
        top: 4,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    nyanThumb: {
        width: '100%',
        height: '100%',
    },
});

export default CustomSlider;
