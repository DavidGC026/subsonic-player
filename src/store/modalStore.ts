import { create } from 'zustand';
import type { Song } from '../types';

/**
 * Isolated store for modal state.
 * This prevents the global musicStore from triggering O(N) re-renders
 * across song lists when modals are opened/closed.
 */
interface ModalStore {
    optionsModalSong: Song | null;
    playlistModalSongs: Song[] | null;
    setOptionsModalSong: (song: Song | null) => void;
    setPlaylistModalSongs: (songs: Song[] | null) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
    optionsModalSong: null,
    playlistModalSongs: null,
    setOptionsModalSong: (song) => set({ optionsModalSong: song }),
    setPlaylistModalSongs: (songs) => set({ playlistModalSongs: songs }),
}));

export default useModalStore;
