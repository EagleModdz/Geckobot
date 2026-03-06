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
import commandRoutes from './routes/commands';
import { commandRegistry } from './services/commandRegistry';
import permissionRoutes from './routes/permissions';
import { permissionService } from './services/permissionService';
import logsRoutes from './routes/logs';
import { logBuffer } from './services/logBuffer';

// Intercept console output into the log buffer for debug streaming
const _origLog   = console.log.bind(console);
const _origWarn  = console.warn.bind(console);
const _origError = console.error.bind(console);
console.log   = (...args) => { _origLog(...args);   logBuffer.push('info',  args.map(String).join(' ')); };
console.warn  = (...args) => { _origWarn(...args);  logBuffer.push('warn',  args.map(String).join(' ')); };
console.error = (...args) => { _origError(...args); logBuffer.push('error', args.map(String).join(' ')); };

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
app.use('/api/commands', commandRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/logs', logsRoutes);

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
    socket.emit('bot:ping', result.ping);

    const queue = queueService.getQueue();
    socket.emit('player:queue', queue);
  }

  // Send current command registry state to newly connected client
  socket.emit('commands:updated', commandRegistry.getAll());
  socket.emit('permissions:updated', permissionService.getAllGroups());

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Relay command registry changes to all connected clients in real-time
commandRegistry.on('changed', (commands) => {
  io.emit('commands:updated', commands);
});

// Broadcast status updates every 2 seconds
let lastPlayerStatus = '';
let lastBotStatus = '';
let lastChannels = '';
let lastBotList = '';
let lastSelectedBotId = -1;
let lastPing = -1;

// Song-end detection state
let wasPlaying = false;

setInterval(async () => {
  if (io.engine.clientsCount === 0) return;

  const result = await ts3audiobot.pollStatus();
  if (!result) return; // TS3AudioBot unreachable or poll in-flight

  // --- Song-end detection ---
  // When the bot transitions from playing → stopped AND the queue is still
  // "driving" playback (not a manual stop), automatically advance the queue.
  const isNowPlaying = result.player.isPlaying;
  if (wasPlaying && !isNowPlaying && queueService.isQueueDriving()) {
    // Guard against false triggers shortly after skip/playNext (5s cooldown)
    const timeSinceLastPlay = Date.now() - queueService.getLastPlayTime();
    if (timeSinceLastPlay > 5000) {
      queueService.playNext().catch(() => {});
    }
  }
  wasPlaying = isNowPlaying;

  // --- Broadcast changed state ---
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

  const botListJson = JSON.stringify(result.botList);
  if (botListJson !== lastBotList) {
    lastBotList = botListJson;
    io.emit('bot:list', result.botList);
  }

  const selectedBotId = ts3audiobot.getSelectedBotId();
  if (selectedBotId !== lastSelectedBotId) {
    lastSelectedBotId = selectedBotId;
    io.emit('bot:selected', selectedBotId);
  }

  // Emit ping when it changes by more than 20ms (avoid noise)
  if (Math.abs(result.ping - lastPing) > 20) {
    lastPing = result.ping;
    io.emit('bot:ping', result.ping);
  }
}, 2000);

// Queue events -> Socket.IO (only for selected bot)
queueService.on('queue:updated', ({ botId, queue }) => {
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

  const s = settingsService.get();
  ts3audiobot.isAvailable().then((available) => {
    if (available) {
      console.log('TS3AudioBot is available at', s.ts3audiobot.url);
    } else {
      console.warn('TS3AudioBot is not reachable at', s.ts3audiobot.url || '(not configured)');
    }
  });
});
