import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Channel } from '@/lib/api';

export interface PlayerStatus {
  isPlaying: boolean;
  currentTrack: {
    id: string;
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
    url: string;
    source: string;
  } | null;
  position: number;
  duration: number;
  volume: number;
}

export interface BotStatus {
  connected: boolean;
  serverName: string;
  channelName: string;
  botName: string;
  clientsInChannel: { id: number; name: string }[];
}

export interface BotInfo {
  id: number;
  name: string;
  server: string;
  status: 'connected' | 'connecting' | 'disconnected';
}

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  url: string;
  source: string;
  addedBy: string;
}

const WS_URL = import.meta.env.VITE_WS_URL || '';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 50,
  });
  const [botStatus, setBotStatus] = useState<BotStatus>({
    connected: false,
    serverName: '',
    channelName: '',
    botName: 'MusicBot',
    clientsInChannel: [],
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [botList, setBotList] = useState<BotInfo[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('player:status', (status: PlayerStatus) => setPlayerStatus(status));
    socket.on('bot:status', (status: BotStatus) => setBotStatus(status));
    socket.on('player:queue', (q: QueueItem[]) => setQueue(q));
    socket.on('bot:channels', (ch: Channel[]) => setChannels(ch));
    socket.on('bot:error', (err: string) => setError(err));
    socket.on('bot:list', (bots: BotInfo[]) => setBotList(bots));
    socket.on('bot:selected', (id: number) => setSelectedBotId(id));

    return () => {
      socket.disconnect();
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { connected, playerStatus, botStatus, queue, channels, botList, selectedBotId, error, clearError };
}
