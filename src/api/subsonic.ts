import md5 from 'md5';
import type {
  ServerConfig,
  SubsonicResponse,
  Artist,
  Album,
  Song,
  Playlist,
  Directory,
  SearchResult,
} from '../types';

class SubsonicAPI {
  private config: ServerConfig | null = null;
  private salt: string = '';

  setConfig(config: ServerConfig) {
    this.config = config;
    this.salt = this.generateSalt();
  }

  getConfig(): ServerConfig | null {
    return this.config;
  }

  private generateSalt(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getAuthParams(): Record<string, string> {
    if (!this.config) {
      throw new Error('Server not configured');
    }

    const { username, password, useLegacyAuth } = this.config;

    if (useLegacyAuth) {
      // Legacy authentication (hex encoded password)
      // Convert password to hex without using Buffer (not available in React Native)
      const hexPassword = password
        .split('')
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
      return {
        u: username,
        p: 'enc:' + hexPassword,
      };
    }

    // Token authentication
    const token = md5(password + this.salt);
    return {
      u: username,
      t: token,
      s: this.salt,
    };
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | string[] | number[] | undefined> = {}
  ): Promise<T> {
    if (!this.config) {
      throw new Error('Server not configured');
    }

    const authParams = this.getAuthParams();
    const queryParams = new URLSearchParams({
      ...authParams,
      v: '1.16.1',
      c: 'subsonic-player',
      f: 'json',
      ...Object.fromEntries(
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && !Array.isArray(v))
          .map(([k, v]) => [k, String(v)])
      ),
    });

    // Add array parameters (like songIdToAdd or songIndexToRemove)
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach(val => queryParams.append(k, String(val)));
      }
    });

    const url = `${this.config.url}/rest/${endpoint}?${queryParams.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data['subsonic-response']?.status === 'failed') {
        throw new Error(data['subsonic-response']?.error?.message || 'API request failed');
      }

      return data['subsonic-response'];
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Ping server to test connection
  async ping(): Promise<boolean> {
    try {
      const response = await this.request<SubsonicResponse>('ping');
      return response.status === 'ok';
    } catch {
      return false;
    }
  }

  // Get streaming URL for a song
  getStreamUrl(songId: string): string {
    if (!this.config) {
      throw new Error('Server not configured');
    }

    const authParams = this.getAuthParams();
    const queryParams = new URLSearchParams({
      ...authParams,
      v: '1.16.1',
      c: 'subsonic-player',
      id: songId,
    });

    return `${this.config.url}/rest/stream?${queryParams.toString()}`;
  }

  // Get cover art URL
  getCoverArtUrl(coverArtId: string | undefined, size: number = 300): string | null {
    if (!coverArtId || !this.config) {
      return null;
    }

    const authParams = this.getAuthParams();
    const queryParams = new URLSearchParams({
      ...authParams,
      v: '1.16.1',
      c: 'subsonic-player',
      id: coverArtId,
      size: String(size),
    });

    return `${this.config.url}/rest/getCoverArt?${queryParams.toString()}`;
  }

  // Get all artists
  async getArtists(): Promise<Artist[]> {
    const response = await this.request<{ artists: { index: Array<{ artist: Artist[] }> } }>('getArtists');
    const artists: Artist[] = [];

    response.artists?.index?.forEach((index) => {
      if (Array.isArray(index.artist)) {
        artists.push(...index.artist);
      }
    });

    return artists;
  }

  // Get all albums
  async getAlbums(type: 'random' | 'newest' | 'highest' | 'frequent' | 'recent' = 'newest', size: number = 50): Promise<Album[]> {
    const response = await this.request<{ albumList: { album: Album[] } }>('getAlbumList', {
      type,
      size,
    });
    return response.albumList?.album || [];
  }

  // Get album details
  async getAlbum(albumId: string): Promise<{ album: Album; songs: Song[] }> {
    const response = await this.request<{ album: Album & { song: Song[] } }>('getAlbum', {
      id: albumId,
    });
    return {
      album: response.album,
      songs: response.album?.song || [],
    };
  }

  // Get artist details
  async getArtist(artistId: string): Promise<{ artist: Artist; albums: Album[] }> {
    const response = await this.request<{ artist: Artist & { album: Album[] } }>('getArtist', {
      id: artistId,
    });
    return {
      artist: response.artist,
      albums: response.artist?.album || [],
    };
  }

  // Get directory contents
  async getDirectory(directoryId: string): Promise<Directory> {
    const response = await this.request<{ directory: Directory }>('getMusicDirectory', {
      id: directoryId,
    });
    return response.directory;
  }

  // Get all playlists
  async getPlaylists(): Promise<Playlist[]> {
    const response = await this.request<{ playlists: { playlist: Playlist[] } }>('getPlaylists');
    return response.playlists?.playlist || [];
  }

  // Get playlist details
  async getPlaylist(playlistId: string): Promise<{ playlist: Playlist; songs: Song[] }> {
    const response = await this.request<{ playlist: Playlist & { entry: Song[] } }>('getPlaylist', {
      id: playlistId,
    });
    return {
      playlist: response.playlist,
      songs: response.playlist?.entry || [],
    };
  }

  // Create playlist
  async createPlaylist(name: string): Promise<void> {
    await this.request('createPlaylist', { name });
  }

  // Delete playlist
  async deletePlaylist(playlistId: string): Promise<void> {
    await this.request('deletePlaylist', { id: playlistId });
  }

  // Update playlist
  async updatePlaylist(
    playlistId: string,
    songIdToAdd?: string | string[],
    name?: string,
    comment?: string,
    songIndexToRemove?: number | number[]
  ): Promise<void> {
    const params: Record<string, string | string[] | number | number[]> = { playlistId };

    if (songIdToAdd !== undefined) params.songIdToAdd = songIdToAdd;
    if (name) params.name = name;
    if (comment) params.comment = comment;
    if (songIndexToRemove !== undefined) params.songIndexToRemove = songIndexToRemove;

    await this.request('updatePlaylist', params);
  }

  // Search
  async search(query: string, count: number = 20): Promise<SearchResult> {
    const response = await this.request<{ searchResult2: SearchResult }>('search2', {
      query,
      artistCount: count,
      albumCount: count,
      songCount: count,
    });
    return response.searchResult2 || {};
  }

  // Get random songs
  async getRandomSongs(size: number = 50): Promise<Song[]> {
    const response = await this.request<{ randomSongs: { song: Song[] } }>('getRandomSongs', {
      size,
    });
    return response.randomSongs?.song || [];
  }

  // Star/unstar
  async star(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    const params: Record<string, string> = {};
    if (type === 'song') params.id = id;
    else if (type === 'album') params.albumId = id;
    else if (type === 'artist') params.artistId = id;

    await this.request('star', params);
  }

  async unstar(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    const params: Record<string, string> = {};
    if (type === 'song') params.id = id;
    else if (type === 'album') params.albumId = id;
    else if (type === 'artist') params.artistId = id;

    await this.request('unstar', params);
  }

  // Scrobble (for Last.fm)
  async scrobble(id: string, time?: number, submission: boolean = true): Promise<void> {
    await this.request('scrobble', {
      id,
      time: time ? String(time) : undefined,
      submission: String(submission),
    });
  }
}

export const subsonicApi = new SubsonicAPI();
export default subsonicApi;
