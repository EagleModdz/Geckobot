import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Zap, Play, Square, Plus, X, RefreshCw,
  AlertTriangle, CheckCircle2, Info, UserX, Wifi, WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useSocket } from '@/hooks/useSocket';

// ── Types ────────────────────────────────────────────────────────────────────

interface AfkConfig {
  enabled: boolean;
  afkChannelId: number | null;
  idleMinutes: number;
  immediateOnAway: boolean;
  whitelist: string[];
  notifyUser: boolean;
  notifyMessage: string;
}

interface NameRotationConfig {
  enabled: boolean;
  names: string[];
  intervalSeconds: number;
}

interface AutomationConfig {
  afk: AfkConfig;
  nameRotation: NameRotationConfig;
}

interface RotationStatus {
  running: boolean;
  currentName: string | null;
  nextName: string | null;
}

interface AfkStatus {
  lastError: string | null;
  failureCount: number;
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0
        ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
          ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary flex-shrink-0" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── AFK Tab ───────────────────────────────────────────────────────────────────

function AfkTab({ config, onSave }: { config: AfkConfig; onSave: (patch: Partial<AfkConfig>) => Promise<unknown> }) {
  const { channels } = useSocket();
  const [local, setLocal] = useState<AfkConfig>(config);
  const [saving, setSaving] = useState(false);
  const [newUid, setNewUid] = useState('');
  const [ts3Clients, setTs3Clients] = useState<{ id: number; name: string; uid: string }[]>([]);
  const [afkStatus, setAfkStatus] = useState<AfkStatus>({ lastError: null, failureCount: 0 });

  // Query credentials (read from/write to main Settings)
  const [queryCreds, setQueryCreds] = useState({ queryUser: '', queryPassword: '' });
  const [queryCredsLoading, setQueryCredsLoading] = useState(true);
  const [queryCredsSaving, setQueryCredsSaving] = useState(false);

  useEffect(() => { setLocal(config); }, [config]);

  useEffect(() => {
    api.getTs3Clients().then((r) => setTs3Clients(r.clients)).catch(() => {});
    // Load existing query credentials from settings
    api.getSettings().then((s) => {
      setQueryCreds({ queryUser: s.ts3server.queryUser, queryPassword: s.ts3server.queryPassword });
    }).catch(() => {}).finally(() => setQueryCredsLoading(false));
    // Poll AFK status
    const fetchStatus = () => api.getAutomationStatus().then((r) => {
      if ('afk' in r) setAfkStatus(r.afk as AfkStatus);
    }).catch(() => {});
    fetchStatus();
    const t = setInterval(fetchStatus, 10_000);
    return () => clearInterval(t);
  }, []);

  const saveQueryCreds = async () => {
    setQueryCredsSaving(true);
    try {
      const full = await api.getSettings();
      await api.saveSettings({
        ...full,
        ts3server: { ...full.ts3server, queryUser: queryCreds.queryUser, queryPassword: queryCreds.queryPassword },
      });
      toast.success('Query-Zugangsdaten gespeichert');
    } catch {
      toast.error('Speichern fehlgeschlagen');
    } finally {
      setQueryCredsSaving(false);
    }
  };

  const set = <K extends keyof AfkConfig>(key: K, value: AfkConfig[K]) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  const addUid = (uid: string) => {
    const trimmed = uid.trim();
    if (!trimmed || local.whitelist.includes(trimmed)) return;
    set('whitelist', [...local.whitelist, trimmed]);
    setNewUid('');
  };

  const removeUid = (uid: string) =>
    set('whitelist', local.whitelist.filter((u) => u !== uid));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(local);
      toast.success('AFK-Einstellungen gespeichert');
    } catch {
      toast.error('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  // Build sorted channel list for select
  const sortedChannels = [...channels].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <SectionCard title="AFK-Überwachung" icon={UserX}>
        <ToggleRow
          label="Aktiviert"
          description="Überwacht AFK-Status und Idle-Zeit aller Nutzer alle 60 Sekunden"
          checked={local.enabled}
          onChange={(v) => set('enabled', v)}
        />

        {local.enabled && (
          <>
            <div className="pt-1 border-t border-border/30 space-y-3">
              {/* AFK Channel */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">AFK-Kanal</label>
                <select
                  value={local.afkChannelId ?? ''}
                  onChange={(e) => set('afkChannelId', e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Kanal wählen —</option>
                  {sortedChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
                {channels.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Bot muss verbunden sein um Kanäle zu laden</p>
                )}
              </div>

              {/* Triggers */}
              <ToggleRow
                label="Sofort bei AFK-Status"
                description="Verschiebt Nutzer sobald sie den AFK-Button in TS6 drücken"
                checked={local.immediateOnAway}
                onChange={(v) => set('immediateOnAway', v)}
              />

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Idle-Zeit (Minuten, 0 = deaktiviert)</label>
                <Input
                  type="number"
                  min={0}
                  max={480}
                  value={local.idleMinutes}
                  onChange={(e) => set('idleMinutes', Math.max(0, Number(e.target.value)))}
                  className="h-8 w-32 text-sm"
                />
              </div>
            </div>

            {/* Notification */}
            <div className="pt-1 border-t border-border/30 space-y-3">
              <ToggleRow
                label="Nutzer benachrichtigen"
                description="Sendet eine private Nachricht vor dem Verschieben"
                checked={local.notifyUser}
                onChange={(v) => set('notifyUser', v)}
              />
              {local.notifyUser && (
                <Input
                  value={local.notifyMessage}
                  onChange={(e) => set('notifyMessage', e.target.value)}
                  placeholder="Nachrichtentext..."
                  className="h-8 text-sm"
                />
              )}
            </div>

            {/* Whitelist */}
            <div className="pt-1 border-t border-border/30 space-y-2">
              <p className="text-xs text-muted-foreground">Whitelist (UIDs die NICHT verschoben werden)</p>

              {local.whitelist.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {local.whitelist.map((uid) => (
                    <span key={uid} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs font-mono">
                      {uid}
                      <button onClick={() => removeUid(uid)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addUid(newUid)}
                  placeholder="UID eingeben..."
                  className="h-7 text-xs font-mono flex-1"
                />
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => addUid(newUid)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {ts3Clients.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Online-Nutzer:</p>
                  <div className="flex flex-wrap gap-1">
                    {ts3Clients.map((c) => (
                      <button
                        key={c.uid}
                        onClick={() => addUid(c.uid)}
                        disabled={local.whitelist.includes(c.uid)}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-accent/50 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                        title={c.uid}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* AFK error status */}
        {afkStatus.lastError && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-[11px] text-destructive">
            <WifiOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Letzter Fehler{afkStatus.failureCount >= 3 ? ' (zurückgestellt auf 10-Min-Intervall)' : ''}:{' '}
              {afkStatus.lastError}
            </span>
          </div>
        )}
        {local.enabled && !afkStatus.lastError && afkStatus.failureCount === 0 && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            <span>Query-Verbindung OK (letzter Poll erfolgreich)</span>
          </div>
        )}
      </SectionCard>

      {/* Query Credentials */}
      <SectionCard title="TS3-Query-Verbindung" icon={Wifi}>
        <p className="text-xs text-muted-foreground">
          Zugangsdaten für die direkte TS3-Query-Verbindung (benötigt um Nutzer zu verschieben).
          Host und Port werden aus den allgemeinen Einstellungen übernommen.
          Änderungen werden sofort ohne Neustart aktiv.
        </p>
        {queryCredsLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Query-Benutzername</label>
              <Input
                value={queryCreds.queryUser}
                onChange={(e) => setQueryCreds((p) => ({ ...p, queryUser: e.target.value }))}
                placeholder="serveradmin"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Query-Passwort</label>
              <Input
                type="password"
                value={queryCreds.queryPassword}
                onChange={(e) => setQueryCreds((p) => ({ ...p, queryPassword: e.target.value }))}
                placeholder="••••••••"
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={saveQueryCreds} disabled={queryCredsSaving} size="sm" variant="outline">
            {queryCredsSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Query-Zugangsdaten speichern
          </Button>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Speichern
        </Button>
      </div>
    </div>
  );
}

// ── Fun Mode Tab ──────────────────────────────────────────────────────────────

/** Minimum safe interval for TS3 bot nickname changes without risking a flood ban. */
const MIN_INTERVAL = 15;
const WARN_INTERVAL = 30;

function FunModeTab({ config, onSave }: { config: NameRotationConfig; onSave: (patch: Partial<NameRotationConfig>) => Promise<unknown> }) {
  const [local, setLocal] = useState<NameRotationConfig>(config);
  // Separate raw text so the user can type freely (comma, space, etc.)
  const [namesRaw, setNamesRaw] = useState(() => config.names.join(', '));
  const [status, setStatus] = useState<RotationStatus>({ running: false, currentName: null, nextName: null });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setLocal(config);
    setNamesRaw(config.names.join(', '));
  }, [config]);

  const fetchStatus = useCallback(() => {
    api.getAutomationStatus().then((r) => setStatus(r.nameRotation)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 5000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  /** Parse namesRaw into the names array (comma or newline separated) */
  const parsedNames = () => namesRaw.split(/[,\n]/).map((n) => n.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...local, names: parsedNames() });
      toast.success('Fun Mode gespeichert');
    } catch {
      toast.error('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (status.running) {
        const r = await api.stopNameRotation();
        setStatus(r.status);
        toast.success('Namens-Rotation gestoppt');
      } else {
        // Save with latest names first so the backend uses the current config
        await onSave({ ...local, names: parsedNames() });
        const r = await api.startNameRotation();
        setStatus(r.status);
        toast.success('Namens-Rotation gestartet');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setToggling(false);
    }
  };

  const intervalWarning =
    local.intervalSeconds < MIN_INTERVAL
      ? `Minimum ist ${MIN_INTERVAL} Sekunden (wird serverseitig erzwungen)`
      : local.intervalSeconds < WARN_INTERVAL
      ? `Unter ${WARN_INTERVAL}s kann bei manchen TS-Servern zu Flood-Schutz führen`
      : null;

  return (
    <div className="space-y-4">
      <SectionCard title="Namens-Rotation" icon={Zap}>
        {/* Status badge */}
        {status.running ? (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-primary">Aktiv</span>
              {status.currentName && (
                <span className="text-muted-foreground ml-2">
                  Aktuell: <span className="font-mono text-foreground">{status.currentName}</span>
                  {status.nextName && status.nextName !== status.currentName && (
                    <span className="ml-2">→ <span className="font-mono">{status.nextName}</span></span>
                  )}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2">
            <Square className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Gestoppt</span>
          </div>
        )}

        {/* Names */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Namen (kommagetrennt oder zeilenweise)
          </label>
          <textarea
            value={namesRaw}
            onChange={(e) => setNamesRaw(e.target.value)}
            placeholder="GeckoBot, MusicBot, DJ Gecko, ..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          {(() => { const n = parsedNames().length; return n > 0 ? (
            <p className="text-[11px] text-muted-foreground">{n} Name(n) konfiguriert</p>
          ) : null; })()}
        </div>

        {/* Interval */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Intervall (Sekunden)</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={MIN_INTERVAL}
              max={3600}
              value={local.intervalSeconds}
              onChange={(e) => setLocal((prev) => ({ ...prev, intervalSeconds: Math.max(1, Number(e.target.value)) }))}
              className="h-8 w-24 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              {local.intervalSeconds >= 60
                ? `≈ ${(local.intervalSeconds / 60).toFixed(1)} min`
                : `${local.intervalSeconds}s`}
            </span>
          </div>
          {intervalWarning && (
            <div className="flex items-start gap-1.5 text-[11px] text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{intervalWarning}</span>
            </div>
          )}
        </div>

        {/* Flood protection info */}
        <div className="flex items-start gap-2 bg-muted/40 rounded-md px-3 py-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            TS3/TS6-Server haben Flood-Schutz für Clientname-Änderungen. Minimum {MIN_INTERVAL}s wird serverseitig erzwungen.
            Empfohlen: ≥ {WARN_INTERVAL}s für stabilen Betrieb.
          </span>
        </div>
      </SectionCard>

      <div className="flex items-center gap-2 justify-end">
        <Button onClick={handleSave} disabled={saving || status.running} variant="outline" size="sm">
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Speichern
        </Button>
        <Button
          onClick={handleToggle}
          disabled={toggling || parsedNames().length === 0}
          size="sm"
          variant={status.running ? 'destructive' : 'default'}
        >
          {status.running
            ? <><Square className="h-3.5 w-3.5 mr-1.5" />Stoppen</>
            : <><Play className="h-3.5 w-3.5 mr-1.5" />Starten</>}
        </Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'afk' | 'fun';

export function Automations() {
  const [activeTab, setActiveTab] = useState<Tab>('afk');
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAutomationConfig()
      .then((r) => setConfig(r.config as AutomationConfig))
      .catch(() => toast.error('Konfiguration konnte nicht geladen werden'))
      .finally(() => setLoading(false));
  }, []);

  const saveAfk = async (patch: Partial<AfkConfig>) => {
    const r = await api.updateAutomationConfig({ afk: patch });
    setConfig((prev) => prev ? { ...prev, afk: { ...prev.afk, ...patch } } : prev);
    return r;
  };

  const saveNameRotation = async (patch: Partial<NameRotationConfig>) => {
    const r = await api.updateAutomationConfig({ nameRotation: patch });
    setConfig((prev) => prev ? { ...prev, nameRotation: { ...prev.nameRotation, ...patch } } : prev);
    return r;
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'afk',  label: 'AFK-Management', icon: Clock },
    { id: 'fun',  label: 'Fun Mode',        icon: Zap  },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      <div className="max-w-2xl w-full mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">Automations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Automatisierte Serveraktionen konfigurieren</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : config ? (
          <>
            {activeTab === 'afk' && (
              <AfkTab config={config.afk} onSave={saveAfk} />
            )}
            {activeTab === 'fun' && (
              <FunModeTab config={config.nameRotation} onSave={saveNameRotation} />
            )}
          </>
        ) : (
          <div className="text-sm text-destructive">Fehler beim Laden der Konfiguration</div>
        )}
      </div>
    </div>
  );
}
