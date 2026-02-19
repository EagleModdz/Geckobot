import { Router } from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth';
import { permissionService } from '../services/permissionService';
import { settingsService } from '../services/settings';
import { ts3audiobot } from '../services/ts3audiobot';

const router = Router();
router.use(authMiddleware);

// ── Groups ───────────────────────────────────────────────────────────────────

// GET /api/permissions/groups
router.get('/groups', (_req, res) => {
  res.json({ groups: permissionService.getAllGroups() });
});

// GET /api/permissions/preview — returns the generated TOML for debugging
router.get('/preview', (_req, res) => {
  const s = settingsService.get();
  const groups = permissionService.getAllGroups();
  const toml = permissionService.generateTOML(groups);
  res.json({ toml, rightsFile: s.ts3audiobot.rightsFile || null });
});

// GET /api/permissions/ts3-clients — live TS3 clients with UIDs from server/tree
router.get('/ts3-clients', async (_req, res) => {
  try {
    const s = settingsService.get();
    const baseUrl = s.ts3audiobot.url || 'http://localhost:58913';
    const botId = ts3audiobot.getSelectedBotId();
    const resp = await axios.get(`${baseUrl}/api/bot/use/${botId}(/server/tree)`, { timeout: 5000 });
    const clients: { id: number; name: string; uid: string }[] = [];
    const botUid = resp.data?.Clients?.[String(resp.data?.OwnClientId)]?.Uid;
    for (const [, c] of Object.entries(resp.data?.Clients ?? {})) {
      const client = c as { Id?: number; Name?: string; Uid?: string };
      if (!client.Uid || client.Uid === botUid) continue; // skip bot itself
      clients.push({ id: client.Id ?? 0, name: client.Name ?? '', uid: client.Uid });
    }
    res.json({ clients });
  } catch {
    res.json({ clients: [] });
  }
});

// POST /api/permissions/groups  { name, color }
router.post('/groups', async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const group = permissionService.createGroup(name.trim(), color || '#6366f1');
  const apply = await permissionService.applyRights();
  res.status(201).json({ group, apply });
});

// PUT /api/permissions/groups/:id  { name, color }
router.put('/groups/:id', async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const ok = permissionService.renameGroup(req.params.id, name.trim(), color || '#6366f1');
  if (!ok) return res.status(404).json({ error: 'Group not found' });
  const apply = await permissionService.applyRights();
  res.json({ group: permissionService.getGroup(req.params.id), apply });
});

// DELETE /api/permissions/groups/:id
router.delete('/groups/:id', async (req, res) => {
  const ok = permissionService.deleteGroup(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Group not found' });
  const apply = await permissionService.applyRights();
  res.json({ message: 'Deleted', apply });
});

// ── Members ───────────────────────────────────────────────────────────────────

// POST /api/permissions/groups/:id/members  { type: 'uid'|'groupid', value, displayName? }
router.post('/groups/:id/members', async (req, res) => {
  const { type, value, displayName } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'type and value are required' });
  if (!['uid', 'groupid'].includes(type)) return res.status(400).json({ error: 'type must be uid or groupid' });
  permissionService.addMember(req.params.id, type as 'uid' | 'groupid', value.trim(), displayName);
  const apply = await permissionService.applyRights();
  res.json({ group: permissionService.getGroup(req.params.id), apply });
});

// DELETE /api/permissions/groups/:id/members  { type, value }
router.delete('/groups/:id/members', async (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'type and value are required' });
  permissionService.removeMember(req.params.id, type, value);
  const apply = await permissionService.applyRights();
  res.json({ group: permissionService.getGroup(req.params.id), apply });
});

// ── Grants ────────────────────────────────────────────────────────────────────

// POST /api/permissions/groups/:id/commands  { command }
router.post('/groups/:id/commands', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'command is required' });
  permissionService.grantCommand(req.params.id, command);
  const apply = await permissionService.applyRights();
  res.json({ group: permissionService.getGroup(req.params.id), apply });
});

// POST /api/permissions/groups/:id/commands/grant-all — grant every known command at once
router.post('/groups/:id/commands/grant-all', async (req, res) => {
  const { commandRegistry } = require('../services/commandRegistry') as typeof import('../services/commandRegistry');
  const allCommands = commandRegistry.getAll().map((c) => c.command);
  for (const cmd of allCommands) {
    permissionService.grantCommand(req.params.id, cmd);
  }
  const apply = await permissionService.applyRights();
  res.json({ group: permissionService.getGroup(req.params.id), apply });
});

// DELETE /api/permissions/groups/:id/commands/:command
router.delete('/groups/:id/commands/:command', async (req, res) => {
  permissionService.revokeCommand(req.params.id, decodeURIComponent(req.params.command));
  const apply = await permissionService.applyRights();
  res.json({ group: permissionService.getGroup(req.params.id), apply });
});

export default router;
