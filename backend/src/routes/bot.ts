import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ts3audiobot } from '../services/ts3audiobot';
import { queueService } from '../services/queue';
import { settingsService } from '../services/settings';
import { authMiddleware } from '../middleware/auth';

const avatarsDir = path.resolve(__dirname, '..', '..', 'data', 'avatars');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();
router.use(authMiddleware);

// --- Multi-bot management ---

router.get('/list', async (_req: Request, res: Response) => {
  const bots = await ts3audiobot.listBots();
  const selectedBotId = ts3audiobot.getSelectedBotId();
  res.json({ bots, selectedBotId });
});

router.post('/select', (req: Request, res: Response) => {
  const { botId } = req.body;
  if (botId === undefined || typeof botId !== 'number') {
    res.status(400).json({ error: 'botId (number) is required' });
    return;
  }
  ts3audiobot.selectBot(botId);
  // Return the selected bot's queue
  const queue = queueService.getQueue(botId);
  res.json({ message: 'Bot selected', botId, queue });
});

router.post('/new', async (req: Request, res: Response) => {
  const { address, password } = req.body;
  const result = await ts3audiobot.connectNewBot(address, password);
  if (result.ok) {
    res.json({ message: 'New bot connected', botId: result.botId });
  } else {
    res.status(500).json({ error: result.error || 'Failed to create new bot' });
  }
});

router.post('/:id/disconnect', async (req: Request, res: Response) => {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid bot ID' });
    return;
  }
  const wasSelected = id === ts3audiobot.getSelectedBotId();
  const result = await ts3audiobot.disconnectBot(id);
  if (result.ok) {
    // If we just removed the active bot, auto-select another one
    let newSelectedBotId: number | null = null;
    if (wasSelected) {
      const remaining = await ts3audiobot.listBots();
      const connected = remaining.find((b) => b.status === 'connected');
      if (connected) {
        ts3audiobot.selectBot(connected.id);
        newSelectedBotId = connected.id;
      }
    }
    res.json({ message: 'Bot disconnected', newSelectedBotId });
  } else {
    res.status(500).json({ error: result.error || 'Failed to disconnect bot' });
  }
});

// --- Existing endpoints (operate on selected bot) ---

router.post('/connect', async (_req: Request, res: Response) => {
  const result = await ts3audiobot.connect();
  if (result.ok) {
    res.json({ message: 'Bot connected' });
  } else {
    res.status(500).json({ error: result.error || 'Failed to connect bot' });
  }
});

router.post('/disconnect', async (_req: Request, res: Response) => {
  const result = await ts3audiobot.disconnect();
  if (result.ok) {
    res.json({ message: 'Bot disconnected' });
  } else {
    res.status(500).json({ error: result.error || 'Failed to disconnect bot' });
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  const status = await ts3audiobot.getBotStatus();
  res.json(status);
});

router.put('/name', async (req: Request, res: Response) => {
  const { name, botId } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const success = await ts3audiobot.setBotName(name, typeof botId === 'number' ? botId : undefined);
  if (success) {
    res.json({ message: 'Bot name updated' });
  } else {
    res.status(500).json({ error: 'Failed to update bot name' });
  }
});

router.put('/channel', async (req: Request, res: Response) => {
  const { channelId } = req.body;
  if (channelId === undefined) {
    res.status(400).json({ error: 'channelId is required' });
    return;
  }
  const success = await ts3audiobot.moveToChannel(channelId);
  if (success) {
    res.json({ message: 'Bot moved to channel' });
  } else {
    res.status(500).json({ error: 'Failed to move bot' });
  }
});

router.get('/channels', async (_req: Request, res: Response) => {
  const channels = await ts3audiobot.getChannels();
  res.json(channels);
});

router.put('/description', async (req: Request, res: Response) => {
  const { description, botId } = req.body;
  if (description === undefined) {
    res.status(400).json({ error: 'description is required' });
    return;
  }
  const success = await ts3audiobot.setDescription(description, typeof botId === 'number' ? botId : undefined);
  if (success) {
    res.json({ message: 'Description updated' });
  } else {
    res.status(500).json({ error: 'Failed to update description' });
  }
});

// --- Avatar management ---

router.post('/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }
  const filename = req.file.filename;
  const avatarUrl = ts3audiobot.buildAvatarUrl(filename);
  console.log('Setting bot avatar, URL:', avatarUrl);
  const success = await ts3audiobot.setAvatar(avatarUrl);
  if (success) {
    res.json({ message: 'Avatar updated', filename });
  } else {
    res.json({ message: 'File uploaded but bot avatar command failed. The bot may not be able to reach the URL.', filename, avatarUrl, warning: true });
  }
});

router.delete('/avatar', async (_req: Request, res: Response) => {
  const success = await ts3audiobot.clearAvatar();
  if (success) {
    res.json({ message: 'Avatar cleared' });
  } else {
    res.status(500).json({ error: 'Failed to clear avatar' });
  }
});

router.post('/avatar/default', upload.single('avatar'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }

  // Remove old default avatar file if exists
  const s = settingsService.get();
  if (s.bot.defaultAvatar) {
    const oldPath = path.join(avatarsDir, s.bot.defaultAvatar);
    fs.unlink(oldPath, () => {});
  }

  // Rename to default-avatar.*
  const ext = path.extname(req.file.filename).toLowerCase() || '.png';
  const defaultFilename = `default-avatar${ext}`;
  const newPath = path.join(avatarsDir, defaultFilename);
  fs.renameSync(req.file.path, newPath);

  settingsService.save({ bot: { defaultAvatar: defaultFilename } });
  res.json({ message: 'Default avatar set', filename: defaultFilename });
});

router.delete('/avatar/default', async (_req: Request, res: Response) => {
  const s = settingsService.get();
  if (s.bot.defaultAvatar) {
    const filePath = path.join(avatarsDir, s.bot.defaultAvatar);
    fs.unlink(filePath, () => {});
  }
  settingsService.save({ bot: { defaultAvatar: '' } });
  res.json({ message: 'Default avatar removed' });
});

export default router;
