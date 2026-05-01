import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Pause, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LogLevel = 'info' | 'warn' | 'error';
type LogSource = 'backend' | 'ts3audiobot' | 'frontend';

interface LogEntry {
  ts: number;
  level: LogLevel;
  source: string;
  message: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: 'text-muted-foreground',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const LEVEL_BADGE: Record<LogLevel, string> = {
  info: 'bg-blue-500/10 text-blue-400',
  warn: 'bg-yellow-500/10 text-yellow-400',
  error: 'bg-red-500/10 text-red-400',
};

function formatTs(ts: number) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour12: false });
}

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div className="flex items-start gap-2 px-3 py-0.5 hover:bg-accent/20 font-mono text-xs leading-5">
      <span className="text-muted-foreground/40 flex-shrink-0 w-16">{formatTs(entry.ts)}</span>
      <span className={`flex-shrink-0 w-10 text-center rounded px-1 text-[10px] font-semibold ${LEVEL_BADGE[entry.level] ?? 'bg-muted/20 text-muted-foreground'}`}>
        {entry.level.toUpperCase()}
      </span>
      <span className={`flex-1 break-all whitespace-pre-wrap ${LEVEL_COLOR[entry.level] ?? ''}`}>
        {entry.message}
      </span>
    </div>
  );
}

function useServerLogs(source: 'backend' | 'ts3audiobot', active: boolean) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!active) return;

    const token = localStorage.getItem('token') || '';
    const url = `${API_URL}/api/logs/stream?source=${source}&token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => { setConnected(true); setError(null); };

    es.onmessage = (e) => {
      try {
        const entry: LogEntry = JSON.parse(e.data);
        setLogs((prev) => {
          const next = [...prev, entry];
          return next.length > 2000 ? next.slice(-2000) : next;
        });
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setConnected(false);
      setError('Connection lost — retrying…');
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [source, active]);

  const clear = useCallback(() => setLogs([]), []);
  return { logs, connected, error, clear };
}

function useFrontendLogs(active: boolean) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const push = useCallback((level: LogLevel, args: unknown[]) => {
    const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    setLogs((prev) => {
      const next = [...prev, { ts: Date.now(), level, source: 'frontend', message }];
      return next.length > 2000 ? next.slice(-2000) : next;
    });
  }, []);

  useEffect(() => {
    if (!active) return;

    const origLog   = console.log.bind(console);
    const origWarn  = console.warn.bind(console);
    const origError = console.error.bind(console);

    console.log   = (...args) => { origLog(...args);   push('info',  args); };
    console.warn  = (...args) => { origWarn(...args);  push('warn',  args); };
    console.error = (...args) => { origError(...args); push('error', args); };

    return () => {
      console.log   = origLog;
      console.warn  = origWarn;
      console.error = origError;
    };
  }, [active, push]);

  const clear = useCallback(() => setLogs([]), []);
  return { logs, clear };
}

function LogPanel({
  logs,
  connected,
  error,
  onClear,
}: {
  logs: LogEntry[];
  connected?: boolean;
  error?: string | null;
  onClear: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [frozen, setFrozen] = useState<LogEntry[]>([]);

  // Freeze log display when paused
  useEffect(() => {
    if (!paused) setFrozen([]);
  }, [paused]);

  const displayed = paused ? frozen : filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  // Auto-scroll
  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [displayed.length, paused]);

  const handlePause = () => {
    if (!paused) setFrozen(filter === 'all' ? logs : logs.filter((l) => l.level === filter));
    setPaused((v) => !v);
  };

  const handleDownload = () => {
    const text = displayed.map((e) => `[${formatTs(e.ts)}] [${e.level.toUpperCase()}] ${e.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `logs-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 flex-shrink-0 bg-card/30">
        <div className="flex items-center gap-1">
          {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                filter === lvl ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent/40'
              }`}
            >
              {lvl === 'all' ? 'All' : lvl.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {connected !== undefined && (
          <span className={`text-[10px] font-mono flex items-center gap-1 ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            {connected ? 'live' : error ?? 'disconnected'}
          </span>
        )}
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handlePause} title={paused ? 'Resume' : 'Pause'}>
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleDownload} title="Download logs">
          <Download className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onClear} title="Clear">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto bg-black/30">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground/40 text-sm font-mono">
            No logs yet…
          </div>
        ) : (
          displayed.map((entry, i) => <LogLine key={i} entry={entry} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const TABS: { id: LogSource; label: string }[] = [
  { id: 'backend', label: 'Backend' },
  { id: 'ts3audiobot', label: 'TS3AudioBot' },
  { id: 'frontend', label: 'Frontend' },
];

export function Logs() {
  const [activeTab, setActiveTab] = useState<LogSource>('backend');

  const backend = useServerLogs('backend', activeTab === 'backend');
  const bot = useServerLogs('ts3audiobot', activeTab === 'ts3audiobot');
  const frontend = useFrontendLogs(activeTab === 'frontend');

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-3 flex items-center gap-4 flex-shrink-0 glass z-10">
        <div>
          <h1 className="text-lg font-semibold">Debug Logs</h1>
          <p className="text-xs text-muted-foreground">Echtzeit-Logs aller Komponenten</p>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 ml-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Log Panel */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'backend' && (
          <LogPanel logs={backend.logs} connected={backend.connected} error={backend.error} onClear={backend.clear} />
        )}
        {activeTab === 'ts3audiobot' && (
          <LogPanel logs={bot.logs} connected={bot.connected} error={bot.error} onClear={bot.clear} />
        )}
        {activeTab === 'frontend' && (
          <LogPanel logs={frontend.logs} onClear={frontend.clear} />
        )}
      </div>
    </div>
  );
}
