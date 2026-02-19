import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { commandRegistry } from '../services/commandRegistry';

const router = Router();
router.use(authMiddleware);

// GET /api/commands — list all commands
router.get('/', (_req, res) => {
  res.json({ commands: commandRegistry.getAll() });
});

// PUT /api/commands/:id — update display metadata (label / description only)
router.put('/:id', (req, res) => {
  const { label, description } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });
  const updated = commandRegistry.updateMeta(req.params.id, label, description ?? '');
  if (!updated) return res.status(404).json({ error: 'Command not found' });
  res.json({ command: updated });
});

// PATCH /api/commands/:id/toggle — flip global enabled
router.patch('/:id/toggle', (req, res) => {
  const updated = commandRegistry.toggleGlobal(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Command not found' });
  res.json({ command: updated });
});

// PATCH /api/commands/:id/bots/:botId/toggle — flip per-bot override
router.patch('/:id/bots/:botId/toggle', (req, res) => {
  const updated = commandRegistry.toggleBot(req.params.id, parseInt(req.params.botId));
  if (!updated) return res.status(404).json({ error: 'Command not found' });
  res.json({ command: updated });
});

// DELETE /api/commands/:id/bots/:botId/override — remove per-bot override (revert to global)
router.delete('/:id/bots/:botId/override', (req, res) => {
  const updated = commandRegistry.clearBotOverride(req.params.id, parseInt(req.params.botId));
  if (!updated) return res.status(404).json({ error: 'Command not found' });
  res.json({ command: updated });
});

export default router;
