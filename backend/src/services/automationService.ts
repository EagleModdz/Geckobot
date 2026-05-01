import { EventEmitter } from 'events';
import { db } from './database';
import { settingsService } from './settings';
import { ts3audiobot } from './ts3audiobot';
import { runTs3Query, parseClientList, ts3Escape } from './ts3query';

// ── Config types ─────────────────────────────────────────────────────────────

export interface AfkConfig {
  enabled: boolean;
  /** Channel ID to move AFK users into */
  afkChannelId: number | null;
  /** Minutes of idle time before moving (0 = disabled) */
  idleMinutes: number;
  /** Move immediately when user presses the AFK button in TS client */
  immediateOnAway: boolean;
  /** TS3 UIDs exempted from AFK handling */
  whitelist: string[];
  /** Send a private text message before moving */
  notifyUser: boolean;
  notifyMessage: string;
}

export interface NameRotationConfig {
  enabled: boolean;
  names: string[];
  /** Minimum 15 seconds (enforced) */
  intervalSeconds: number;
}

export interface AutomationConfig {
  afk: AfkConfig;
  nameRotation: NameRotationConfig;
}

const DEFAULT_CONFIG: AutomationConfig = {
  afk: {
    enabled: false,
    afkChannelId: null,
    idleMinutes: 10,
    immediateOnAway: true,
    whitelist: [],
    notifyUser: false,
    notifyMessage: 'Du wurdest automatisch in den AFK-Kanal verschoben.',
  },
  nameRotation: {
    enabled: false,
    names: [],
    intervalSeconds: 30,
  },
};

const DB_KEY = 'automation_config';

// ── Service ───────────────────────────────────────────────────────────────────

class AutomationService extends EventEmitter {
  private config: AutomationConfig = {
    afk: { ...DEFAULT_CONFIG.afk },
    nameRotation: { ...DEFAULT_CONFIG.nameRotation },
  };

  /** clids we already moved — prevents duplicate moves between poll cycles */
  private movedClids = new Set<number>();

  private afkPollTimer: ReturnType<typeof setInterval> | null = null;
  private afkFailureCount = 0;
  private afkLastError: string | null = null;

  private nameRotationTimer: ReturnType<typeof setInterval> | null = null;
  private nameIndex = 0;
  private rotationRunning = false;

  constructor() {
    super();
    this.loadConfig();
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private loadConfig(): void {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(DB_KEY) as { value: string } | undefined;
      if (row) {
        const parsed = JSON.parse(row.value) as Partial<AutomationConfig>;
        this.config.afk          = { ...DEFAULT_CONFIG.afk,          ...(parsed.afk          ?? {}) };
        this.config.nameRotation = { ...DEFAULT_CONFIG.nameRotation, ...(parsed.nameRotation ?? {}) };
        this.config.nameRotation.intervalSeconds = Math.max(15, this.config.nameRotation.intervalSeconds);
      }
    } catch { /* keep defaults */ }
  }

