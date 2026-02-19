import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Terminal, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// ── Category order & colors ──────────────────────────────────────────────────

const CATEGORY_ORDER = ['Playback', 'Queue', 'Bot', 'Voice', 'Info', 'Admin'];

const CATEGORY_STYLE: Record<string, string> = {
  Playback: 'bg-primary/10 text-primary border-primary/20',
  Queue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Bot:      'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Voice:    'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Info:     'bg-muted/60 text-muted-foreground border-border/50',
  Admin:    'bg-red-500/10 text-red-400 border-red-500/20',
};

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_STYLE[category] ?? 'bg-muted/60 text-muted-foreground border-border/50';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${cls}`}>
      {category}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function Commands() {
  const { commands } = useSocket();
  const [search, setSearch] = useState('');

  const filtered = search
    ? commands.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.command.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
        );
      })
    : commands;

  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof commands>>((acc, cat) => {
    const cmds = filtered.filter((c) => c.category === cat);
    if (cmds.length > 0) acc[cat] = cmds;
    return acc;
  }, {});
  filtered.forEach((c) => {
    if (!CATEGORY_ORDER.includes(c.category)) {
      if (!grouped[c.category]) grouped[c.category] = [];
      grouped[c.category].push(c);
    }
  });

  return (
    <div className="flex-1 overflow-auto p-6 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-0.5">
          <Terminal className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Commands</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          All available TS3AudioBot commands — use the Permissions tab to control who can use them.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-72">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search commands…"
          className="h-8 text-sm pl-8"
        />
      </div>

      {/* Command groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 gap-3 rounded-lg border border-border/50">
          <Terminal className="h-10 w-10 opacity-30" />
          <p className="text-sm">No commands found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
              {/* Category header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/20 border-b border-border/30">
                <CategoryBadge category={category} />
                <span className="text-sm font-medium flex-1">{category}</span>
                <span className="text-xs text-muted-foreground/40">{cmds.length} command{cmds.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Command rows */}
              <div className="divide-y divide-border/20">
                {cmds.map((cmd) => (
                  <div key={cmd.id} className="flex items-start gap-3 px-4 py-3">
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{cmd.label}</span>
                        <code className="text-[10px] font-mono text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded">
                          !{cmd.command}
                        </code>
                        <code className="text-[10px] font-mono text-muted-foreground/30 bg-muted/30 px-1.5 py-0.5 rounded">
                          cmd.{cmd.command.replace(/\s+/g, '.')}
                        </code>
                      </div>
                      {cmd.description && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{cmd.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-border/30 bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground/70">About permissions</p>
        <p>
          The right column shows the <code className="font-mono bg-muted px-1 rounded">cmd.*</code> right name used by TS3AudioBot.
          Add these to a permission group in the <strong>Permissions</strong> tab to allow specific users or server groups to use them in TeamSpeak chat.
        </p>
      </div>
    </div>
  );
}
