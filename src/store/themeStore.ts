import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Theme {
    id: string;
    name: string;
    colors: {
        primary: string; // The vibrant accent color
        background: string; // Main app background
        surface: string; // Cards, modals, elevated surfaces
        text: string; // Main text color
        textSecondary: string; // Subtitle, less important text
        black: string; // Pure black or very dark equivalent
    };
    flags?: {
        useNyanCatSlider?: boolean;
        useBackgroundImage?: boolean;
        useGlassmorphism?: boolean;
        useSpicetifyIcons?: boolean;
        animatedBackground?: {
            type: 'starry';
            topColor: string;
            bottomColor: string;
            starColor: string;
        };
        backgroundImageName?: string;
    };
}

export const defaultTheme: Theme = {
    id: 'default-red',
    name: 'Rojo Subsonic (Predeterminado)',
    colors: {
        primary: '#B22222',
        background: '#121212',
        surface: '#282828',
        text: '#ffffff',
        textSecondary: '#b3b3b3',
        black: '#000000',
    },
};

export const spicetifyCatTheme: Theme = {
    id: 'spicetify-cat',
    name: 'SpicetifyCat',
    colors: {
        primary: '#B693CE',
        background: 'transparent',
        surface: 'rgba(0, 0, 0, 0.4)',
        text: '#ffffff',
        textSecondary: '#b3b3b3',
        black: '#000000',
    },
    flags: {
        useNyanCatSlider: true,
        useBackgroundImage: true,
        useGlassmorphism: true,
        useSpicetifyIcons: true,
        backgroundImageName: 'spicetify-cat',
    }
};

export const starryBaseTheme: Theme = {
    id: 'starry-base',
    name: 'StarryNight - Base',
    colors: {
        primary: '#FFF3C4',
        background: 'transparent',
        surface: 'rgba(0, 0, 0, 0.4)',
        text: '#FFFFFF',
        textSecondary: '#ADB5BD',
        black: '#000000',
    },
    flags: {
        useBackgroundImage: false,
        useGlassmorphism: true,
        animatedBackground: {
            type: 'starry',
            topColor: '#000000',
            bottomColor: '#142b44',
            starColor: '#FFFFFF'
        },
    }
};

export const starryCottonCandyTheme: Theme = {
    id: 'starry-cotton-candy',
    name: 'StarryNight - Cotton Candy',
    colors: {
        primary: '#d3e9ff',
        background: 'transparent',
        surface: 'rgba(0, 0, 0, 0.4)',
        text: '#FFFFFF',
        textSecondary: '#fff4f4',
        black: '#000000',
    },
    flags: {
        useBackgroundImage: false,
        useGlassmorphism: true,
        animatedBackground: {
            type: 'starry',
            topColor: '#ff71b2',
            bottomColor: '#509be1',
            starColor: '#FFFFFF'
        },
    }
};

export const starryForestTheme: Theme = {
    id: 'starry-forest',
    name: 'StarryNight - Forest',
    colors: {
        primary: '#c4c6ff',
        background: 'transparent',
        surface: 'rgba(0, 0, 0, 0.4)',
        text: '#FFFFFF',
        textSecondary: '#ADB5BD',
        black: '#000000',
    },
    flags: {
        useBackgroundImage: false,
        useGlassmorphism: true,
        animatedBackground: {
            type: 'starry',
            topColor: '#000000',
            bottomColor: '#14442b',
            starColor: '#FFFFFF'
        },
    }
};

export const starryGalaxyTheme: Theme = {
    id: 'starry-galaxy',
    name: 'StarryNight - Galaxy',
    colors: {
        primary: '#FFF3C4',
        background: 'transparent',
        surface: 'rgba(0, 0, 0, 0.4)',
        text: '#ffe4f2',
        textSecondary: '#FFFFFF',
        black: '#000000',
    },
    flags: {
        useBackgroundImage: false,
        useGlassmorphism: true,
        animatedBackground: {
            type: 'starry',
            topColor: '#00076f',
            bottomColor: '#b133c9',
            starColor: '#FFFFFF'
        },
    }
};

export const starryOrangeTheme: Theme = {
    id: 'starry-orange',
    name: 'StarryNight - Orange',
    colors: {
        primary: '#fbe39b',
        background: 'transparent',
        surface: 'rgba(0, 0, 0, 0.4)',
        text: '#FFFFFF',
        textSecondary: '#FFFFFF',
        black: '#000000',
    },
    flags: {
        useBackgroundImage: false,
        useGlassmorphism: true,
        animatedBackground: {
            type: 'starry',
            topColor: '#000000',
            bottomColor: '#e69138',
            starColor: '#ffe234'
        },
    }
};

export const starrySkyTheme: Theme = {
    id: 'starry-sky',
    name: 'StarryNight - Sky',
    colors: {
        primary: '#FFF3C4',
        background: 'transparent',
        surface: 'rgba(0, 0, 0, 0.4)',
        text: '#FFFFFF',
        textSecondary: '#040a18',
        black: '#000000',
    },
    flags: {
        useBackgroundImage: false,
        useGlassmorphism: true,
        animatedBackground: {
            type: 'starry',
            topColor: '#1e48a9',
            bottomColor: '#62cff4',
            starColor: '#FFFFFF'
        },
    }
};

export const starrySunriseTheme: Theme = {
    id: 'starry-sunrise',
    name: 'StarryNight - Sunrise',
    colors: {
        primary: '#FFF3C4',
        background: 'transparent',
        surface: 'rgba(0, 0, 0, 0.4)',
        text: '#FFFFFF',
        textSecondary: '#E0E0E0',
        black: '#000000',
    },
    flags: {
        useBackgroundImage: false,
        useGlassmorphism: true,
        animatedBackground: {
            type: 'starry',
            topColor: '#FFAE41',
            bottomColor: '#F83D41',
            starColor: '#FFFFFF'
        },
    }
};

interface ThemeState {
    currentTheme: Theme;
    installedThemes: Theme[];
    setTheme: (themeId: string) => void;
    installTheme: (theme: Theme) => void;
    deleteTheme: (themeId: string) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            currentTheme: defaultTheme,
            installedThemes: [
                defaultTheme,
                spicetifyCatTheme,
                starryBaseTheme,
                starryCottonCandyTheme,
                starryForestTheme,
                starryGalaxyTheme,
                starryOrangeTheme,
                starrySkyTheme,
                starrySunriseTheme
            ],

            setTheme: (themeId: string) => {
                const theme = get().installedThemes.find(t => t.id === themeId);
                if (theme) {
                    set({ currentTheme: theme });
                }
            },

            installTheme: (newTheme: Theme) => {
                set((state) => {
                    // Check if theme already exists
                    const existsIndex = state.installedThemes.findIndex(t => t.id === newTheme.id);
                    if (existsIndex >= 0) {
                        // Update existing theme
                        const newInstalled = [...state.installedThemes];
                        newInstalled[existsIndex] = newTheme;
                        return { installedThemes: newInstalled };
                    }
                    return { installedThemes: [...state.installedThemes, newTheme] };
                });
            },

            deleteTheme: (themeId: string) => {
                if (themeId === defaultTheme.id) return; // Cannot delete default

                set((state) => {
                    const newThemes = state.installedThemes.filter(t => t.id !== themeId);
                    // If we are deleting the active theme, revert to default
                    if (state.currentTheme.id === themeId) {
                        return {
                            installedThemes: newThemes,
                            currentTheme: defaultTheme
                        };
                    }
                    return { installedThemes: newThemes };
                });
            }
        }),
        {
            name: 'subsonic-theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
