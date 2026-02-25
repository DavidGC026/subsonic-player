import { create } from 'zustand/react';
import * as SecureStore from 'expo-secure-store';
import type { ServerConfig } from '../types';
import { subsonicApi } from '../api/subsonic';

interface ConfigState {
  serverConfig: ServerConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: (config: ServerConfig) => Promise<boolean>;
  clearConfig: () => Promise<void>;
  testConnection: (config: ServerConfig) => Promise<boolean>;
}

const CONFIG_KEY = 'subsonic_server_config';

export const useConfigStore = create<ConfigState>((set, get) => ({
  serverConfig: null,
  isConfigured: false,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    try {
      set({ isLoading: true, error: null });

      const configJson = await SecureStore.getItemAsync(CONFIG_KEY);

      if (configJson) {
        const config: ServerConfig = JSON.parse(configJson);
        subsonicApi.setConfig(config);
        set({
          serverConfig: config,
          isConfigured: true,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      set({
        error: 'Failed to load configuration',
        isLoading: false
      });
    }
  },

  saveConfig: async (config: ServerConfig): Promise<boolean> => {
    try {
      set({ isLoading: true, error: null });

      // Test connection first
      subsonicApi.setConfig(config);
      const isConnected = await subsonicApi.ping();

      if (!isConnected) {
        set({
          error: 'Could not connect to server. Please check your settings.',
          isLoading: false
        });
        return false;
      }

      // Save to secure storage
      await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(config));

      set({
        serverConfig: config,
        isConfigured: true,
        isLoading: false,
        error: null
      });

      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      set({
        error: 'Failed to save configuration',
        isLoading: false
      });
      return false;
    }
  },

  clearConfig: async () => {
    try {
      await SecureStore.deleteItemAsync(CONFIG_KEY);
      set({
        serverConfig: null,
        isConfigured: false,
        error: null
      });
    } catch (error) {
      console.error('Error clearing config:', error);
    }
  },

  testConnection: async (config: ServerConfig): Promise<boolean> => {
    try {
      set({ isLoading: true, error: null });

      subsonicApi.setConfig(config);
      const isConnected = await subsonicApi.ping();

      set({ isLoading: false });

      if (!isConnected) {
        set({ error: 'Could not connect to server' });
      }

      return isConnected;
    } catch (error) {
      console.error('Error testing connection:', error);
      set({
        error: 'Connection test failed',
        isLoading: false
      });
      return false;
    }
  },
}));

export default useConfigStore;
