import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { db } from './database';
import { settingsService } from './settings';
import { ts3audiobot } from './ts3audiobot';

export interface PermissionMember {
  type: 'uid' | 'groupid';
  value: string;        // TS3 UID string OR numeric server-group ID as string
  displayName?: string; // optional label for the UI
}

export interface PermissionGroup {
  id: string;
  name: string;
  color: string;
  members: PermissionMember[];
  grants: string[]; // TS3AudioBot command paths, e.g. ["play","volume","bot name"]
}

// Rights that everyone gets regardless of group membership.
// These are safe read-only commands.
const BASE_RIGHTS = [
  'cmd.help.*',
  'cmd.version',
  'cmd.song',
  'cmd.getmy.*',
  'cmd.rights.can',
  'cmd.subscribe',
  'cmd.unsubscribe',
  'cmd.bot.use',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** "bot name" → "cmd.bot.name",  "play" → "cmd.play" */
function toRight(command: string): string {
  return 'cmd.' + command.trim().replace(/\s+/g, '.');
}

function tomlStringList(items: string[]): string {
  return items.map((s) => `\t"${s}"`).join(',\n');
}

// ── Service ───────────────────────────────────────────────────────────────────

class PermissionService {
  // ── Read ──────────────────────────────────────────────────────────────────

  getAllGroups(): PermissionGroup[] {
    const groups = db
      .prepare('SELECT * FROM permission_groups ORDER BY created_at ASC')
      .all() as { id: string; name: string; color: string }[];

    return groups.map((g) => ({
      ...g,
      members: this.getMembers(g.id),
      grants: this.getGrants(g.id),
    }));
  }

  getGroup(id: string): PermissionGroup | null {
    const row = db
      .prepare('SELECT * FROM permission_groups WHERE id = ?')
      .get(id) as { id: string; name: string; color: string } | undefined;
    if (!row) return null;
    return { ...row, members: this.getMembers(id), grants: this.getGrants(id) };
  }

  private getMembers(groupId: string): PermissionMember[] {
    const rows = db
      .prepare('SELECT type, value, display_name FROM permission_members WHERE group_id = ?')
      .all(groupId) as { type: string; value: string; display_name: string | null }[];
    return rows.map((r) => ({
      type: r.type as 'uid' | 'groupid',
      value: r.value,
      displayName: r.display_name ?? undefined,
    }));
  }

  private getGrants(groupId: string): string[] {
    const rows = db
      .prepare('SELECT command FROM permission_grants WHERE group_id = ?')
      .all(groupId) as { command: string }[];
    return rows.map((r) => r.command);
  }

  // ── Groups CRUD ───────────────────────────────────────────────────────────

  createGroup(name: string, color: string): PermissionGroup {
    const id = uuid();
    db.prepare(
      'INSERT INTO permission_groups (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    ).run(id, name, color, Date.now());
    return { id, name, color, members: [], grants: [] };
  }

  renameGroup(id: string, name: string, color: string): boolean {
    const info = db
      .prepare('UPDATE permission_groups SET name = ?, color = ? WHERE id = ?')
      .run(name, color, id);
    return info.changes > 0;
  }

  deleteGroup(id: string): boolean {
    // Members and grants are deleted via ON DELETE CASCADE behaviour
    // (SQLite doesn't enforce FK by default; delete manually)
    db.prepare('DELETE FROM permission_members WHERE group_id = ?').run(id);
    db.prepare('DELETE FROM permission_grants WHERE group_id = ?').run(id);
    const info = db.prepare('DELETE FROM permission_groups WHERE id = ?').run(id);
    return info.changes > 0;
  }

  // ── Members ───────────────────────────────────────────────────────────────

  addMember(groupId: string, type: 'uid' | 'groupid', value: string, displayName?: string): boolean {
    try {
      db.prepare(
        'INSERT OR IGNORE INTO permission_members (group_id, type, value, display_name) VALUES (?, ?, ?, ?)',
      ).run(groupId, type, value, displayName ?? null);
      return true;
    } catch {
      return false;
    }
  }

  removeMember(groupId: string, type: string, value: string): boolean {
    const info = db
      .prepare('DELETE FROM permission_members WHERE group_id = ? AND type = ? AND value = ?')
      .run(groupId, type, value);
    return info.changes > 0;
  }

  // ── Grants ────────────────────────────────────────────────────────────────

  grantCommand(groupId: string, command: string): boolean {
    try {
      db.prepare(
        'INSERT OR IGNORE INTO permission_grants (group_id, command) VALUES (?, ?)',
      ).run(groupId, command);
      return true;
    } catch {
      return false;
    }
  }

  revokeCommand(groupId: string, command: string): boolean {
    const info = db
      .prepare('DELETE FROM permission_grants WHERE group_id = ? AND command = ?')
      .run(groupId, command);
    return info.changes > 0;
  }

  // ── rights.toml generation ────────────────────────────────────────────────

  generateTOML(groups: PermissionGroup[]): string {
    const lines: string[] = [
      '# Auto-generated by GeckoBot — do not edit manually.',
      '# Manage permissions via the frontend → Permissions tab.',
      '',
      '# Base rights: read-only commands available to everyone',
      '"+" = [',
      tomlStringList(BASE_RIGHTS),
      ']',
      '',
      '# GeckoBot backend — unrestricted API access from localhost',
      '[[rule]]',
      '\tip = [ "127.0.0.1", "::1" ]',
      '',
      '\t"+" = "*"',
    ];

    for (const group of groups) {
      if (group.grants.length === 0) continue;
      const activeGrants = group.grants;

      const rightsList = activeGrants.map(toRight);
      const rightsBlock = rightsList.map((r) => `\t\t"${r}",`).join('\n');

      const uids = group.members.filter((m) => m.type === 'uid');
      const groupIds = group.members.filter((m) => m.type === 'groupid');

      if (uids.length > 0) {
        const uidList = uids.map((m) => `"${m.value}"`).join(', ');
        lines.push(
          '',
          `# Group: ${group.name} — by TS3 UID`,
          '[[rule]]',
          `\tuseruid = [ ${uidList} ]`,
          '',
          '\t"+" = [',
          rightsBlock,
          '\t]',
        );
      }

      if (groupIds.length > 0) {
        const gidList = groupIds.map((m) => m.value).join(', ');
        lines.push(
          '',
          `# Group: ${group.name} — by TS3 server group`,
          '[[rule]]',
          `\tgroupid = [ ${gidList} ]`,
          '',
          '\t"+" = [',
          rightsBlock,
          '\t]',
        );
      }
    }

    lines.push(''); // trailing newline
    return lines.join('\n');
  }

  // ── Apply rights to disk + TS3AudioBot reload ─────────────────────────────

  async applyRights(): Promise<{ ok: boolean; error?: string }> {
    const s = settingsService.get();
    if (!s.ts3audiobot.rightsFile) {
      return {
        ok: false,
        error: 'Rights File Path is not configured. Go to Settings → TS3AudioBot and set the path to rights.toml.',
      };
    }

    const groups = this.getAllGroups();
    const toml = this.generateTOML(groups);

    try {
      fs.writeFileSync(s.ts3audiobot.rightsFile, toml, 'utf8');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[permissions] Failed to write rights.toml:', msg);
      return { ok: false, error: `Could not write rights.toml: ${msg}` };
    }

    try {
      await ts3audiobot.reloadRights();
    } catch (e: unknown) {
      console.warn('[permissions] rights reload failed (file was written):', e instanceof Error ? e.message : e);
    }

    return { ok: true };
  }
}

export const permissionService = new PermissionService();
