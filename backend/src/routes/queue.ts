import { Router, Request, Response } from 'express';
import { queueService } from '../services/queue';
import { authMiddleware } from '../middleware/auth';
import { Track } from '../types';

const router = Router();
router.use(authMiddleware);

router.get('/', (_req: Request, res: Response) => {
  const queue = queueService.getQueue();
  const current = queueService.getCurrentTrack();
  res.json({ queue, currentTrack: current });
});

router.post('/add', async (req: Request, res: Response) => {
  const track = req.body as Track;
  if (!track.url || !track.title) {
    res.status(400).json({ error: 'Track url and title are required' });
    return;
  }
  const username = typeof req.user?.username === 'string' ? req.user.username : 'Unknown';
  const item = await queueService.addTrack(track, username);
  res.json({ message: 'Track added to queue', item });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const success = await queueService.removeTrack(id);
  if (success) {
    res.json({ message: 'Track removed from queue' });
  } else {
    res.status(404).json({ error: 'Track not found in queue' });
  }
});

router.put('/move', (req: Request, res: Response) => {
  const { fromIndex, toIndex } = req.body;
  if (fromIndex === undefined || toIndex === undefined) {
    res.status(400).json({ error: 'fromIndex and toIndex are required' });
    return;
  }
  const success = queueService.moveTrack(fromIndex, toIndex);
  if (success) {
    res.json({ message: 'Track moved', queue: queueService.getQueue() });
  } else {
    res.status(400).json({ error: 'Invalid indices' });
  }
});

router.delete('/', (_req: Request, res: Response) => {
  queueService.clear();
  res.json({ message: 'Queue cleared' });
});

export default router;
