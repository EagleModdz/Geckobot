import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { db } from './database';

export interface Command {
  id: string;
  command: string;     // TS3AudioBot API path, e.g. "play", "volume", "bot name"
  label: string;       // Human-readable display name
  description: string;
  category: string;    // "Playback", "Bot", "Queue", "Info", "Admin"
  enabled: boolean;    // Global toggle
  botStates: Record<string, boolean>; // Per-bot overrides keyed by botId string
}

type DbRow = {
  id: string;
  command: string;
  label: string;
  description: string;
  category: string;
  enabled: number;
  bot_states: string;
  created_at: number;
};

// ── Predefined TS3AudioBot commands ─────────────────────────────────────────
// These match the command paths exposed at /api/<path> in TS3AudioBot v0.14.
// Organized by category. All start enabled.

const BUILTIN_COMMANDS: Omit<Command, 'id' | 'enabled' | 'botStates'>[] = [
  // Playback
  { command: 'play',     label: 'Play',          description: 'Play audio from a URL or resource',       category: 'Playback' },
  { command: 'pause',    label: 'Pause',         description: 'Pause or resume playback',                category: 'Playback' },
  { command: 'stop',     label: 'Stop',          description: 'Stop playback and clear current track',   category: 'Playback' },
  { command: 'next',     label: 'Skip',          description: 'Skip to the next track in the queue',     category: 'Playback' },
  { command: 'previous', label: 'Previous',      description: 'Go back to the previous track',           category: 'Playback' },
  { command: 'seek',     label: 'Seek',          description: 'Seek to a position (seconds)',            category: 'Playback' },
  { command: 'volume',   label: 'Volume',        description: 'Get or set the playback volume (0–100)',  category: 'Playback' },
  { command: 'repeat',   label: 'Repeat',        description: 'Set repeat mode (off / one / all)',       category: 'Playback' },
  { command: 'random',   label: 'Shuffle',       description: 'Enable or disable random playback order', category: 'Playback' },
  { command: 'song',     label: 'Now Playing',   description: 'Show information about the current track', category: 'Playback' },

  // Queue
  { command: 'add',              label: 'Add to Queue',    description: 'Add a track to the play queue',           category: 'Queue' },
  { command: 'clear',            label: 'Clear Queue',     description: 'Clear the entire play queue',             category: 'Queue' },
  { command: 'list play',        label: 'Play Playlist',   description: 'Play tracks from a saved playlist',       category: 'Queue' },
  { command: 'list queue',       label: 'Queue Playlist',  description: 'Append a playlist to the queue',         category: 'Queue' },
  { command: 'list show',        label: 'Show Playlist',   description: 'Display the contents of a playlist',     category: 'Queue' },
  { command: 'list list',        label: 'List Playlists',  description: 'List all available saved playlists',     category: 'Queue' },

  // Bot
  { command: 'bot name',          label: 'Bot Name',        description: 'Get or set the bot display name',        category: 'Bot' },
  { command: 'bot move',          label: 'Move to Channel', description: 'Move the bot to a specific channel',     category: 'Bot' },
  { command: 'bot come',          label: 'Come Here',       description: 'Move the bot to the invoker\'s channel', category: 'Bot' },
  { command: 'bot info',          label: 'Bot Info',        description: 'Show bot status and information',        category: 'Bot' },
  { command: 'bot description set', label: 'Set Description', description: 'Update the bot\'s status description', category: 'Bot' },
  { command: 'bot avatar set',    label: 'Set Avatar',      description: 'Set the bot avatar from a file or URL',  category: 'Bot' },
  { command: 'bot commander',     label: 'Commander Mode',  description: 'Toggle channel commander mode',          category: 'Bot' },
  { command: 'bot disconnect',    label: 'Disconnect Bot',  description: 'Disconnect the bot from the server',     category: 'Bot' },

  // Subscription / Voice
  { command: 'subscribe',         label: 'Subscribe',       description: 'Subscribe to the bot\'s audio stream',   category: 'Voice' },
  { command: 'unsubscribe',       label: 'Unsubscribe',     description: 'Unsubscribe from the audio stream',      category: 'Voice' },
  { command: 'whisper all',       label: 'Whisper All',     description: 'Whisper to all clients',                 category: 'Voice' },
  { command: 'whisper off',       label: 'Whisper Off',     description: 'Disable whisper mode',                   category: 'Voice' },

  // Info
  { command: 'help',    label: 'Help',    description: 'Show command help text',                   category: 'Info' },
  { command: 'version', label: 'Version', description: 'Show the bot version string',              category: 'Info' },

  // Admin
  { command: 'settings get',    label: 'Get Setting',    description: 'Read a bot configuration value',   category: 'Admin' },
  { command: 'settings set',    label: 'Set Setting',    description: 'Write a bot configuration value',  category: 'Admin' },
  { command: 'rights reload',   label: 'Reload Rights',  description: 'Reload the rights/permissions config', category: 'Admin' },
  { command: 'plugin list',     label: 'List Plugins',   description: 'List loaded plugins',               category: 'Admin' },
];

