const API_URL = import.meta.env.VITE_API_URL || '';

export interface PermissionMember {
  type: 'uid' | 'groupid';
  value: string;
  displayName?: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  color: string;
  members: PermissionMember[];
  grants: string[]; // TS3AudioBot command paths
}

export interface Command {
  id: string;
  command: string;     // TS3AudioBot API path, e.g. "play", "volume", "bot name"
  label: string;
  description: string;
  category: string;    // "Playback", "Bot", "Queue", "Voice", "Info", "Admin"
  enabled: boolean;
  botStates: Record<string, boolean>;
}

export interface Channel {
  id: number;
  name: string;
  parentId: number;
  order: number;
  hasPassword: boolean;
  clients: { id: number; name: string }[];
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

async function uploadFile(endpoint: string, file: File): Promise<{ message: string; filename: string }> {
  const formData = new FormData();
  formData.append('avatar', file);
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Upload failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: { id: string; username: string; role: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
    ),
  me: () => request<{ user: { userId: string; username: string; role: string } }>('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Bot
  botConnect: () => request('/api/bot/connect', { method: 'POST' }),
  botDisconnect: () => request('/api/bot/disconnect', { method: 'POST' }),
  botStatus: () => request<{
    connected: boolean;
    serverName: string;
    channelName: string;
    botName: string;
    clientsInChannel: { id: number; name: string }[];
  }>('/api/bot/status'),
  setBotName: (name: string) =>
    request('/api/bot/name', { method: 'PUT', body: JSON.stringify({ name }) }),
  setBotChannel: (channelId: number) =>
    request('/api/bot/channel', { method: 'PUT', body: JSON.stringify({ channelId }) }),
  setBotDescription: (description: string) =>
    request('/api/bot/description', { method: 'PUT', body: JSON.stringify({ description }) }),
  getChannels: () => request<Channel[]>('/api/bot/channels'),

  // Multi-bot management
  getBotList: () =>
    request<{
      bots: { id: number; name: string; server: string; status: 'connected' | 'connecting' | 'disconnected' }[];
      selectedBotId: number;
    }>('/api/bot/list'),
  selectBot: (botId: number) =>
    request<{ message: string; botId: number; queue: unknown[] }>('/api/bot/select', {
      method: 'POST',
      body: JSON.stringify({ botId }),
    }),
  createBot: (address?: string, password?: string) =>
    request<{ message: string; botId: number }>('/api/bot/new', {
      method: 'POST',
      body: JSON.stringify({ address, password }),
    }),
  disconnectBotById: (id: number) =>
    request(`/api/bot/${id}/disconnect`, { method: 'POST' }),
  renameBotById: (botId: number, name: string) =>
    request('/api/bot/name', { method: 'PUT', body: JSON.stringify({ name, botId }) }),
  setDescriptionById: (botId: number, description: string) =>
    request('/api/bot/description', { method: 'PUT', body: JSON.stringify({ description, botId }) }),

  // Player
  play: (url?: string, meta?: { title?: string; artist?: string; thumbnail?: string; duration?: number; source?: string }) =>
    request('/api/player/play', { method: 'POST', body: JSON.stringify({ url, ...meta }) }),
  pause: () => request('/api/player/pause', { method: 'POST' }),
  stop: () => request('/api/player/stop', { method: 'POST' }),
  skip: () => request('/api/player/skip', { method: 'POST' }),
  previous: () => request('/api/player/previous', { method: 'POST' }),
  setVolume: (volume: number) =>
    request('/api/player/volume', { method: 'PUT', body: JSON.stringify({ volume }) }),
  seek: (position: number) =>
    request('/api/player/seek', { method: 'PUT', body: JSON.stringify({ position }) }),
  setRepeat: (mode: 'off' | 'one' | 'all') =>
    request('/api/player/repeat', { method: 'POST', body: JSON.stringify({ mode }) }),
  setShuffle: (enabled: boolean) =>
    request('/api/player/shuffle', { method: 'POST', body: JSON.stringify({ enabled }) }),
  playerStatus: () =>
    request<{
      isPlaying: boolean;
      currentTrack: { id: string; title: string; artist: string; duration: number; thumbnail: string; url: string; source: string } | null;
      position: number;
      duration: number;
      volume: number;
    }>('/api/player/status'),

  // Queue
  getQueue: () =>
    request<{
      queue: { id: string; title: string; artist: string; duration: number; thumbnail: string; url: string; source: string; addedBy: string }[];
      currentTrack: { id: string; title: string } | null;
    }>('/api/queue'),
  addToQueue: (track: { title: string; artist: string; duration: number; thumbnail: string; url: string; source: string }, autoPlay: boolean = false) =>
    request('/api/queue/add', { method: 'POST', body: JSON.stringify({ ...track, autoPlay }) }),
  playQueue: () =>
    request('/api/queue/play', { method: 'POST' }),
  removeFromQueue: (id: string) =>
    request(`/api/queue/${id}`, { method: 'DELETE' }),
  moveInQueue: (fromIndex: number, toIndex: number) =>
    request('/api/queue/move', { method: 'PUT', body: JSON.stringify({ fromIndex, toIndex }) }),
  clearQueue: () => request('/api/queue', { method: 'DELETE' }),
  shuffleQueue: () => request('/api/queue/shuffle', { method: 'POST' }),

  // Search
  searchYouTube: (q: string, page = 1, limit = 20) =>
    request<{
      tracks: { id: string; title: string; artist: string; duration: number; thumbnail: string; url: string; source: string; isLive?: boolean }[];
      error?: string;
      page: number;
      limit: number;
    }>(`/api/search/youtube?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`),
  // Avatar
  uploadBotAvatar: (file: File) =>
    uploadFile('/api/bot/avatar', file),
  clearBotAvatar: () => request<{ message: string }>('/api/bot/avatar', { method: 'DELETE' }),
  uploadDefaultAvatar: (file: File) =>
    uploadFile('/api/bot/avatar/default', file),
  removeDefaultAvatar: () => request<{ message: string }>('/api/bot/avatar/default', { method: 'DELETE' }),

  // Permissions
  getPermissionGroups: () =>
    request<{ groups: PermissionGroup[] }>('/api/permissions/groups'),
  getPermissionPreview: () =>
    request<{ toml: string; rightsFile: string | null }>('/api/permissions/preview'),
  getTs3Clients: () =>
    request<{ clients: { id: number; name: string; uid: string }[] }>('/api/permissions/ts3-clients'),
  createPermissionGroup: (name: string, color: string) =>
    request<{ group: PermissionGroup; apply: { ok: boolean; error?: string } }>('/api/permissions/groups', { method: 'POST', body: JSON.stringify({ name, color }) }),
  updatePermissionGroup: (id: string, name: string, color: string) =>
    request<{ group: PermissionGroup; apply: { ok: boolean; error?: string } }>(`/api/permissions/groups/${id}`, { method: 'PUT', body: JSON.stringify({ name, color }) }),
  deletePermissionGroup: (id: string) =>
    request<{ message: string; apply: { ok: boolean; error?: string } }>(`/api/permissions/groups/${id}`, { method: 'DELETE' }),
  addPermissionMember: (groupId: string, type: 'uid' | 'groupid', value: string, displayName?: string) =>
    request<{ group: PermissionGroup; apply: { ok: boolean; error?: string } }>(`/api/permissions/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ type, value, displayName }) }),
  removePermissionMember: (groupId: string, type: string, value: string) =>
    request<{ group: PermissionGroup; apply: { ok: boolean; error?: string } }>(`/api/permissions/groups/${groupId}/members`, { method: 'DELETE', body: JSON.stringify({ type, value }) }),
  grantPermissionCommand: (groupId: string, command: string) =>
    request<{ group: PermissionGroup; apply: { ok: boolean; error?: string } }>(`/api/permissions/groups/${groupId}/commands`, { method: 'POST', body: JSON.stringify({ command }) }),
  grantAllPermissionCommands: (groupId: string) =>
    request<{ group: PermissionGroup; apply: { ok: boolean; error?: string } }>(`/api/permissions/groups/${groupId}/commands/grant-all`, { method: 'POST' }),
  revokePermissionCommand: (groupId: string, command: string) =>
    request<{ group: PermissionGroup; apply: { ok: boolean; error?: string } }>(`/api/permissions/groups/${groupId}/commands/${encodeURIComponent(command)}`, { method: 'DELETE' }),

  // Commands
  getCommands: () =>
    request<{ commands: Command[] }>('/api/commands'),
  updateCommandMeta: (id: string, label: string, description: string) =>
    request<{ command: Command }>(`/api/commands/${id}`, { method: 'PUT', body: JSON.stringify({ label, description }) }),
  toggleCommand: (id: string) =>
    request<{ command: Command }>(`/api/commands/${id}/toggle`, { method: 'PATCH' }),
  toggleBotCommand: (id: string, botId: number) =>
    request<{ command: Command }>(`/api/commands/${id}/bots/${botId}/toggle`, { method: 'PATCH' }),
  clearBotCommandOverride: (id: string, botId: number) =>
    request<{ command: Command }>(`/api/commands/${id}/bots/${botId}/override`, { method: 'DELETE' }),

  // Debug / env-lock helpers
  getDebugMode: () =>
    request<{ debugMode: boolean }>('/api/settings/debug-mode'),
  getEnvLocked: () =>
    request<{ locked: string[] }>('/api/settings/env-locked'),

  // Settings
  getSettings: () => request<{
    ts3server: { host: string; port: number; queryPort: number; queryUser: string; queryPassword: string; serverPassword: string };
    ts3audiobot: { url: string; apiKey: string; rightsFile: string };
    bot: { name: string; defaultChannel: string; identity: string; defaultAvatar: string };
    ytdlp: { path: string; cookiesFile: string };
  }>('/api/settings'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveSettings: (settings: any) =>
    request<{ message: string }>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  testTs3AudioBot: () =>
    request<{ ok: boolean; message: string }>('/api/settings/test-ts3audiobot', { method: 'POST' }),
};
