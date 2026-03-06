import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { settingsService } from '../services/settings';
import { logBuffer, LogEntry } from '../services/logBuffer';
import { JwtPayload } from '../types';

const router = Router();

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

// GET /api/logs/stream?source=backend|ts3audiobot&token=<jwt>
// Uses query-param auth because EventSource cannot send custom headers.
router.get('/stream', (req: Request, res: Response) => {
  const token = (req.query.token as string) || '';
  const user = verifyToken(token);

  if (!user || user.role !== 'admin') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const settings = settingsService.get();
  if (!settings.debugMode) {
    res.status(403).json({ error: 'Debug mode is disabled' });
    return;
  }

  const source = (req.query.source as string) || 'backend';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendLine = (data: object) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // client disconnected mid-write
    }
  };

  if (source === 'backend') {
    // Replay existing buffer
    for (const line of logBuffer.getLines()) {
      sendLine(line);
    }
    // Subscribe to new entries
    const onLine = (entry: LogEntry) => sendLine(entry);
    logBuffer.on('line', onLine);
    req.on('close', () => logBuffer.off('line', onLine));

  } else if (source === 'ts3audiobot') {
    const containerName =
      process.env.DOCKER_TS3AUDIOBOT_CONTAINER || 'musicbot-ts3audiobot-1';

    const proc = spawn('docker', ['logs', '-f', '--tail', '100', containerName], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const handleChunk = (level: 'info' | 'error') => (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          sendLine({ ts: Date.now(), level, source: 'ts3audiobot', message: line });
        }
      }
    };

    proc.stdout?.on('data', handleChunk('info'));
    proc.stderr?.on('data', handleChunk('error'));

    proc.on('error', (err) => {
      sendLine({
        ts: Date.now(),
        level: 'error',
        source: 'ts3audiobot',
        message: `[docker error] ${err.message} — ensure /var/run/docker.sock is mounted and DOCKER_TS3AUDIOBOT_CONTAINER is set correctly`,
      });
    });

    proc.on('exit', (code) => {
      if (code !== null) {
        sendLine({
          ts: Date.now(),
          level: 'info',
          source: 'ts3audiobot',
          message: `[stream ended, exit code ${code}]`,
        });
      }
    });

    req.on('close', () => {
      proc.kill();
    });
  }
});

export default router;