// ── Registry class ───────────────────────────────────────────────────────────

class CommandRegistry extends EventEmitter {
  private commands: Map<string, Command> = new Map();

  constructor() {
    super();
    this.loadFromDb();
    this.seed();
  }

  private loadFromDb(): void {
    try {
      const rows = db.prepare('SELECT * FROM commands ORDER BY created_at ASC').all() as DbRow[];
      for (const row of rows) {
        this.commands.set(row.id, this.rowToCommand(row));
      }
    } catch {
      // Table not ready yet — seed() will handle it after db.exec initializes it
    }
  }

  /** Insert any builtin command that doesn't exist in the DB yet. */
  private seed(): void {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO commands (id, command, label, description, category, enabled, bot_states, created_at)
      VALUES (?, ?, ?, ?, ?, 1, '{}', ?)
    `);
    const existing = new Set(Array.from(this.commands.values()).map((c) => c.command));
    const now = Date.now();

    for (const def of BUILTIN_COMMANDS) {
      if (existing.has(def.command)) continue;
      const id = uuid();
      stmt.run(id, def.command, def.label, def.description, def.category, now);
      this.commands.set(id, {
        id,
        command: def.command,
        label: def.label,
        description: def.description,
        category: def.category,
        enabled: true,
        botStates: {},
      });
    }
  }

  private rowToCommand(row: DbRow): Command {
    return {
      id: row.id,
      command: row.command,
      label: row.label,
      description: row.description,
      category: row.category,
      enabled: row.enabled === 1,
      botStates: JSON.parse(row.bot_states || '{}'),
    };
  }

  private persist(cmd: Command, createdAt = Date.now()): void {
    db.prepare(`
      INSERT OR REPLACE INTO commands
        (id, command, label, description, category, enabled, bot_states, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cmd.id,
      cmd.command,
      cmd.label,
      cmd.description,
      cmd.category,
      cmd.enabled ? 1 : 0,
      JSON.stringify(cmd.botStates),
      createdAt,
    );
  }

  // ── Public read API ──────────────────────────────────────────────────────

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /**
   * Runtime check before proxying a command to TS3AudioBot.
   * Per-bot override wins; falls back to global enabled flag.
   */
  isEnabled(commandId: string, botId?: number): boolean {
    const cmd = this.commands.get(commandId);
    if (!cmd) return true; // unknown command: don't block
    if (botId !== undefined) {
      const override = cmd.botStates[String(botId)];
      if (override !== undefined) return override;
    }
    return cmd.enabled;
  }

  /** Convenience: check by TS3AudioBot command path instead of internal id. */
  isEnabledByCommand(commandPath: string, botId?: number): boolean {
    const cmd = Array.from(this.commands.values()).find((c) => c.command === commandPath);
    if (!cmd) return true; // unknown command: don't block
    return this.isEnabled(cmd.id, botId);
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  /** Update only the display metadata (label / description). */
  updateMeta(id: string, label: string, description: string): Command | null {
    const cmd = this.commands.get(id);
    if (!cmd) return null;
    const updated: Command = { ...cmd, label, description };
    this.commands.set(id, updated);
    this.persist(updated);
    this.emit('changed', this.getAll());
    return updated;
  }

  /** Flip the global enabled flag. */
  toggleGlobal(id: string): Command | null {
    const cmd = this.commands.get(id);
    if (!cmd) return null;
    const updated: Command = { ...cmd, enabled: !cmd.enabled };
    this.commands.set(id, updated);
    this.persist(updated);
    this.emit('changed', this.getAll());
    return updated;
  }

  /**
   * Flip the per-bot override.
   * First flip: sets override to the opposite of global. Subsequent: flips override.
   */
  toggleBot(commandId: string, botId: number): Command | null {
    const cmd = this.commands.get(commandId);
    if (!cmd) return null;
    const key = String(botId);
    const current = cmd.botStates[key];
    const next = current === undefined ? !cmd.enabled : !current;
    const updated: Command = { ...cmd, botStates: { ...cmd.botStates, [key]: next } };
    this.commands.set(commandId, updated);
    this.persist(updated);
    this.emit('changed', this.getAll());
    return updated;
  }

  /** Remove per-bot override — reverts to global setting. */
  clearBotOverride(commandId: string, botId: number): Command | null {
    const cmd = this.commands.get(commandId);
    if (!cmd) return null;
    const botStates = { ...cmd.botStates };
    delete botStates[String(botId)];
    const updated: Command = { ...cmd, botStates };
    this.commands.set(commandId, updated);
    this.persist(updated);
    this.emit('changed', this.getAll());
    return updated;
  }
}

export const commandRegistry = new CommandRegistry();
