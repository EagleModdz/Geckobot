import { Router, Request, Response } from 'express';
import { searchYouTube, getYouTubeInfo } from '../services/youtube';
import { spotifyService } from '../services/spotify';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/youtube', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  const result = await searchYouTube(query);
  if (result.error && result.tracks.length === 0) {
    res.status(500).json({ tracks: [], error: result.error, source: 'youtube', query });
    return;
  }
  res.json({ tracks: result.tracks, error: result.error, source: 'youtube', query });
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

router.get('/spotify', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  if (!spotifyService.isConfigured()) {
    res.status(503).json({
      tracks: [],
      error: 'Spotify is not configured. Add Client ID and Client Secret in Settings.',
      source: 'spotify',
      query,
    });
    return;
  }

  const result = await spotifyService.search(query);
  if (result.error && result.tracks.length === 0) {
    res.status(500).json({ tracks: [], error: result.error, source: 'spotify', query });
    return;
  }
  res.json({ tracks: result.tracks, error: result.error, source: 'spotify', query });
});

router.get('/spotify/playlist/:id', async (req: Request, res: Response) => {
  if (!spotifyService.isConfigured()) {
    res.status(503).json({ error: 'Spotify is not configured' });
    return;
  }

  try {
    const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tracks = await spotifyService.getPlaylistTracks(playlistId);
    res.json({ tracks });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to get playlist';
    res.status(500).json({ error: msg });
  }
});

export default router;
