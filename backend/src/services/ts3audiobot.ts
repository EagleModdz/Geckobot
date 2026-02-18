import axios, { AxiosInstance } from 'axios';
import { settingsService } from './settings';
import { config } from '../config';
import { PlayerStatus, BotStatus, Channel, ChannelClient } from '../types';

export interface BotInfo {
  id: number;
  name: string;
  server: string;
  status: 'connected' | 'connecting' | 'disconnected';
}

/**
 * TS3AudioBot v0.14 REST API bridge with multi-bot support.
 *
 * v0.14 uses a parenthesis-based command format:
 *   /api/bot/use/{id}(/command/encoded_arg)
 * URL arguments must be percent-encoded so '/' chars don't split the path.
 * Simple commands without special chars can use plain path: /api/bot/use/{id}/command/value
 */
class TS3AudioBotService {
  private selectedBotId = 0;
  private botConnected = false;
  private available = false;
  private lastAvailableCheck = 0;
  private pollInFlight = false;
  /** Track metadata stored when playing directly (not from queue) */
  private directPlayMeta: { url: string; title: string; artist: string; thumbnail: string; duration: number; source: string } | null = null;

  getSelectedBotId(): number {
    return this.selectedBotId;
  }

  private getClient(timeoutMs = 3000): AxiosInstance {
    const s = settingsService.get();
    return axios.create({
      baseURL: s.ts3audiobot.url || 'http://localhost:58913',
      timeout: timeoutMs,
    });
  }

  /**
   * v0.14 API: ALL commands need parenthesis format.
   * Uses the specified botId or the selected bot.
   */
  private botApi(command: string, timeoutMs = 3000, botId?: number) {
    const id = botId ?? this.selectedBotId;
    return this.getClient(timeoutMs).get(`/api/bot/use/${id}(/${command})`);
  }

  /** Bot command with URL/special arg (percent-encoded) */
  private botApiWithArg(command: string, arg: string, timeoutMs = 3000, botId?: number) {
    const id = botId ?? this.selectedBotId;
    const encodedArg = encodeURIComponent(arg);
    const url = `/api/bot/use/${id}(/${command}/${encodedArg})`;
    return this.getClient(timeoutMs).get(url);
  }

  /** /api/{command} */
  private globalApi(command: string, timeoutMs = 3000) {
    return this.getClient(timeoutMs).get(`/api/${command}`);
  }

  /** Reset availability cache - call after settings change */
  resetCache(): void {
    this.lastAvailableCheck = 0;
    this.available = false;
  }

  async isAvailable(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastAvailableCheck < 5000) return this.available;

    const s = settingsService.get();
    if (!s.ts3audiobot.url) {
      this.available = false;
      this.lastAvailableCheck = now;
      return false;
    }

