import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const NUM_STARS = 60;
const NUM_SHOOTING_STARS = 3;

interface AnimatedBackgroundProps {
    topColor: string;
    bottomColor: string;
    starColor: string;
}

const Star = ({ color }: { color: string }) => {
    const [size] = useState(() => Math.random() < 0.5 ? 2 : 3);
    const [left] = useState(() => Math.random() * width);
    const [top] = useState(() => Math.random() * height);
    const opacity = useRef(new Animated.Value(Math.random() * 0.5 + 0.3)).current;

    useEffect(() => {
        // Only animate a fraction of the stars to save performance
        if (Math.random() < 0.3) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: 0.1,
                        duration: Math.random() * 2000 + 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: Math.random() * 0.5 + 0.5,
                        duration: Math.random() * 2000 + 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, []);

    return (
        <Animated.View
            style={[
                styles.star,
                {
                    width: size,
                    height: size,
                    left,
                    top,
                    backgroundColor: color,
                    opacity,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                    elevation: size,
                },
            ]}
        />
    );
};

const ShootingStar = ({ color }: { color: string }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const translateX = useRef(new Animated.Value(width + 100)).current;

    useEffect(() => {
        const animate = () => {
            // Reset position: random starting point in top-right area
            const startX = Math.random() * width + width * 0.5;
            const startY = -100 + Math.random() * 100;

            translateX.setValue(startX);
            translateY.setValue(startY);

            // Random delay before starting
            const delay = Math.random() * 5000 + 2000;
            const duration = Math.random() * 1500 + 1000;

            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(translateX, {
                        toValue: startX - width - 200, // Move diagonally left
                        duration,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateY, {
                        toValue: startY + height + 200, // Move diagonally down
                        duration,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start(() => animate());
        };

        animate();
    }, []);

    return (
        <Animated.View
            style={[
                styles.shootingStarContainer,
                {
                    transform: [{ translateX }, { translateY }, { rotate: '-45deg' }],
                },
            ]}
        >
            <View style={[styles.shootingStarHead, { backgroundColor: color, shadowColor: color }]} />
            <LinearGradient
                colors={[color, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.shootingStarTail}
            />
        </Animated.View>
    );
};

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
    topColor,
    bottomColor,
    starColor,
}) => {
    const [stars, setStars] = useState<number[]>([]);
    const [shootingStars, setShootingStars] = useState<number[]>([]);

    useEffect(() => {
        // Generate arrays once to prevent remounting
        const s = Array.from({ length: NUM_STARS }, (_, i) => i);
        const ss = Array.from({ length: NUM_SHOOTING_STARS }, (_, i) => i);
        setStars(s);
        setShootingStars(ss);
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[topColor, bottomColor]}
                style={StyleSheet.absoluteFillObject}
            />
            {stars.map((key) => (
                <Star key={`star-${key}`} color={starColor} />
            ))}
            {shootingStars.map((key) => (
                <ShootingStar key={`shooting-${key}`} color={starColor} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    star: {
        position: 'absolute',
        borderRadius: 50,
    },
    shootingStarContainer: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        width: 200,
        height: 4,
    },
    shootingStarHead: {
        width: 4,
        height: 4,
        borderRadius: 2,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
    },
    shootingStarTail: {
        flex: 1,
        height: 1,
        opacity: 0.5,
    },
});
