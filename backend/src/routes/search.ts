import { Router, Request, Response } from 'express';
import { searchYouTube, getYouTubeInfo } from '../services/youtube';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/youtube', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);

  if (!query) {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  const result = await searchYouTube(query, page, limit);
  if (result.error && result.tracks.length === 0) {
    res.status(500).json({ tracks: [], error: result.error, source: 'youtube', query });
    return;
  }
  res.json({ tracks: result.tracks, error: result.error, source: 'youtube', query, page, limit });
});

router.get('/youtube/info', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  const track = await getYouTubeInfo(url);
  if (track) {
    res.json(track);
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

export default router;
