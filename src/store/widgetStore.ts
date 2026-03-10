import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WidgetStyle = 'style_a' | 'style_b' | 'style_c' | 'style_d';

interface WidgetState {
    widgetStyle: WidgetStyle;
    setWidgetStyle: (style: WidgetStyle) => void;
}

export const useWidgetStore = create<WidgetState>()(
    persist(
        (set) => ({
            widgetStyle: 'style_a',
            setWidgetStyle: (style) => set({ widgetStyle: style }),
        }),
        {
            name: 'subsonic-widget-style',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useWidgetStore;
