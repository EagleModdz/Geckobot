import { getSetting, setSetting } from './database';

export interface BotSettings {
  ts3server: {
    host: string;
    port: number;
    queryPort: number;
    queryUser: string;
    queryPassword: string;
    serverPassword: string;
  };
  ts3audiobot: {
    url: string;
    apiKey: string;
    rightsFile: string; // absolute path to rights.toml managed by this backend
  };
  bot: {
    name: string;
    defaultChannel: string;
    identity: string;
    defaultAvatar: string;
  };
  ytdlp: {
    path: string;
    cookiesFile: string;
  };
  debugMode: boolean;
}

const SETTINGS_KEY = 'app_settings';

const defaults: BotSettings = {
  ts3server: {
    host: process.env.TS3_SERVER_HOST || '',
    port: parseInt(process.env.TS3_SERVER_PORT || '9987', 10),
    queryPort: parseInt(process.env.TS3_SERVER_QUERY_PORT || '10011', 10),
    queryUser: process.env.TS3_SERVER_QUERY_USER || 'serveradmin',
    queryPassword: process.env.TS3_SERVER_QUERY_PASSWORD || '',
    serverPassword: '',
  },
  ts3audiobot: {
    url: process.env.TS3AUDIOBOT_URL || '',
    apiKey: process.env.TS3AUDIOBOT_API_KEY || '',
    rightsFile: process.env.RIGHTS_FILE_PATH || '',
  },
  bot: {
    name: 'MusicBot',
    defaultChannel: '',
    identity: '',
    defaultAvatar: '',
  },
  ytdlp: {
    path: process.env.YT_DLP_PATH || 'yt-dlp',
    cookiesFile: '',
  },
  debugMode: false,
};

/** Returns dot-notation keys that are controlled by environment variables. */
export function getEnvLockedKeys(): string[] {
  const locked: string[] = [];
  if (process.env.TS3AUDIOBOT_URL)           locked.push('ts3audiobot.url');
  if (process.env.TS3AUDIOBOT_API_KEY)        locked.push('ts3audiobot.apiKey');
  if (process.env.RIGHTS_FILE_PATH)           locked.push('ts3audiobot.rightsFile');
  if (process.env.TS3_SERVER_HOST)            locked.push('ts3server.host');
  if (process.env.TS3_SERVER_PORT)            locked.push('ts3server.port');
  if (process.env.TS3_SERVER_QUERY_PORT)      locked.push('ts3server.queryPort');
  if (process.env.TS3_SERVER_QUERY_USER)      locked.push('ts3server.queryUser');
  if (process.env.TS3_SERVER_QUERY_PASSWORD)  locked.push('ts3server.queryPassword');
  if (process.env.YT_DLP_PATH)               locked.push('ytdlp.path');
  return locked;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

class SettingsService {
  private cache: BotSettings | null = null;

  load(): BotSettings {
    if (this.cache) return this.cache;

    const raw = getSetting(SETTINGS_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        this.cache = this.deepMerge(defaults, saved);
      } catch {
        this.cache = { ...defaults };
      }
    } else {
      this.cache = { ...defaults };
    }
    return this.cache;
  }

  save(settings: AnyObj): BotSettings {
    const current = this.load();
    const merged = this.deepMerge(current, settings);
    setSetting(SETTINGS_KEY, JSON.stringify(merged));
    this.cache = merged;
    return merged;
  }

  get(): BotSettings {
    return this.load();
  }

  /** Returns settings with passwords masked for frontend display */
  getSafe(): BotSettings {
    const s = this.load();
    return {
      ...s,
      ts3server: {
        ...s.ts3server,
        queryPassword: s.ts3server.queryPassword ? '********' : '',
        serverPassword: s.ts3server.serverPassword ? '********' : '',
      },
      ts3audiobot: {
        ...s.ts3audiobot,
        apiKey: s.ts3audiobot.apiKey ? '********' : '',
      },
      debugMode: s.debugMode,
    };
  }

  getDebugMode(): boolean {
    return this.load().debugMode;
  }

  /** Merges incoming partial update, preserving masked password fields */
  applyUpdate(update: AnyObj): BotSettings {
    const current = this.load();
    const cleaned = this.stripMaskedPasswords(update, current as unknown as AnyObj);
    return this.save(cleaned);
  }

  private stripMaskedPasswords(update: AnyObj, current: AnyObj): AnyObj {
    const result: AnyObj = {};
    for (const key of Object.keys(update)) {
      const val = update[key];
      if (val === '********') {
        result[key] = current[key];
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = this.stripMaskedPasswords(val, current[key] || {});
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  private deepMerge(target: AnyObj, source: AnyObj): BotSettings {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];
      if (
        sourceVal &&
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal) &&
        targetVal &&
        typeof targetVal === 'object' &&
        !Array.isArray(targetVal)
      ) {
        result[key] = { ...targetVal, ...sourceVal };
      } else if (sourceVal !== undefined) {
        result[key] = sourceVal;
      }
    }
    return result as BotSettings;
  }
}

export const settingsService = new SettingsService();
