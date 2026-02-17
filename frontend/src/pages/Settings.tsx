import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { AvatarEditor } from '@/components/AvatarEditor';
import {
  ArrowLeft,
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
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
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
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}

export function Settings() {
  const navigate = useNavigate();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">Settings</span>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </header>

      {/* Status message */}
      {status && (
        <div className={`mx-4 mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
          status.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-destructive/10 border border-destructive/20 text-destructive'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {status.message}
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* TS3 Server */}
        <SettingsSection title="TeamSpeak 3 Server" icon={Server}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Host / IP" description="IP address or hostname of the TS3 server">
              <Input
                value={settings.ts3server.host}
                onChange={(e) => update('ts3server', 'host', e.target.value)}
                placeholder="127.0.0.1"
              />
            </Field>
            <Field label="Port" description="Voice port (default: 9987)">
              <Input
                type="number"
                value={settings.ts3server.port}
                onChange={(e) => update('ts3server', 'port', parseInt(e.target.value) || 9987)}
              />
            </Field>
          </div>
          <Field label="Server Password" description="Leave empty if no password is required">
            <Input
              type="password"
              value={settings.ts3server.serverPassword}
              onChange={(e) => update('ts3server', 'serverPassword', e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <Field label="ServerQuery Password">
            <Input
              type="password"
              value={settings.ts3server.queryPassword}
              onChange={(e) => update('ts3server', 'queryPassword', e.target.value)}
              placeholder="ServerQuery password"
            />
          </Field>
        </SettingsSection>

        {/* TS3AudioBot */}
        <SettingsSection title="TS3AudioBot" icon={Wifi}>
          <Field label="TS3AudioBot URL" description="REST API endpoint of TS3AudioBot">
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTestConnection}>
              Test Connection
            </Button>
            {testResult && (
              <span className={`text-xs flex items-center gap-1 ${testResult.ok ? 'text-green-400' : 'text-destructive'}`}>
                {testResult.ok ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {testResult.message}
              </span>
            )}
          </div>
        </SettingsSection>

        {/* Bot Settings */}
        <SettingsSection title="Bot" icon={Bot}>
          <Field label="Bot Name" description="Display name of the bot in TeamSpeak">
            <Input
              value={settings.bot.name}
              onChange={(e) => update('bot', 'name', e.target.value)}
              placeholder="MusicBot"
            />
          </Field>
          <Field label="Default Channel" description="Channel name or ID to join on connect (leave empty for default channel)">
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
          <Field label="Default Avatar" description="Avatar auto-applied to bots on connect">
            <div className="flex items-center gap-3">
              {settings.bot.defaultAvatar ? (
                <img
                  src={`${import.meta.env.VITE_API_URL || ''}/uploads/avatars/${settings.bot.defaultAvatar}`}
                  alt="Default avatar"
                  className="w-12 h-12 rounded-md object-cover border border-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-md border border-dashed border-border flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="relative" disabled={avatarUploading}>
                  {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
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
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </Field>
        </SettingsSection>

        {/* Spotify */}
        <SettingsSection title="Spotify" icon={Music}>
          <p className="text-xs text-muted-foreground">
            Create a Spotify app at developer.spotify.com to get these credentials.
          </p>
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
        <SettingsSection title="YouTube / yt-dlp" icon={Youtube}>
          <Field label="yt-dlp Path" description="Path to the yt-dlp binary (default: yt-dlp in PATH)">
            <Input
              value={settings.ytdlp.path}
              onChange={(e) => update('ytdlp', 'path', e.target.value)}
              placeholder="yt-dlp"
            />
          </Field>
          <Field label="Cookies File" description="Path to a Netscape-format cookies file for age-restricted content">
            <Input
              value={settings.ytdlp.cookiesFile}
              onChange={(e) => update('ytdlp', 'cookiesFile', e.target.value)}
              placeholder="Optional: /path/to/cookies.txt"
            />
          </Field>
        </SettingsSection>
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
