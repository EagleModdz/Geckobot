import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { automationService } from '../services/automationService';

const router = Router();
router.use(authMiddleware);

function requireAdmin(req: Request, res: Response): boolean {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin required' });
    return false;
  }
  return true;
}

// GET /api/automations/config
router.get('/config', (_req, res) => {
  res.json({ config: automationService.getConfig() });
});

// PUT /api/automations/config  { afk?: Partial<AfkConfig>, nameRotation?: Partial<NameRotationConfig> }
router.put('/config', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const config = automationService.updateConfig(req.body);
  res.json({ config });
});

// GET /api/automations/status — runtime state for name rotation and AFK
router.get('/status', (_req, res) => {
  res.json({
    nameRotation: automationService.getRotationStatus(),
    afk: automationService.getAfkStatus(),
  });
});

// POST /api/automations/name-rotation/start
router.post('/name-rotation/start', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const result = automationService.startRotation();
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ status: automationService.getRotationStatus() });
});

// POST /api/automations/name-rotation/stop
router.post('/name-rotation/stop', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  automationService.stopRotation();
  res.json({ status: automationService.getRotationStatus() });
});

export default router;
