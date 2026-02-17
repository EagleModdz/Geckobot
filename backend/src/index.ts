import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { ts3audiobot } from './services/ts3audiobot';
import { queueService } from './services/queue';
import { settingsService } from './services/settings';
import './services/database'; // Initialize DB

import authRoutes from './routes/auth';
import botRoutes from './routes/bot';
import playerRoutes from './routes/player';
import queueRoutes from './routes/queue';
import searchRoutes from './routes/search';
import settingsRoutes from './routes/settings';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Ensure avatars directory exists
const avatarsDir = path.resolve(__dirname, '..', 'data', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded avatars as static files
app.use('/uploads/avatars', express.static(avatarsDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/settings', settingsRoutes);

// Socket.IO
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);

  // Send current state to the newly connected client immediately
  const result = await ts3audiobot.pollStatus();
  if (result) {
    socket.emit('player:status', result.player);
    socket.emit('bot:status', result.bot);
    socket.emit('bot:channels', result.channels);
    socket.emit('bot:list', result.botList);
    socket.emit('bot:selected', ts3audiobot.getSelectedBotId());

    const queue = queueService.getQueue();
    socket.emit('player:queue', queue);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast status updates every 2 seconds
// Uses pollStatus() which skips when TS3AudioBot is unreachable (cached check)
// and prevents piling up requests if previous poll is still in-flight
let lastPlayerStatus = '';
let lastBotStatus = '';
let lastChannels = '';
let lastBotList = '';
let lastSelectedBotId = -1;

setInterval(async () => {
  if (io.engine.clientsCount === 0) return;

  const result = await ts3audiobot.pollStatus();
  if (!result) return; // TS3AudioBot unreachable or poll in-flight

  const playerJson = JSON.stringify(result.player);
  if (playerJson !== lastPlayerStatus) {
    lastPlayerStatus = playerJson;
    io.emit('player:status', result.player);
  }

  const botJson = JSON.stringify(result.bot);
  if (botJson !== lastBotStatus) {
    lastBotStatus = botJson;
    io.emit('bot:status', result.bot);
  }

  const channelsJson = JSON.stringify(result.channels);
  if (channelsJson !== lastChannels) {
    lastChannels = channelsJson;
    io.emit('bot:channels', result.channels);
  }

  // Emit bot list updates
  const botListJson = JSON.stringify(result.botList);
  if (botListJson !== lastBotList) {
    lastBotList = botListJson;
    io.emit('bot:list', result.botList);
  }

  // Emit selected bot changes
  const selectedBotId = ts3audiobot.getSelectedBotId();
  if (selectedBotId !== lastSelectedBotId) {
    lastSelectedBotId = selectedBotId;
    io.emit('bot:selected', selectedBotId);
  }
}, 2000);

// Queue events -> Socket.IO (now include botId)
queueService.on('queue:updated', ({ botId, queue }) => {
  // Only emit to clients if it's the selected bot's queue
  if (botId === ts3audiobot.getSelectedBotId()) {
    io.emit('player:queue', queue);
  }
});

queueService.on('track:started', (track) => {
  io.emit('player:status', {
    isPlaying: true,
    currentTrack: track,
    position: 0,
    duration: track.duration,
    volume: 50,
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`Backend server running on port ${config.port}`);

  // Check TS3AudioBot availability
  const s = settingsService.get();
  ts3audiobot.isAvailable().then((available) => {
    if (available) {
      console.log('TS3AudioBot is available at', s.ts3audiobot.url);
    } else {
      console.warn('TS3AudioBot is not reachable at', s.ts3audiobot.url || '(not configured)');
    }
  });
});
