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
        useBlurEffects?: boolean;
        useBackgroundImage?: boolean;
        useGlassmorphism?: boolean;
        useSpicetifyIcons?: boolean;
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
            installedThemes: [defaultTheme, spicetifyCatTheme],

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
