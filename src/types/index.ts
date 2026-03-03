// Tipos principales de la aplicación Subsonic

export interface ServerConfig {
  url: string;
  username: string;
  password: string;
  useLegacyAuth?: boolean;
  apiVersion?: string; // Subsonic API version, defaults to '1.16.1'
}

export interface SubsonicResponse {
  status: 'ok' | 'failed';
  version: string;
  error?: {
    code: number;
    message: string;
  };
}

export interface Artist {
  id: string;
  name: string;
  coverArt?: string;
  albumCount?: number;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  coverArt?: string;
  songCount?: number;
  duration?: number;
  year?: number;
  genre?: string;
}

export interface Song {
  id: string;
  parent: string;
  isDir: boolean;
  title: string;
  album: string;
  albumId?: string;
  artist: string;
  artistId?: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  duration: number;
  bitRate?: number;
  contentType?: string;
  suffix?: string;
  path?: string;
  starred?: string; // Date string if starred
}

export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  owner?: string;
  public?: boolean;
  songCount: number;
  duration: number;
  created?: string;
  changed?: string;
  coverArt?: string;
}

export interface Directory {
  id: string;
  parent?: string;
  name: string;
  starred?: string;
  album?: string;
  artist?: string;
  coverArt?: string;
  songCount?: number;
  child?: Song[];
}

export interface SearchResult {
  artist?: Artist[];
  album?: Album[];
  song?: Song[];
}

export interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  repeatMode: 'none' | 'all' | 'one';
  shuffleMode: boolean;
  volume: number;
}

export interface MusicState {
  // Player state
  player: PlayerState;

  // Library data
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];

  // Loading states
  isLoadingArtists: boolean;
  isLoadingAlbums: boolean;
  isLoadingPlaylists: boolean;

  // Actions
  setCurrentSong: (song: Song | null) => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setRepeatMode: (mode: 'none' | 'all' | 'one') => void;
  toggleShuffle: () => void;
  setVolume: (volume: number) => void;

  // Library actions
  setArtists: (artists: Artist[]) => void;
  setAlbums: (albums: Album[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;

  // Fetch actions
  fetchArtists: () => Promise<void>;
  fetchAlbums: () => Promise<void>;
  fetchPlaylists: () => Promise<void>;
  fetchAlbumSongs: (albumId: string) => Promise<Song[]>;
  fetchArtistAlbums: (artistId: string) => Promise<Album[]>;
  search: (query: string) => Promise<SearchResult>;
}
