import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/lib/api';
import type { PermissionGroup, PermissionMember } from '@/lib/api';
import {
  Shield,
  Plus,
  Trash2,
  Users,
  Hash,
  UserCircle,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Terminal,
  Info,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Preset group colors ──────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ background: c }}
          className={`w-5 h-5 rounded-full flex-shrink-0 transition-transform
            ${value === c ? 'ring-2 ring-white ring-offset-1 ring-offset-background scale-110' : 'hover:scale-110'}`}
        />
      ))}
    </div>
  );
}

// ── Member chip ──────────────────────────────────────────────────────────────

function MemberChip({
  member,
  onRemove,
}: {
  member: PermissionMember;
  onRemove: () => void;
}) {
  const isUid = member.type === 'uid';
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/40 text-xs">
      {isUid ? (
        <UserCircle className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
      ) : (
        <Hash className="h-3.5 w-3.5 text-amber-400/70 flex-shrink-0" />
      )}
      <span className="font-medium">{member.displayName || member.value}</span>
      {member.displayName && (
        <span className="text-muted-foreground/50 font-mono text-[10px]">({member.value})</span>
      )}
      <button
        onClick={onRemove}
        className="text-muted-foreground/40 hover:text-destructive transition-colors ml-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ── Add-member form ──────────────────────────────────────────────────────────

function AddMemberForm({ onAdd }: { onAdd: (type: 'uid' | 'groupid', value: string, displayName: string) => Promise<void> }) {
  const [type, setType] = useState<'uid' | 'groupid'>('uid');
  const [value, setValue] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  // TS3 live client picker
  const [ts3Clients, setTs3Clients] = useState<{ id: number; name: string; uid: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await api.getTs3Clients();
      setTs3Clients(res.clients);
      setPickerOpen(true);
    } finally {
      setLoadingClients(false);
    }
  };

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const selectClient = (client: { name: string; uid: string }) => {
    setValue(client.uid);
    setDisplayName(client.name);
    setPickerOpen(false);
  };

  const handleAdd = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onAdd(type, value.trim(), displayName.trim());
      setValue('');
      setDisplayName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Type toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-md border border-border/50 overflow-hidden text-xs flex-shrink-0">
          <button
            onClick={() => setType('uid')}
            className={`px-2.5 py-1.5 flex items-center gap-1 transition-colors
              ${type === 'uid' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent/30'}`}
          >
            <UserCircle className="h-3.5 w-3.5" />UID
          </button>
          <button
            onClick={() => setType('groupid')}
            className={`px-2.5 py-1.5 flex items-center gap-1 transition-colors
              ${type === 'groupid' ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-muted-foreground hover:bg-accent/30'}`}
          >
            <Hash className="h-3.5 w-3.5" />Group ID
          </button>
        </div>

        {type === 'uid' && (
          <div className="relative" ref={pickerRef}>
            <button
              onClick={fetchClients}
              disabled={loadingClients}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-border/40 transition-colors"
              title="Pick from online TS3 users"
            >
              {loadingClients
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <Users className="h-3 w-3" />}
              Pick user
            </button>

            {pickerOpen && ts3Clients.length > 0 && (
              <div className="absolute left-0 top-full mt-1 z-30 w-72 rounded-lg border border-border/60 bg-card shadow-lg overflow-hidden">
                <div className="px-3 py-2 text-[10px] text-muted-foreground/60 border-b border-border/30 font-medium uppercase tracking-wide">
                  Online users
                </div>
                {ts3Clients.map((c) => (
                  <button
                    key={c.uid}
                    onClick={() => selectClient(c)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/40 transition-colors text-left"
                  >
                    <UserCircle className="h-4 w-4 text-primary/60 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground/50 truncate">{c.uid}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={type === 'uid' ? 'TS3 unique identifier' : 'Server group ID (number)'}
          className="h-8 text-sm font-mono flex-1 min-w-40"
        />
        {type === 'uid' && (
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Display name (optional)"
            className="h-8 text-sm w-40"
          />
        )}
        <Button size="sm" onClick={handleAdd} disabled={saving || !value.trim()} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" />Add
        </Button>
      </div>
    </div>
  );
}

// ── Command grant picker ─────────────────────────────────────────────────────

function CommandGrantPicker({
  allCommands,
  grantedCommands,
  onGrant,
  onRevoke,
}: {
  allCommands: { command: string; label: string; category: string }[];
  grantedCommands: string[];
  onGrant: (command: string) => Promise<void>;
  onRevoke: (command: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const grantedSet = new Set(grantedCommands);
  const filtered = allCommands.filter(
    (c) =>
      !grantedSet.has(c.command) &&
      (c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.command.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-2">
      {/* Granted commands as chips */}
      <div className="flex flex-wrap gap-1.5">
        {grantedCommands.map((cmd) => {
          const info = allCommands.find((c) => c.command === cmd);
          return (
            <span
              key={cmd}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs"
            >
              <Terminal className="h-3 w-3 text-primary/70 flex-shrink-0" />
              <span className="text-primary font-medium">{info?.label ?? cmd}</span>
              <code className="text-primary/50 font-mono text-[10px]">{cmd}</code>
              <button
                onClick={() => onRevoke(cmd)}
                className="text-primary/30 hover:text-destructive transition-colors ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        {grantedCommands.length === 0 && (
          <span className="text-xs text-muted-foreground/50 italic">No commands granted yet.</span>
        )}
      </div>

      {/* Add command dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add command
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 z-20 w-80 rounded-lg border border-border/60 bg-card shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border/30">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commands…"
                className="h-7 text-xs"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground/50 text-center">
                  {allCommands.length === 0 ? 'Loading commands…' : 'All commands already granted.'}
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.command}
                    onClick={async () => { await onGrant(c.command); setSearch(''); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/40 text-left transition-colors"
                  >
                    <span className="text-sm font-medium flex-1">{c.label}</span>
                    <code className="text-[10px] font-mono text-muted-foreground/60">{c.command}</code>
                    <span className="text-[10px] text-muted-foreground/40">{c.category}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  allCommands,
  onUpdated,
  onDeleted,
  onApplyResult,
}: {
  group: PermissionGroup;
  allCommands: { command: string; label: string; category: string }[];
  onUpdated: (g: PermissionGroup) => void;
  onDeleted: (id: string) => void;
  onApplyResult: (r: { ok: boolean; error?: string }) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);
  const [colorInput, setColorInput] = useState(group.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRename = async () => {
    if (!nameInput.trim()) return;
    const res = await api.updatePermissionGroup(group.id, nameInput.trim(), colorInput);
    onUpdated(res.group);
    onApplyResult(res.apply);
    setEditingName(false);
  };

  const handleAddMember = async (type: 'uid' | 'groupid', value: string, displayName: string) => {
    const res = await api.addPermissionMember(group.id, type, value, displayName || undefined);
    onUpdated(res.group);
    onApplyResult(res.apply);
  };

  const handleRemoveMember = async (member: PermissionMember) => {
    const res = await api.removePermissionMember(group.id, member.type, member.value);
    onUpdated(res.group);
    onApplyResult(res.apply);
  };

  const handleGrant = async (command: string) => {
    const res = await api.grantPermissionCommand(group.id, command);
    onUpdated(res.group);
    onApplyResult(res.apply);
  };

  const handleGrantAll = async () => {
    const res = await api.grantAllPermissionCommands(group.id);
    onUpdated(res.group);
    onApplyResult(res.apply);
  };

  const handleRevoke = async (command: string) => {
    const res = await api.revokePermissionCommand(group.id, command);
    onUpdated(res.group);
    onApplyResult(res.apply);
  };

  const handleDelete = async () => {
    const res = await api.deletePermissionGroup(group.id);
    onApplyResult(res.apply);
    onDeleted(group.id);
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 overflow-visible">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: group.color, boxShadow: `0 0 6px ${group.color}60` }}
        />

        {/* Name / edit */}
        {editingName ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
              className="h-7 text-sm flex-1 min-w-0"
              autoFocus
            />
            <ColorPicker value={colorInput} onChange={setColorInput} />
            <button onClick={handleRename} className="text-primary hover:text-primary/80 transition-colors">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditingName(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium text-sm">{group.name}</span>
            <span className="text-xs text-muted-foreground/50">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''} · {group.grants.length} command{group.grants.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {!editingName && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditingName(true)}
              className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground/40 hover:text-foreground transition-colors"
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-xs rounded hover:bg-accent/50 text-muted-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground/40 hover:text-destructive transition-colors"
                title="Delete group"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-border/30 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/30">
          {/* Members */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Members</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.members.map((m) => (
                <MemberChip
                  key={`${m.type}:${m.value}`}
                  member={m}
                  onRemove={() => handleRemoveMember(m)}
                />
              ))}
            </div>
            <AddMemberForm onAdd={handleAddMember} />
            <p className="text-[10px] text-muted-foreground/40 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              UID: find in TS3 via Extras → Identity. Group ID: numeric server group ID.
            </p>
          </div>

          {/* Commands */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide flex-1">Allowed Commands</span>
              <button
                onClick={handleGrantAll}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-border/40 transition-colors"
                title="Grant all commands to this group"
              >
                <Check className="h-3 w-3" />
                Grant all
              </button>
            </div>
            <CommandGrantPicker
              allCommands={allCommands}
              grantedCommands={group.grants}
              onGrant={handleGrant}
              onRevoke={handleRevoke}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create group form ─────────────────────────────────────────────────────────

function CreateGroupForm({ onCreate }: { onCreate: (g: PermissionGroup, apply: { ok: boolean; error?: string }) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.createPermissionGroup(name.trim(), color);
      onCreate(res.group, res.apply);
      setName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        placeholder="Group name…"
        className="h-8 text-sm w-52"
        autoFocus
      />
      <ColorPicker value={color} onChange={setColor} />
      <Button size="sm" onClick={handleCreate} disabled={saving || !name.trim()} className="h-8">
        {saving ? 'Creating…' : <><Check className="h-3.5 w-3.5 mr-1" />Create</>}
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Permissions() {
  const { permissionGroups: socketGroups, commands } = useSocket();
  const [groups, setGroups] = useState<PermissionGroup[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Use socket state as source of truth; fall back to local override while editing
  const displayGroups = groups ?? socketGroups;

  const allCommandOptions = commands.map((c) => ({
    command: c.command,
    label: c.label,
    category: c.category,
  }));

  const handleApplyResult = (result: { ok: boolean; error?: string }) => {
    if (!result.ok) {
      setApplyError(result.error ?? 'Unknown error applying rights');
    } else {
      setApplyError(null);
    }
  };

  const handleCreated = (g: PermissionGroup, apply: { ok: boolean; error?: string }) => {
    setGroups([...(groups ?? socketGroups), g]);
    handleApplyResult(apply);
    setCreating(false);
  };

  const handleUpdated = (updated: PermissionGroup) => {
    setGroups(displayGroups.map((g) => (g.id === updated.id ? updated : g)));
  };

  const handleDeleted = (id: string) => {
    setGroups(displayGroups.filter((g) => g.id !== id));
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Permissions</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Define who can use which commands. Changes are applied to TS3AudioBot immediately — no restart required.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          {creating ? <><X className="h-4 w-4 mr-1.5" />Cancel</> : <><Plus className="h-4 w-4 mr-1.5" />New Group</>}
        </Button>
      </div>

      {/* Apply error banner */}
      {applyError && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Rights not applied to TS3AudioBot</p>
            <p className="text-amber-400/70 text-xs mt-0.5">{applyError}</p>
          </div>
          <button
            onClick={() => setApplyError(null)}
            className="text-amber-400/50 hover:text-amber-400 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="rounded-lg border border-border/50 bg-card/50 p-4">
          <p className="text-sm font-medium mb-3">New Permission Group</p>
          <CreateGroupForm onCreate={handleCreated} />
        </div>
      )}

      {/* Groups */}
      {displayGroups.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50 gap-3 rounded-lg border border-border/40 border-dashed">
          <Shield className="h-10 w-10 opacity-30" />
          <p className="text-sm">No permission groups yet.</p>
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Create first group
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayGroups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              allCommands={allCommandOptions}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onApplyResult={handleApplyResult}
            />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg border border-border/30 bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground/70">How permissions work</p>
        <p>
          Each group defines a set of <strong>members</strong> (by TS3 UID or server group ID)
          and the <strong>commands</strong> those members are allowed to use in TeamSpeak chat.
          After every change, the backend regenerates <code className="font-mono bg-muted px-1 rounded">rights.toml</code> and
          calls <code className="font-mono bg-muted px-1 rounded">rights reload</code> on TS3AudioBot — no restart needed.
        </p>
        <p>
          <strong>UID</strong>: find yours in TeamSpeak via <em>Extras → Identity → Show Identity</em> or ask an admin to check the server log.
          {' '}<strong>Group ID</strong>: the numeric ID of a TS3 server group (visible in the TS3 server admin panel).
        </p>
        <p className="text-muted-foreground/60">
          The backend must have the <code className="font-mono bg-muted px-1 rounded">Rights File Path</code> configured in Settings → TS3AudioBot for changes to take effect on disk.
        </p>
      </div>
    </div>
  );
}
