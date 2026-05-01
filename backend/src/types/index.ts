export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds; 0 = live stream
  thumbnail: string;
  url: string;
  source: string;
  isLive?: boolean;
}

export interface QueueItem extends Track {
  addedBy: string;
  addedAt: number;
}

export interface PlayerStatus {
  isPlaying: boolean;
  currentTrack: Track | null;
  position: number; // seconds
  duration: number; // seconds
  volume: number; // 0-100
}

export interface BotStatus {
  connected: boolean;
  serverName: string;
  channelName: string;
  botName: string;
  clientsInChannel: ChannelClient[];
}

export interface ChannelClient {
  id: number;
  name: string;
}

export interface Channel {
  id: number;
  name: string;
  parentId: number;
  order: number;
  hasPassword: boolean;
  clients: ChannelClient[];
}

export interface SearchResult {
  tracks: Track[];
  source: string;
  query: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
}

export interface Settings {
  ts3Server: {
    host: string;
    port: number;
    queryPort: number;
    queryUser: string;
    queryPassword: string;
  };
  botName: string;
  defaultChannel: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

// Socket.IO event types
export interface ServerToClientEvents {
  'player:status': (status: PlayerStatus) => void;
  'player:queue': (queue: QueueItem[]) => void;
  'bot:status': (status: BotStatus) => void;
  'bot:error': (error: string) => void;
}

export interface ClientToServerEvents {
  'player:command': (command: string, data?: unknown) => void;
}
