import { create } from 'zustand/react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStore {
    isConnected: boolean;
    isInternetReachable: boolean | null;
    isOffline: boolean; // Convenience: !isConnected || isInternetReachable === false
    startListening: () => () => void;
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
    isConnected: true,
    isInternetReachable: true,
    isOffline: false,

    startListening: () => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const isConnected = state.isConnected ?? false;
            const isInternetReachable = state.isInternetReachable;
            // Consider offline if not connected OR internet is explicitly not reachable
            const isOffline = !isConnected || isInternetReachable === false;

            set({ isConnected, isInternetReachable, isOffline });
        });

        // Also fetch initial state
        NetInfo.fetch().then((state: NetInfoState) => {
            const isConnected = state.isConnected ?? false;
            const isInternetReachable = state.isInternetReachable;
            const isOffline = !isConnected || isInternetReachable === false;
            set({ isConnected, isInternetReachable, isOffline });
        });

        return unsubscribe;
    },
}));

export default useNetworkStore;