    try {
      await this.getClient(2000).get('/api');
      this.available = true;
    } catch {
      this.available = false;
    }
    this.lastAvailableCheck = now;
    return this.available;
  }

  /** List all bots from TS3AudioBot with their status */
  async listBots(): Promise<BotInfo[]> {
    try {
      const res = await this.globalApi('bot/list', 3000);
      const list = res.data;
      if (!Array.isArray(list)) return [];

      return list.map((b: { Id: number; Name: string; Server: string; Status: number }) => ({
        id: b.Id ?? 0,
        name: b.Name || `Bot ${b.Id}`,
        server: b.Server || '',
        status: b.Status === 2 ? 'connected' as const
          : b.Status === 1 ? 'connecting' as const
          : 'disconnected' as const,
      }));
    } catch {
      return [];
    }
  }

  /** Switch active bot for player/queue operations */
  selectBot(id: number): void {
    this.selectedBotId = id;
    this.botConnected = true;
  }

  /** Connect a new bot instance to a server, returns the new bot ID or error */
  async connectNewBot(address?: string, password?: string): Promise<{ ok: boolean; botId?: number; error?: string }> {
    const s = settingsService.get();
    const addr = address || `${s.ts3server.host}:${s.ts3server.port}`;
    const pw = password || s.ts3server.serverPassword;

    if (!addr || addr === ':') {
      return { ok: false, error: 'No server address provided or configured' };
    }
    if (!s.ts3audiobot.url) {
      return { ok: false, error: 'TS3AudioBot URL is not configured. Go to Settings.' };
    }

    try {
      let connectPath = `bot/connect/to/${addr}`;
      if (pw) {
        connectPath += `/${pw}`;
      }

      const res = await this.globalApi(connectPath, 15000);
      const newBotId = res.data?.Id ?? 0;

      // Wait for the bot to connect
      await new Promise((r) => setTimeout(r, 2000));

      // Always set a name: use the configured name, or generate "Bot <id>" as a unique fallback
      // so new bots never appear as "default" in the TS3 client list.
      const nameToApply = s.bot.name || `Bot ${newBotId}`;
      await this.botApiWithArg('bot/name', nameToApply, 3000, newBotId).catch(() => {});

      // Move to default channel if configured
      if (s.bot.defaultChannel) {
        await this.botApiWithArg('bot/move', s.bot.defaultChannel, 3000, newBotId).catch(() => {});
      }
      // Apply default avatar if configured
      if (s.bot.defaultAvatar) {
        const avatarUrl = this.buildAvatarUrl(s.bot.defaultAvatar);
        await this.setAvatar(avatarUrl, newBotId).catch(() => {});
      }

      return { ok: true, botId: newBotId };
    } catch (error: unknown) {
      return { ok: false, error: `Connection failed: ${this.extractError(error)}` };
    }
  }

  /** Disconnect and fully remove a specific bot instance by ID.
   *  Uses `bot/disconnect` command which calls bot.Stop() → BotManager.RemoveBot()
   *  Works on connected AND stuck-connecting instances. */
  async disconnectBot(id: number): Promise<{ ok: boolean; error?: string }> {
    try {
      // `bot/disconnect` fully stops the bot instance and removes it from the manager.
      // Plain `disconnect` only drops the TS connection but keeps the instance alive.
      // Use a longer timeout (10s) for stuck-connecting bots that may take time to abort.
      await this.botApi('bot/disconnect', 10000, id);
      if (id === this.selectedBotId) {
        this.botConnected = false;
      }
      return { ok: true };
    } catch (error: unknown) {
      // Even on error, update our internal state so the bot is considered gone
      if (id === this.selectedBotId) {
        this.botConnected = false;
      }
      // TS3AudioBot might return an error even when the disconnect succeeded
      // (e.g. if the bot was already in a broken state). Treat as success.
      const msg = this.extractError(error);
      console.warn(`disconnectBot(${id}) returned error (may be OK):`, msg);
      return { ok: true };
    }
  }

  async connect(overrideAddress?: string): Promise<{ ok: boolean; error?: string }> {
    const s = settingsService.get();
    const address = overrideAddress || `${s.ts3server.host}:${s.ts3server.port}`;

    if (!s.ts3server.host) {
      return { ok: false, error: 'TS3 Server host is not configured. Go to Settings.' };
    }
    if (!s.ts3audiobot.url) {
      return { ok: false, error: 'TS3AudioBot URL is not configured. Go to Settings.' };
    }

    try {
      // Check if a bot is already connected - reuse it instead of creating a duplicate
      try {
        const listRes = await this.globalApi('bot/list', 3000);
        const list = listRes.data;
        if (Array.isArray(list)) {
          const connectedBot = list.find((b: { Status: number }) => b.Status === 2);
          if (connectedBot) {
            console.log(`Reusing already connected bot Id=${connectedBot.Id} Name=${connectedBot.Name}`);
            this.selectedBotId = connectedBot.Id ?? 0;
            this.botConnected = true;
            this.available = true;
            this.lastAvailableCheck = Date.now();

            // Only rename reused bots when explicitly configured — they may already
            // have a meaningful custom name from a previous session.
            if (s.bot.name) {
              await this.botApiWithArg('bot/name', s.bot.name).catch(() => {});
            }
            if (s.bot.defaultChannel) {
              await this.botApiWithArg('bot/move', s.bot.defaultChannel).catch(() => {});
            }
            if (s.bot.defaultAvatar) {
              const avatarUrl = this.buildAvatarUrl(s.bot.defaultAvatar);
              await this.setAvatar(avatarUrl).catch(() => {});
            }
            return { ok: true };
          }
        }
      } catch {
        // bot/list failed, proceed with fresh connect
      }

      let connectPath = `bot/connect/to/${address}`;
      if (s.ts3server.serverPassword) {
        connectPath += `/${s.ts3server.serverPassword}`;
      }

      const res = await this.globalApi(connectPath, 15000);
      const newBotId = res.data?.Id ?? 0;
      if (typeof newBotId === 'number') {
        this.selectedBotId = newBotId;
      }
      this.botConnected = true;
      this.available = true;
      this.lastAvailableCheck = Date.now();

      // Wait for the bot to connect
      await new Promise((r) => setTimeout(r, 2000));

      // Fresh connection: always assign a name so the bot never appears as "default".
      const freshName = s.bot.name || `Bot ${this.selectedBotId}`;
      await this.botApiWithArg('bot/name', freshName).catch(() => {});

      // Move to default channel if configured
      if (s.bot.defaultChannel) {
        await this.botApiWithArg('bot/move', s.bot.defaultChannel).catch(() => {});
      }
      // Apply default avatar if configured
      if (s.bot.defaultAvatar) {
        const avatarUrl = this.buildAvatarUrl(s.bot.defaultAvatar);
        await this.setAvatar(avatarUrl).catch(() => {});
      }

      return { ok: true };
    } catch (error: unknown) {
      const msg = this.extractError(error);
      console.error('Failed to connect bot:', msg);
      return { ok: false, error: `Connection failed: ${msg}` };
    }
  }

  async disconnect(): Promise<{ ok: boolean; error?: string }> {
    return this.disconnectBot(this.selectedBotId);
  }

  setDirectPlayMeta(meta: { url: string; title: string; artist: string; thumbnail: string; duration: number; source: string } | null) {
    this.directPlayMeta = meta;
  }

  async play(url: string): Promise<{ ok: boolean; error?: string }> {
    try {
      // v0.14: use parenthesis format with encoded URL
      // yt-dlp resolution can take 15-30s on first load
      await this.botApiWithArg('play', url, 30000);
      return { ok: true };
    } catch (error: unknown) {
      const msg = this.extractError(error);
      console.error('Failed to play:', msg);
      this.directPlayMeta = null;
      return { ok: false, error: msg };
    }
  }

  async pause(): Promise<boolean> {
    try { await this.botApi('pause'); return true; } catch { return false; }
  }

  async stop(): Promise<boolean> {
    try { await this.botApi('stop'); return true; } catch { return false; }
  }

  async setVolume(volume: number): Promise<boolean> {
    try {
      const v = Math.max(0, Math.min(100, Math.round(volume)));
      await this.botApiWithArg('volume', String(v));
      return true;
    } catch { return false; }
  }

  async seek(position: number): Promise<boolean> {
    try {
      const sec = Math.max(0, Math.round(position));
      await this.botApiWithArg('seek', String(sec));
      return true;
    } catch { return false; }
  }

  async setBotName(name: string, botId?: number): Promise<boolean> {
    try { await this.botApiWithArg('bot/name', name, 3000, botId); return true; } catch { return false; }
  }

  async moveToChannel(channelId: number): Promise<boolean> {
    try { await this.botApiWithArg('bot/move', String(channelId)); return true; } catch { return false; }
  }

  async pollStatus(): Promise<{ player: PlayerStatus; bot: BotStatus; channels: Channel[]; botList: BotInfo[]; ping: number } | null> {
    if (this.pollInFlight) return null;
    if (!this.botConnected) {
      const reachable = await this.isAvailable();
      if (!reachable) return null;

      try {
        const res = await this.globalApi('bot/list', 2000);
        const list = res.data;
        if (Array.isArray(list) && list.length > 0) {
          this.selectedBotId = list[0].Id ?? 0;
          this.botConnected = true;
        } else {
          return null;
        }
      } catch {
        return null;
      }
    }

    this.pollInFlight = true;
    const t0 = Date.now();
    try {
      const [player, bot, channels, botList] = await Promise.all([
        this.getPlayerStatus(),
        this.getBotStatus(),
        this.getChannels(),
        this.listBots(),
      ]);
      const ping = Date.now() - t0;
      return { player, bot, channels, botList, ping };
    } finally {
      this.pollInFlight = false;
    }
  }

  async getPlayerStatus(): Promise<PlayerStatus> {
    try {
      const [songRes, volumeRes] = await Promise.all([
        this.botApi('song').catch(() => null),
        this.botApi('volume').catch(() => null),
      ]);

      const songData = songRes?.data;
      const volumeData = volumeRes?.data;

      // v0.14 song returns: { Position, Length, Paused, Link, Title, AudioType }
      const title = songData?.Title || '';
      const link = songData?.Link || '';
      const paused = songData?.Paused ?? true;

      // v0.14 volume returns { Value: 50 }
      let volume = 50;
      if (volumeData !== undefined) {
        const v = volumeData?.Value ?? volumeData;
        volume = typeof v === 'number' ? Math.round(v) : parseInt(v, 10) || 50;
      }

      const isPlaying = !!title && !paused;

      // Merge stored metadata (thumbnail, artist) from direct play or queue
      // Lazy-import to avoid circular dependency
      const { queueService } = await import('./queue');
      const queueTrack = queueService.getCurrentTrack();

      // Try to find matching metadata: first directPlayMeta, then queue current track
      const meta = this.directPlayMeta || null;
      const enrichment = meta?.thumbnail
        ? meta
        : queueTrack?.thumbnail
          ? queueTrack
          : meta;

      return {
        isPlaying,
        currentTrack: title
          ? {
              id: link || title,
              title: enrichment?.title || title,
              artist: enrichment?.artist || '',
              duration: songData?.Length || enrichment?.duration || 0,
              thumbnail: enrichment?.thumbnail || '',
              url: link,
              source: enrichment?.source || songData?.AudioType || 'youtube',
            }
          : null,
        position: songData?.Position || 0,
        duration: songData?.Length || 0,
        volume,
      };
    } catch {
      return { isPlaying: false, currentTrack: null, position: 0, duration: 0, volume: 50 };
    }
  }

  async getBotStatus(): Promise<BotStatus> {
    try {
      const [listRes, treeRes] = await Promise.all([
        this.globalApi('bot/list', 2000),
        this.botApi('server/tree', 3000).catch(() => null),
      ]);
      const list = listRes.data;
      if (Array.isArray(list)) {
        const bot = list.find((b: { Id: number }) => b.Id === this.selectedBotId);
        if (bot) {
          let channelName = '';
          let clientsInChannel: ChannelClient[] = [];
          let botDisplayName = bot.Name || 'MusicBot';

          // Parse server/tree to find bot's channel using OwnClientId
          const tree = treeRes?.data;
          if (tree && tree.OwnClientId !== undefined) {
            const ownId = tree.OwnClientId;
            const clients = tree.Clients || {};
            const channels = tree.Channels || {};

            // Find the bot's own client entry
            const ownClient = clients[String(ownId)];
            if (ownClient) {
              botDisplayName = ownClient.Name || botDisplayName;
              const botChannelId = ownClient.Channel;
              const channel = channels[String(botChannelId)];
              if (channel) {
                channelName = channel.Name || '';
              }

              // Find other clients in the same channel
              for (const cid of Object.keys(clients)) {
                const c = clients[cid];
                if (c.Channel === botChannelId && c.Id !== ownId) {
                  clientsInChannel.push({ id: c.Id, name: c.Name || '' });
                }
              }
            }
          }

          return {
            connected: bot.Status === 2,
            serverName: tree?.Server?.Name || bot.Server || '',
            channelName,
            botName: botDisplayName,
            clientsInChannel,
          };
        }
      }
      return { connected: false, serverName: '', channelName: '', botName: 'MusicBot', clientsInChannel: [] };
    } catch {
      return { connected: false, serverName: '', channelName: '', botName: 'MusicBot', clientsInChannel: [] };
    }
  }

  async getChannels(): Promise<Channel[]> {
    try {
      const res = await this.botApi('server/tree', 3000);
      return this.parseServerTree(res.data);
    } catch {
      return [];
    }
  }

  async setRepeatMode(mode: 'off' | 'one' | 'all'): Promise<boolean> {
    try { await this.botApiWithArg('repeat', mode); return true; } catch { return false; }
  }

  async setShuffle(on: boolean): Promise<boolean> {
    try { await this.botApiWithArg('random', on ? 'on' : 'off'); return true; } catch { return false; }
  }

  async setDescription(desc: string, botId?: number): Promise<boolean> {
    try { await this.botApiWithArg('bot/description/set', desc, 3000, botId); return true; } catch { return false; }
  }

  async setAvatar(imageUrl: string, botId?: number): Promise<boolean> {
    try {
      // Try fast URL-based avatar first (TS6 compatible, no file transfer)
      await this.botApiWithArg('bot/avatar/url', imageUrl, 5000, botId);
      return true;
    } catch {
      // Fallback to bot/avatar/set (downloads image + file transfer, slower)
      try {
        await this.botApiWithArg('bot/avatar/set', imageUrl, 30000, botId);
        return true;
      } catch (error) {
        console.error('setAvatar failed:', this.extractError(error));
        return false;
      }
    }
  }

  async clearAvatar(botId?: number): Promise<boolean> {
    try { await this.botApi('bot/avatar/clear', 3000, botId); return true; } catch { return false; }
  }

  /**
   * Parse the TS3AudioBot server/tree response.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseServerTree(data: any): Channel[] {
    if (!data) return [];

    const channelsObj = data.Channels || {};
    const clientsObj = data.Clients || {};

    // Build client-per-channel map
    const clientsByChannel = new Map<number, ChannelClient[]>();
    for (const cid of Object.keys(clientsObj)) {
      const c = clientsObj[cid];
      const chId = c.Channel;
      if (chId === undefined) continue;
      if (!clientsByChannel.has(chId)) clientsByChannel.set(chId, []);
      clientsByChannel.get(chId)!.push({ id: c.Id ?? parseInt(cid, 10), name: c.Name ?? '' });
    }

    const channels: Channel[] = [];
    for (const key of Object.keys(channelsObj)) {
      const ch = channelsObj[key];
      channels.push({
        id: ch.Id ?? parseInt(key, 10),
        name: ch.Name ?? '',
        parentId: ch.Parent ?? 0,
        order: ch.Order ?? 0,
        hasPassword: ch.HasPassword ?? false,
        clients: clientsByChannel.get(ch.Id ?? parseInt(key, 10)) || [],
      });
    }

    // Sort by order
    channels.sort((a, b) => a.order - b.order);

    return channels;
  }

  /** Build an avatar URL reachable by TS3AudioBot using its configured host.
   *  No encodeURIComponent here — botApiWithArg handles encoding. */
  buildAvatarUrl(filename: string): string {
    const s = settingsService.get();
    const botUrl = s.ts3audiobot.url || 'http://localhost:58913';
    const port = config.port;
    try {
      const parsed = new URL(botUrl);
      return `http://${parsed.hostname}:${port}/uploads/avatars/${filename}`;
    } catch {
      return `http://localhost:${port}/uploads/avatars/${filename}`;
    }
  }

  private extractError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') return 'TS3AudioBot is not reachable (connection refused). Is it running?';
      if (error.code === 'ENOTFOUND') return 'TS3AudioBot host not found. Check the URL in Settings.';
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') return 'TS3AudioBot request timed out';
      if (error.response?.data) {
        const d = error.response.data;
        if (typeof d === 'string') return d;
        return d.ErrorMessage || d.message || JSON.stringify(d);
      }
      return error.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

export const ts3audiobot = new TS3AudioBotService();
