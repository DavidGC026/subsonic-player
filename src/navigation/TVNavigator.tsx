import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, ImageBackground, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useThemeStore, useConfigStore } from '../store';
import { AnimatedBackground } from '../components';
import { TVHomeScreen } from '../screens/tv/TVHomeScreen';
import { TVPlayerScreen } from '../screens/tv/TVPlayerScreen';
import { TVSearchScreen } from '../screens/tv/TVSearchScreen';
import { TVConnectScreen } from '../screens/tv/TVConnectScreen';
import { TVAlbumDetailScreen } from '../screens/tv/TVAlbumDetailScreen';
import { TVArtistDetailScreen } from '../screens/tv/TVArtistDetailScreen';
import { TVLibraryScreen } from '../screens/tv/TVLibraryScreen';

const Stack = createNativeStackNavigator();

export const TVNavigator: React.FC = () => {
    const { currentTheme } = useThemeStore();
    const { loadConfig, isConfigured } = useConfigStore();

    useEffect(() => {
        loadConfig();
    }, []);

    const navTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: 'transparent',
        },
    };

    const NavigatorContent = (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'fade',
            }}
        >
            {isConfigured ? (
                <>
                    <Stack.Screen name="TVHome" component={TVHomeScreen} />
                    <Stack.Screen name="TVSearch" component={TVSearchScreen} />
                    <Stack.Screen name="TVPlayer" component={TVPlayerScreen} />
                    <Stack.Screen name="TVLibrary" component={TVLibraryScreen} />
                    <Stack.Screen name="TVAlbumDetail" component={TVAlbumDetailScreen} />
                    <Stack.Screen name="TVArtistDetail" component={TVArtistDetailScreen} />
                </>
            ) : (
                <Stack.Screen name="TVConnect" component={TVConnectScreen} />
            )}
        </Stack.Navigator>
    );

    return (
        <SafeAreaProvider>
            <NavigationContainer theme={navTheme}>
                {currentTheme.flags?.animatedBackground ? (
                    <View style={styles.container}>
                        <AnimatedBackground {...currentTheme.flags.animatedBackground} />
                        {NavigatorContent}
                    </View>
                ) : currentTheme.flags?.useBackgroundImage ? (
                    <ImageBackground
                        source={require('../../assets/fondo.jpg')}
                        style={styles.container}
                        resizeMode="cover"
                    >
                        {NavigatorContent}
                    </ImageBackground>
                ) : (
                    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
                        {NavigatorContent}
                    </View>
                )}
            </NavigationContainer>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default TVNavigator;
