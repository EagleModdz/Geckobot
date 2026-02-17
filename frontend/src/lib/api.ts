const API_URL = import.meta.env.VITE_API_URL || '';

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

  // Player
  play: (url?: string) =>
    request('/api/player/play', { method: 'POST', body: JSON.stringify({ url }) }),
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
  addToQueue: (track: { title: string; artist: string; duration: number; thumbnail: string; url: string; source: string }) =>
    request('/api/queue/add', { method: 'POST', body: JSON.stringify(track) }),
  removeFromQueue: (id: string) =>
    request(`/api/queue/${id}`, { method: 'DELETE' }),
  moveInQueue: (fromIndex: number, toIndex: number) =>
    request('/api/queue/move', { method: 'PUT', body: JSON.stringify({ fromIndex, toIndex }) }),
  clearQueue: () => request('/api/queue', { method: 'DELETE' }),

  // Search
  searchYouTube: (q: string) =>
    request<{
      tracks: { id: string; title: string; artist: string; duration: number; thumbnail: string; url: string; source: string }[];
      error?: string;
    }>(`/api/search/youtube?q=${encodeURIComponent(q)}`),
  searchSpotify: (q: string) =>
    request<{
      tracks: { id: string; title: string; artist: string; duration: number; thumbnail: string; url: string; source: string; spotifyUri?: string }[];
      error?: string;
    }>(`/api/search/spotify?q=${encodeURIComponent(q)}`),

  // Avatar
  uploadBotAvatar: (file: File) =>
    uploadFile('/api/bot/avatar', file),
  clearBotAvatar: () => request<{ message: string }>('/api/bot/avatar', { method: 'DELETE' }),
  uploadDefaultAvatar: (file: File) =>
    uploadFile('/api/bot/avatar/default', file),
  removeDefaultAvatar: () => request<{ message: string }>('/api/bot/avatar/default', { method: 'DELETE' }),

  // Settings
  getSettings: () => request<{
    ts3server: { host: string; port: number; queryPort: number; queryUser: string; queryPassword: string; serverPassword: string };
    ts3audiobot: { url: string; apiKey: string };
    bot: { name: string; defaultChannel: string; identity: string; defaultAvatar: string };
    spotify: { clientId: string; clientSecret: string; redirectUri: string };
    ytdlp: { path: string; cookiesFile: string };
  }>('/api/settings'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveSettings: (settings: any) =>
    request<{ message: string }>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  testTs3AudioBot: () =>
    request<{ ok: boolean; message: string }>('/api/settings/test-ts3audiobot', { method: 'POST' }),
};
