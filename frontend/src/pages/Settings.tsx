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
  Youtube,
  Wifi,
  Upload,
  Trash2,
  ImageIcon,
  Lock,
  KeyRound,
  Bug,
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
    rightsFile: string;
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
  locked,
  children,
}: {
  label: string;
  description?: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium block">{label}</label>
        {locked && (
          <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
            <Lock className="h-2.5 w-2.5" /> ENV
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground/70">{description}</p>
      )}
      {locked && (
        <p className="text-xs text-amber-400/70">Gesetzt durch Umgebungsvariable — im Frontend nicht änderbar.</p>
      )}
      {children}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-primary' : 'bg-secondary'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
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
  const [envLocked, setEnvLocked] = useState<string[]>([]);
  const isAdmin = (JSON.parse(localStorage.getItem('user') || '{}').role) === 'admin';

  // Password-change state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    Promise.all([api.getSettings(), api.getEnvLocked()]).then(([data, locked]) => {
      setSettings(data);
      setEnvLocked(locked.locked);
      setLoading(false);
    }).catch(() => {
      setStatus({ type: 'error', message: 'Failed to load settings' });
      setLoading(false);
    });
  }, [isAdmin]);

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
    value: string | number | boolean,
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: { ...settings[section], [field]: value },
    });
  };

  const isLocked = (path: string) => envLocked.includes(path);

  const handlePasswordChange = async () => {
    if (!pwNew || !pwCurrent) { setPwStatus({ type: 'error', message: 'Alle Felder ausfüllen' }); return; }
    if (pwNew !== pwConfirm) { setPwStatus({ type: 'error', message: 'Neue Passwörter stimmen nicht überein' }); return; }
    if (pwNew.length < 6) { setPwStatus({ type: 'error', message: 'Passwort muss mindestens 6 Zeichen haben' }); return; }
    setPwSaving(true);
    setPwStatus(null);
    try {
      await api.changePassword(pwCurrent, pwNew);
      setPwStatus({ type: 'success', message: 'Passwort erfolgreich geändert' });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err) {
      setPwStatus({ type: 'error', message: err instanceof Error ? err.message : 'Fehler beim Ändern' });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header bar */}
      <header className="border-b border-border/50 px-6 py-3 flex items-center justify-between flex-shrink-0 glass z-10">
        <div>
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-xs text-muted-foreground">Bot, Server-Verbindung und Integrationen konfigurieren</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            {status && (
              <div className={`flex items-center gap-1.5 text-sm animate-in ${status.type === 'success' ? 'text-green-400' : 'text-destructive'}`}>
                {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {status.message}
              </div>
            )}
            <Button onClick={handleSave} disabled={saving || !settings} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Changes
            </Button>
          </div>
        )}
      </header>

      {/* Scrollable settings content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Password Change — available to all users */}
        <SettingsSection title="Konto / Sicherheit" description="Passwort des eigenen Accounts ändern" icon={KeyRound}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Aktuelles Passwort">
              <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="Aktuelles Passwort" />
            </Field>
            <Field label="Neues Passwort">
              <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Mindestens 6 Zeichen" />
            </Field>
            <Field label="Passwort bestätigen">
              <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Wiederholen" />
            </Field>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" onClick={handlePasswordChange} disabled={pwSaving}>
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <KeyRound className="h-4 w-4 mr-1.5" />}
              Passwort ändern
            </Button>
            {pwStatus && (
              <span className={`text-sm flex items-center gap-1.5 ${pwStatus.type === 'success' ? 'text-green-400' : 'text-destructive'}`}>
                {pwStatus.type === 'success' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {pwStatus.message}
              </span>
            )}
          </div>
        </SettingsSection>

        {/* Admin-only settings below */}
        {!isAdmin ? (
          <div className="rounded-xl border border-border/40 bg-card/30 p-6 text-center text-muted-foreground text-sm">
            Admin-Berechtigungen erforderlich, um weitere Einstellungen zu sehen.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !settings ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Failed to load settings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* TS3 Server — spans both columns, uses 3-col inner grid */}
            <SettingsSection title="TeamSpeak Server" description="Verbindungsdaten für TS3/TS6 Server" icon={Server} className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Host / IP" description="IP-Adresse oder Hostname" locked={isLocked('ts3server.host')}>
                  <Input
                    value={settings.ts3server.host}
                    onChange={(e) => update('ts3server', 'host', e.target.value)}
                    placeholder="127.0.0.1"
                    disabled={isLocked('ts3server.host')}
                  />
                </Field>
                <Field label="Voice Port" description="Standard: 9987" locked={isLocked('ts3server.port')}>
                  <Input
                    type="number"
                    value={settings.ts3server.port}
                    onChange={(e) => update('ts3server', 'port', parseInt(e.target.value) || 9987)}
                    disabled={isLocked('ts3server.port')}
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
                <Field label="ServerQuery Port" description="Standard: 10011" locked={isLocked('ts3server.queryPort')}>
                  <Input
                    type="number"
                    value={settings.ts3server.queryPort}
                    onChange={(e) => update('ts3server', 'queryPort', parseInt(e.target.value) || 10011)}
                    disabled={isLocked('ts3server.queryPort')}
                  />
                </Field>
                <Field label="ServerQuery User" locked={isLocked('ts3server.queryUser')}>
                  <Input
                    value={settings.ts3server.queryUser}
                    onChange={(e) => update('ts3server', 'queryUser', e.target.value)}
                    placeholder="serveradmin"
                    disabled={isLocked('ts3server.queryUser')}
                  />
                </Field>
                <Field label="ServerQuery Password" locked={isLocked('ts3server.queryPassword')}>
                  <Input
                    type="password"
                    value={settings.ts3server.queryPassword}
                    onChange={(e) => update('ts3server', 'queryPassword', e.target.value)}
                    placeholder="ServerQuery password"
                    disabled={isLocked('ts3server.queryPassword')}
                  />
                </Field>
              </div>
            </SettingsSection>

            {/* TS3AudioBot */}
            <SettingsSection title="TS3AudioBot" description="REST API Verbindung zu TS3AudioBot" icon={Wifi}>
              <Field label="Bot API URL" description="REST API Endpunkt von TS3AudioBot" locked={isLocked('ts3audiobot.url')}>
                <Input
                  value={settings.ts3audiobot.url}
                  onChange={(e) => update('ts3audiobot', 'url', e.target.value)}
                  placeholder="http://localhost:58913"
                  disabled={isLocked('ts3audiobot.url')}
                />
              </Field>
              <Field label="API Key" description="Optionaler API-Key für Authentifizierung" locked={isLocked('ts3audiobot.apiKey')}>
                <Input
                  type="password"
                  value={settings.ts3audiobot.apiKey}
                  onChange={(e) => update('ts3audiobot', 'apiKey', e.target.value)}
                  placeholder="Optional"
                  disabled={isLocked('ts3audiobot.apiKey')}
                />
              </Field>
              <Field label="Rights File Path" description="Absoluter Pfad zur rights.toml — wird vom Permissions-Tab verwaltet" locked={isLocked('ts3audiobot.rightsFile')}>
                <Input
                  value={settings.ts3audiobot.rightsFile}
                  onChange={(e) => update('ts3audiobot', 'rightsFile', e.target.value)}
                  placeholder="/path/to/ts3audiobot/bin/rights.toml"
                  className="font-mono text-sm"
                  disabled={isLocked('ts3audiobot.rightsFile')}
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
            <SettingsSection title="Bot" description="Anzeigename, Kanal und Avatar-Einstellungen" icon={Bot}>
              <Field label="Bot Name" description="Anzeigename in TeamSpeak">
                <Input
                  value={settings.bot.name}
                  onChange={(e) => update('bot', 'name', e.target.value)}
                  placeholder="MusicBot"
                />
              </Field>
              <Field label="Default Channel" description="Kanal bei Verbindungsaufbau">
                <Input
                  value={settings.bot.defaultChannel}
                  onChange={(e) => update('bot', 'defaultChannel', e.target.value)}
                  placeholder="Music"
                />
              </Field>
              <Field label="Identity" description="TS3 Identity-String (leer = auto-generiert)">
                <Input
                  value={settings.bot.identity}
                  onChange={(e) => update('bot', 'identity', e.target.value)}
                  placeholder="Auto-generated"
                />
              </Field>
              <Field label="Default Avatar" description="Avatar wird beim Verbinden automatisch gesetzt">
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

            {/* yt-dlp */}
            <SettingsSection title="YouTube / yt-dlp" description="YouTube Download-Einstellungen" icon={Youtube}>
              <Field label="yt-dlp Pfad" description="Pfad zur yt-dlp Binary (Standard: yt-dlp im PATH)" locked={isLocked('ytdlp.path')}>
                <Input
                  value={settings.ytdlp.path}
                  onChange={(e) => update('ytdlp', 'path', e.target.value)}
                  placeholder="yt-dlp"
                  disabled={isLocked('ytdlp.path')}
                />
              </Field>
              <Field label="Cookies File" description="Netscape-Format Cookie-Datei für altersbeschränkte Inhalte">
                <Input
                  value={settings.ytdlp.cookiesFile}
                  onChange={(e) => update('ytdlp', 'cookiesFile', e.target.value)}
                  placeholder="Optional: /path/to/cookies.txt"
                />
              </Field>
            </SettingsSection>

            {/* Debug Mode */}
            <SettingsSection title="Debug" description="Erweiterte Diagnose-Optionen" icon={Bug} className="lg:col-span-2">
              <ToggleField
                label="Debug-Modus"
                description="Aktiviert die Logs-Seite in der Sidebar mit Echtzeit-Logs von Backend und TS3AudioBot"
                checked={settings.debugMode}
                onChange={(v) => setSettings({ ...settings, debugMode: v })}
              />
              {settings.debugMode && (
                <p className="text-xs text-amber-400/80 flex items-center gap-1.5 mt-1">
                  <Bug className="h-3.5 w-3.5" />
                  Für TS3AudioBot-Logs muss <code className="font-mono bg-black/20 px-1 rounded">/var/run/docker.sock</code> im Backend-Container gemountet sein.
                  Container-Name via <code className="font-mono bg-black/20 px-1 rounded">DOCKER_TS3AUDIOBOT_CONTAINER</code> Env-Var konfigurierbar (Standard: <code className="font-mono bg-black/20 px-1 rounded">musicbot-ts3audiobot-1</code>).
                </p>
              )}
            </SettingsSection>

            {/* Bottom spacer */}
            <div className="h-4" />
          </div>
        )}

        </div>
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
