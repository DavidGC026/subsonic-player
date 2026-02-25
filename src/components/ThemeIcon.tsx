import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useThemeStore } from '../store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ThemeIconProps {
    name: IoniconsName;
    size: number;
    color: string;
    style?: any;
}

export const ThemeIcon: React.FC<ThemeIconProps> = ({ name, size, color, style }) => {
    const { currentTheme } = useThemeStore();
    const useSpicetify = currentTheme.flags?.useSpicetifyIcons;

    if (useSpicetify) {
        if (name === 'play' || name === 'pause' || name === 'play-skip-back' || name === 'play-skip-forward') {
            const isPlaySkipBack = name === 'play-skip-back';
            const isPlaySkipForward = name === 'play-skip-forward';
            const rotation = isPlaySkipBack ? '-90deg' : isPlaySkipForward ? '90deg' : '0deg';
            return (
                <Image
                    source={require('../../assets/SpicetifyCat/assets/Paw.svg')}
                    style={[{ width: size, height: size, transform: [{ rotate: rotation }] }, style]}
                    tintColor={color}
                    contentFit="contain"
                />
            );
        }
        if (name === 'shuffle') {
            const isOn = color === currentTheme.colors.primary;
            const source = isOn
                ? require('../../assets/SpicetifyCat/assets/random-on.svg')
                : require('../../assets/SpicetifyCat/assets/random-off.svg');

            return (
                <Image
                    source={source}
                    style={[{ width: size, height: size }, style]}
                    tintColor={color}
                    contentFit="contain"
                />
            );
        }
        if (name === 'repeat') {
            const isOn = color === currentTheme.colors.primary;
            const source = isOn
                ? require('../../assets/SpicetifyCat/assets/cat-toy 2.svg')
                : require('../../assets/SpicetifyCat/assets/cat-toy 1.svg');

            return (
                <Image
                    source={source}
                    style={[{ width: size, height: size }, style]}
                    tintColor={color}
                    contentFit="contain"
                />
            );
        }
    }

    return <Ionicons name={name} size={size} color={color} style={style} />;
};
