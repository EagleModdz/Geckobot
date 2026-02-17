import { Router, Request, Response } from 'express';
import { ts3audiobot } from '../services/ts3audiobot';
import { queueService } from '../services/queue';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.post('/play', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    // Resume playback
    const success = await ts3audiobot.pause(); // toggle pause
    res.json({ message: success ? 'Playback resumed' : 'Failed to resume' });
    return;
  }
  const result = await ts3audiobot.play(url);
  if (result.ok) {
    queueService.setPlaying(true);
    res.json({ message: 'Playing' });
  } else {
    res.status(500).json({ error: result.error || 'Failed to play' });
  }
});

router.post('/pause', async (_req: Request, res: Response) => {
  const success = await ts3audiobot.pause();
  if (success) {
    res.json({ message: 'Paused' });
  } else {
    res.status(500).json({ error: 'Failed to pause' });
  }
});

router.post('/stop', async (_req: Request, res: Response) => {
  const success = await ts3audiobot.stop();
  queueService.setPlaying(false);
  if (success) {
    res.json({ message: 'Stopped' });
  } else {
    res.status(500).json({ error: 'Failed to stop' });
  }
});

router.post('/skip', async (_req: Request, res: Response) => {
  const success = await queueService.skip();
  if (success) {
    res.json({ message: 'Skipped to next track' });
  } else {
    res.json({ message: 'No more tracks in queue' });
  }
});

router.post('/previous', async (_req: Request, res: Response) => {
  const success = await queueService.playPrevious();
  if (success) {
    res.json({ message: 'Playing previous track' });
  } else {
    res.json({ message: 'No previous track' });
  }
});

router.put('/volume', async (req: Request, res: Response) => {
  const { volume } = req.body;
  if (volume === undefined || typeof volume !== 'number') {
    res.status(400).json({ error: 'Volume (number) is required' });
    return;
  }
  const success = await ts3audiobot.setVolume(volume);
  if (success) {
    res.json({ message: 'Volume updated', volume });
  } else {
    res.status(500).json({ error: 'Failed to update volume' });
  }
});

router.put('/seek', async (req: Request, res: Response) => {
  const { position } = req.body;
  if (position === undefined) {
    res.status(400).json({ error: 'Position is required' });
    return;
  }
  const success = await ts3audiobot.seek(position);
  if (success) {
    res.json({ message: 'Seeked to position', position });
  } else {
    res.status(500).json({ error: 'Failed to seek' });
  }
});

router.post('/repeat', async (req: Request, res: Response) => {
  const { mode } = req.body;
  if (!mode || !['off', 'one', 'all'].includes(mode)) {
    res.status(400).json({ error: 'Mode must be off, one, or all' });
    return;
  }
  const success = await ts3audiobot.setRepeatMode(mode);
  if (success) {
    res.json({ message: `Repeat set to ${mode}`, mode });
  } else {
    res.status(500).json({ error: 'Failed to set repeat mode' });
  }
});

router.post('/shuffle', async (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled (boolean) is required' });
    return;
  }
  const success = await ts3audiobot.setShuffle(enabled);
  if (success) {
    res.json({ message: `Shuffle ${enabled ? 'on' : 'off'}`, enabled });
  } else {
    res.status(500).json({ error: 'Failed to set shuffle' });
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  const status = await ts3audiobot.getPlayerStatus();
  res.json(status);
});

export default router;
