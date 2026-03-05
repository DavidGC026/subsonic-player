// Individual stores (preferred for new code)
export { usePlayerStore } from './playerStore';
export { useLibraryStore } from './libraryStore';

// Combined store (backwards compatibility)
export { useMusicStore } from './musicStore';

// Other stores
export { useConfigStore } from './configStore';
export { useThemeStore, Theme, defaultTheme, spicetifyCatTheme } from './themeStore';
export { useDownloadStore } from './downloadStore';
export type { DownloadedSong } from './downloadStore';
export { useModalStore } from './modalStore';
export { useSleepTimerStore } from './sleepTimerStore';
