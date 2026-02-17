import SpotifyWebApi from 'spotify-web-api-node';
import { settingsService } from './settings';
import { Track } from '../types';

class SpotifyService {
  private api: SpotifyWebApi | null = null;
  private tokenExpiry = 0;
  private lastClientId = '';

  private getApi(): SpotifyWebApi {
    const s = settingsService.get();
    // Recreate client if credentials changed
    if (!this.api || s.spotify.clientId !== this.lastClientId) {
      this.api = new SpotifyWebApi({
        clientId: s.spotify.clientId,
        clientSecret: s.spotify.clientSecret,
        redirectUri: s.spotify.redirectUri,
      });
      this.lastClientId = s.spotify.clientId;
      this.tokenExpiry = 0; // Force re-auth
    }
    return this.api;
  }

  isConfigured(): boolean {
    const s = settingsService.get();
    return !!(s.spotify.clientId && s.spotify.clientSecret);
  }

  private async ensureToken(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error(
        'Spotify is not configured. Add Client ID and Client Secret in Settings.',
      );
    }

    if (Date.now() < this.tokenExpiry) return;

    const api = this.getApi();
    try {
      const data = await api.clientCredentialsGrant();
      api.setAccessToken(data.body.access_token);
      this.tokenExpiry = Date.now() + (data.body.expires_in - 60) * 1000;
    } catch (error: unknown) {
      this.tokenExpiry = 0;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Spotify authentication failed: ${msg}`);
    }
  }

  async search(query: string, limit = 10): Promise<{ tracks: Track[]; error?: string }> {
    try {
      await this.ensureToken();
      const api = this.getApi();
      const result = await api.searchTracks(query, { limit });
      const tracks = result.body.tracks?.items || [];

      return {
        tracks: tracks.map((track) => ({
          id: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          duration: Math.floor(track.duration_ms / 1000),
          thumbnail: track.album.images[0]?.url || '',
          url: track.external_urls.spotify,
          source: 'spotify' as const,
          spotifyUri: track.uri,
        })),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { tracks: [], error: msg };
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    await this.ensureToken();
    const api = this.getApi();
    const result = await api.getPlaylistTracks(playlistId, { limit: 50 });
    const items = result.body.items || [];

    return items
      .filter((item) => item.track)
      .map((item) => {
        const track = item.track!;
        return {
          id: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          duration: Math.floor(track.duration_ms / 1000),
          thumbnail: track.album.images[0]?.url || '',
          url: track.external_urls.spotify,
          source: 'spotify' as const,
          spotifyUri: track.uri,
        };
      });
  }

  getAuthUrl(): string {
    const scopes = ['user-read-private', 'playlist-read-private', 'streaming'];
    return this.getApi().createAuthorizeURL(scopes, 'state');
  }

  async handleCallback(code: string): Promise<void> {
    const api = this.getApi();
    const data = await api.authorizationCodeGrant(code);
    api.setAccessToken(data.body.access_token);
    api.setRefreshToken(data.body.refresh_token);
    this.tokenExpiry = Date.now() + (data.body.expires_in - 60) * 1000;
  }
}

export const spotifyService = new SpotifyService();
