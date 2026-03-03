/**
 * COMPATIBILITY LAYER
 *
 * This file provides backwards compatibility by combining usePlayerStore and
 * useLibraryStore into a single useMusicStore hook. This allows existing
 * consumers to continue working without changes.
 *
 * For new code, prefer importing usePlayerStore or useLibraryStore directly
 * for better re-render performance.
 */
import { usePlayerStore } from './playerStore';
import { useLibraryStore } from './libraryStore';

/**
 * Combined hook that merges playerStore and libraryStore state.
 * Use this for backwards compatibility. For new code, prefer the individual stores.
 */
export function useMusicStore() {
  const playerState = usePlayerStore();
  const libraryState = useLibraryStore();

  return {
    ...playerState,
    ...libraryState,
  };
}

/**
 * Namespace for static access (e.g. useMusicStore.getState())
 * Provides a merged snapshot of both stores.
 */
useMusicStore.getState = () => ({
  ...usePlayerStore.getState(),
  ...useLibraryStore.getState(),
});

export default useMusicStore;
