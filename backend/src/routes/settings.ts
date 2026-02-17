import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { settingsService } from '../services/settings';
import { ts3audiobot } from '../services/ts3audiobot';

const router = Router();
router.use(authMiddleware);

// Only admins can view/change settings
function requireAdmin(req: Request, res: Response): boolean {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

router.get('/', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  res.json(settingsService.getSafe());
});

router.put('/', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    settingsService.applyUpdate(req.body);
    // Reset TS3AudioBot cache so new URL takes effect immediately
    ts3audiobot.resetCache();
    res.json({
      message: 'Settings saved',
      settings: settingsService.getSafe(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save settings';
    res.status(500).json({ error: msg });
  }
});

router.post('/test-ts3audiobot', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  ts3audiobot.resetCache();
  const available = await ts3audiobot.isAvailable();
  if (available) {
    res.json({ ok: true, message: 'TS3AudioBot is reachable' });
  } else {
    const s = settingsService.get();
    res.json({
      ok: false,
      message: `TS3AudioBot is not reachable at ${s.ts3audiobot.url}`,
    });
  }
});

export default router;