  private saveConfig(): void {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(DB_KEY, JSON.stringify(this.config));
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  getConfig(): AutomationConfig {
    return this.config;
  }

  updateConfig(patch: { afk?: Partial<AfkConfig>; nameRotation?: Partial<NameRotationConfig> }): AutomationConfig {
    if (patch.afk) {
      this.config.afk = { ...this.config.afk, ...patch.afk };
    }
    if (patch.nameRotation) {
      this.config.nameRotation = {
        ...this.config.nameRotation,
        ...patch.nameRotation,
        intervalSeconds: Math.max(15, patch.nameRotation.intervalSeconds ?? this.config.nameRotation.intervalSeconds),
      };
    }
    this.saveConfig();
    this.restartAfkPolling();
    return this.config;
  }

  // ── AFK Management ───────────────────────────────────────────────────────────

  private restartAfkPolling(): void {
    if (this.afkPollTimer) {
      clearInterval(this.afkPollTimer);
      this.afkPollTimer = null;
    }
    if (this.config.afk.enabled) {
      // First check shortly after enable, then every 60 s
      setTimeout(() => this.checkAfk(), 5_000);
      this.afkPollTimer = setInterval(() => this.checkAfk(), 60_000);
    }
  }

  private async checkAfk(): Promise<void> {
    if (!this.config.afk.enabled || !this.config.afk.afkChannelId) return;

    // Exponential back-off: after 3 consecutive failures, only retry every 10 minutes
    if (this.afkFailureCount >= 3) {
      const minutesSinceLast = (Date.now() - (this._afkLastFailureAt ?? 0)) / 60_000;
      if (minutesSinceLast < 10) return;
    }

    const s = settingsService.get();
    const { host, queryPort, queryUser, queryPassword } = s.ts3server;
    if (!host || !queryPort || !queryUser) {
      this.afkLastError = 'TS3-Query-Zugangsdaten nicht konfiguriert (host/queryPort/queryUser fehlen)';
      return;
    }

    try {
      await runTs3Query(host, queryPort, queryUser, queryPassword, async (send) => {
        const raw     = await send('clientlist -times -away -uid');
        const clients = parseClientList(raw);
        const afkCid  = this.config.afk.afkChannelId!;

        for (const client of clients) {
          if (client.type !== 0) continue;                              // skip query clients
          if (this.config.afk.whitelist.includes(client.uid)) continue;

          if (client.cid === afkCid) {
            // User is already in AFK channel — clear moved flag so they can be moved again later
            this.movedClids.delete(client.clid);
            continue;
          }

          if (this.movedClids.has(client.clid)) continue;              // already handled

          const idleTriggered  = this.config.afk.idleMinutes > 0 && client.idleMs / 60_000 >= this.config.afk.idleMinutes;
          const awayTriggered  = this.config.afk.immediateOnAway && client.away;

          if (!idleTriggered && !awayTriggered) continue;

          if (this.config.afk.notifyUser && this.config.afk.notifyMessage) {
            await send(
              `sendtextmessage targetmode=1 target=${client.clid} msg=${ts3Escape(this.config.afk.notifyMessage)}`,
            ).catch(() => {});
          }

          await send(`clientmove clid=${client.clid} cid=${afkCid}`);
          this.movedClids.add(client.clid);
          console.log(`[AFK] Moved "${client.nickname}" (uid=${client.uid}) to AFK channel ${afkCid}`);
        }
      });
      // Success — reset failure tracking
      this.afkFailureCount = 0;
      this.afkLastError = null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.afkLastError = msg;
      this._afkLastFailureAt = Date.now();
      this.afkFailureCount++;
      // Only log first 3 failures to avoid spamming the log
      if (this.afkFailureCount <= 3) {
        console.warn(`[AFK] Poll failed (attempt ${this.afkFailureCount}):`, msg);
      }
    }
  }

  private _afkLastFailureAt: number | null = null;

  // ── Name Rotation ────────────────────────────────────────────────────────────

  getAfkStatus(): { lastError: string | null; failureCount: number } {
    return { lastError: this.afkLastError, failureCount: this.afkFailureCount };
  }

  getRotationStatus(): { running: boolean; currentName: string | null; nextName: string | null } {
    const names = this.config.nameRotation.names;
    const len   = names.length;
    if (!this.rotationRunning || len === 0) {
      return { running: false, currentName: null, nextName: null };
    }
    const prevIdx = (this.nameIndex === 0 ? len - 1 : this.nameIndex - 1);
    return {
      running:     true,
      currentName: names[prevIdx % len],
      nextName:    names[this.nameIndex % len],
    };
  }

  startRotation(): { ok: boolean; error?: string } {
    if (this.config.nameRotation.names.length === 0) {
      return { ok: false, error: 'No names configured' };
    }
    if (this.rotationRunning) return { ok: true };

    this.rotationRunning = true;
    this.nameIndex = 0;
    this.applyNextName();

    const intervalMs = Math.max(15, this.config.nameRotation.intervalSeconds) * 1000;
    this.nameRotationTimer = setInterval(() => this.applyNextName(), intervalMs);
    return { ok: true };
  }

  stopRotation(): void {
    if (this.nameRotationTimer) {
      clearInterval(this.nameRotationTimer);
      this.nameRotationTimer = null;
    }
    this.rotationRunning = false;
  }

  private applyNextName(): void {
    const names = this.config.nameRotation.names;
    if (names.length === 0) return;
    const name   = names[this.nameIndex % names.length];
    this.nameIndex = (this.nameIndex + 1) % names.length;
    ts3audiobot.setBotName(name).catch(() => {});
    console.log(`[NameRotation] Applied name: "${name}"`);
  }

  /** Call once on server startup to restore AFK polling if it was enabled. */
  init(): void {
    this.restartAfkPolling();
  }
}

export const automationService = new AutomationService();
