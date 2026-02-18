import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { AvatarEditor } from '@/components/AvatarEditor';
import {
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Server,
  Bot,
  Music,
  Youtube,
  Wifi,
  Upload,
  Trash2,
  ImageIcon,
} from 'lucide-react';

interface SettingsData {
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
  };
  bot: {
    name: string;
    defaultChannel: string;
    identity: string;
    defaultAvatar: string;
  };
  spotify: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  ytdlp: {
    path: string;
    cookiesFile: string;
  };
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border/60 bg-card/60 overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-card/30">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium block">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground/70">{description}</p>
      )}
      {children}
    </div>
  );
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarEditFile, setAvatarEditFile] = useState<File | null>(null);

  useEffect(() => {
    api.getSettings().then((data) => {
      setSettings(data);
      setLoading(false);
    }).catch(() => {
      setStatus({ type: 'error', message: 'Failed to load settings' });
      setLoading(false);
    });
  }, []);

  // Auto-dismiss status after 4s
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setStatus(null);
    try {
      await api.saveSettings(settings);
      setStatus({ type: 'success', message: 'Settings saved successfully' });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      const result = await api.testTs3AudioBot();
      setTestResult(result);
    } catch {
      setTestResult({ ok: false, message: 'Test request failed' });
    }
  };

  const handleDefaultAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarEditFile(file);
    e.target.value = '';
  };

  const handleDefaultAvatarCropped = async (blob: Blob) => {
    setAvatarEditFile(null);
    setAvatarUploading(true);
    try {
      const file = new File([blob], 'default-avatar.png', { type: 'image/png' });
      const result = await api.uploadDefaultAvatar(file);
      if (settings) {
        setSettings({ ...settings, bot: { ...settings.bot, defaultAvatar: result.filename } });
      }
      setStatus({ type: 'success', message: 'Default avatar uploaded' });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveDefaultAvatar = async () => {
    try {
      await api.removeDefaultAvatar();
      if (settings) {
        setSettings({ ...settings, bot: { ...settings.bot, defaultAvatar: '' } });
      }
      setStatus({ type: 'success', message: 'Default avatar removed' });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to remove' });
    }
  };

  const update = <K extends keyof SettingsData>(
    section: K,
    field: keyof SettingsData[K],
    value: string | number,
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: { ...settings[section], [field]: value },
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header bar */}
      <header className="border-b border-border/50 px-6 py-3 flex items-center justify-between flex-shrink-0 glass z-10">
        <div>
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-xs text-muted-foreground">Configure your bot, server connection, and integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <div className={`flex items-center gap-1.5 text-sm animate-in ${status.type === 'success' ? 'text-green-400' : 'text-destructive'
              }`}>
              {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {status.message}
            </div>
          )}
          <Button onClick={handleSave} disabled={saving || !settings} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </header>

      {/* Scrollable settings content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !settings ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Failed to load settings</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* TS3 Server — spans both columns, uses 3-col inner grid */}
            <SettingsSection title="TeamSpeak Server" description="Connection details for your TS3/TS6 server" icon={Server} className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Host / IP" description="IP address or hostname">
                  <Input
                    value={settings.ts3server.host}
                    onChange={(e) => update('ts3server', 'host', e.target.value)}
                    placeholder="127.0.0.1"
                  />
                </Field>
                <Field label="Voice Port" description="Default: 9987">
                  <Input
                    type="number"
                    value={settings.ts3server.port}
                    onChange={(e) => update('ts3server', 'port', parseInt(e.target.value) || 9987)}
                  />
                </Field>
                <Field label="Server Password" description="Optional">
                  <Input
                    type="password"
                    value={settings.ts3server.serverPassword}
                    onChange={(e) => update('ts3server', 'serverPassword', e.target.value)}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="ServerQuery Port" description="Default: 10011">
                  <Input
                    type="number"
                    value={settings.ts3server.queryPort}
                    onChange={(e) => update('ts3server', 'queryPort', parseInt(e.target.value) || 10011)}
                  />
                </Field>
                <Field label="ServerQuery User">
                  <Input
                    value={settings.ts3server.queryUser}
                    onChange={(e) => update('ts3server', 'queryUser', e.target.value)}
                    placeholder="serveradmin"
                  />
                </Field>
                <Field label="ServerQuery Password">
                  <Input
                    type="password"
                    value={settings.ts3server.queryPassword}
                    onChange={(e) => update('ts3server', 'queryPassword', e.target.value)}
                    placeholder="ServerQuery password"
                  />
                </Field>
              </div>
            </SettingsSection>

            {/* TS3AudioBot */}
            <SettingsSection title="TS3AudioBot" description="REST API connection to TS3AudioBot" icon={Wifi}>
              <Field label="Bot API URL" description="REST API endpoint of TS3AudioBot">
                <Input
                  value={settings.ts3audiobot.url}
                  onChange={(e) => update('ts3audiobot', 'url', e.target.value)}
                  placeholder="http://localhost:58913"
                />
              </Field>
              <Field label="API Key" description="Optional API key for authentication">
                <Input
                  type="password"
                  value={settings.ts3audiobot.apiKey}
                  onChange={(e) => update('ts3audiobot', 'apiKey', e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <div className="flex items-center gap-3 pt-1">
                <Button variant="outline" size="sm" onClick={handleTestConnection}>
                  <Wifi className="h-3.5 w-3.5 mr-1.5" />
                  Test Connection
                </Button>
                {testResult && (
                  <span className={`text-sm flex items-center gap-1.5 ${testResult.ok ? 'text-green-400' : 'text-destructive'}`}>
                    {testResult.ok ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {testResult.message}
                  </span>
                )}
              </div>
            </SettingsSection>

            {/* Bot Settings */}
            <SettingsSection title="Bot" description="Display name, channel, and avatar settings" icon={Bot}>
              <Field label="Bot Name" description="Display name in TeamSpeak">
                <Input
                  value={settings.bot.name}
                  onChange={(e) => update('bot', 'name', e.target.value)}
                  placeholder="MusicBot"
                />
              </Field>
              <Field label="Default Channel" description="Channel to join on connect">
                <Input
                  value={settings.bot.defaultChannel}
                  onChange={(e) => update('bot', 'defaultChannel', e.target.value)}
                  placeholder="Music"
                />
              </Field>
              <Field label="Identity" description="TS3 identity string (leave empty for auto-generated)">
                <Input
                  value={settings.bot.identity}
                  onChange={(e) => update('bot', 'identity', e.target.value)}
                  placeholder="Auto-generated"
                />
              </Field>
              <Field label="Default Avatar" description="Avatar auto-applied on connect">
                <div className="flex items-center gap-4 pt-1">
                  {settings.bot.defaultAvatar ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL || ''}/uploads/avatars/${settings.bot.defaultAvatar}`}
                      alt="Default avatar"
                      className="w-14 h-14 rounded-lg object-cover border border-border/60 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-border/60 flex items-center justify-center bg-secondary/20">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="relative" disabled={avatarUploading}>
                      {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleDefaultAvatarFileSelect}
                        disabled={avatarUploading}
                      />
                    </Button>
                    {settings.bot.defaultAvatar && (
                      <Button variant="outline" size="sm" onClick={handleRemoveDefaultAvatar}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </Field>
            </SettingsSection>

            {/* Spotify */}
            <SettingsSection title="Spotify" description="Spotify API credentials for track metadata" icon={Music}>
              <Field label="Client ID">
                <Input
                  value={settings.spotify.clientId}
                  onChange={(e) => update('spotify', 'clientId', e.target.value)}
                  placeholder="Your Spotify Client ID"
                />
              </Field>
              <Field label="Client Secret">
                <Input
                  type="password"
                  value={settings.spotify.clientSecret}
                  onChange={(e) => update('spotify', 'clientSecret', e.target.value)}
                  placeholder="Your Spotify Client Secret"
                />
              </Field>
              <Field label="Redirect URI">
                <Input
                  value={settings.spotify.redirectUri}
                  onChange={(e) => update('spotify', 'redirectUri', e.target.value)}
                  placeholder="http://localhost:3001/api/spotify/callback"
                />
              </Field>
            </SettingsSection>

            {/* yt-dlp */}
            <SettingsSection title="YouTube / yt-dlp" description="YouTube download settings" icon={Youtube}>
              <Field label="yt-dlp Path" description="Path to the yt-dlp binary (default: yt-dlp in PATH)">
                <Input
                  value={settings.ytdlp.path}
                  onChange={(e) => update('ytdlp', 'path', e.target.value)}
                  placeholder="yt-dlp"
                />
              </Field>
              <Field label="Cookies File" description="Netscape-format cookies file for age-restricted content">
                <Input
                  value={settings.ytdlp.cookiesFile}
                  onChange={(e) => update('ytdlp', 'cookiesFile', e.target.value)}
                  placeholder="Optional: /path/to/cookies.txt"
                />
              </Field>
            </SettingsSection>

            {/* Bottom spacer */}
            <div className="h-4" />
          </div>
        )}
      </div>

      {avatarEditFile && (
        <AvatarEditor
          file={avatarEditFile}
          onConfirm={handleDefaultAvatarCropped}
          onCancel={() => setAvatarEditFile(null)}
        />
      )}
    </div>
  );
}
