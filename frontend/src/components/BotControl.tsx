import { useState, useRef, useEffect } from 'react';
import { Wifi, WifiOff, Edit2, Check, X, Users, Hash, FolderTree, Bot, ImageIcon, Loader2, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AvatarEditor } from './AvatarEditor';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';

interface BotControlProps {
  connected: boolean;
  botName: string;
  channelName: string;
  serverName: string;
  clientsInChannel: { id: number; name: string }[];
  botCount: number;
  onOpenChannelBrowser?: () => void;
  onOpenBotManager?: () => void;
}

export function BotControl({
  connected,
  botName,
  channelName,
  serverName,
  clientsInChannel,
  botCount,
  onOpenChannelBrowser,
  onOpenBotManager,
}: BotControlProps) {
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(botName);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarEditFile, setAvatarEditFile] = useState<File | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleConnect = async () => {
    try {
      if (connected) {
        await api.botDisconnect();
        toast.info('Bot disconnected');
      } else {
        await api.botConnect();
        toast.success('Bot connected');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleSaveName = async () => {
    if (newName.trim()) {
      try {
        await api.setBotName(newName.trim());
        toast.success('Bot name updated');
      } catch {
        toast.error('Failed to rename bot');
      }
    }
    setEditingName(false);
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarEditFile(file);
    e.target.value = '';
  };

  const handleAvatarCropped = async (blob: Blob) => {
    setAvatarEditFile(null);
    setAvatarUploading(true);
    try {
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      await api.uploadBotAvatar(file);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleClearAvatar = async () => {
    try {
      await api.clearBotAvatar();
      toast.success('Avatar cleared');
    } catch {
      toast.error('Failed to clear avatar');
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Compact trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
        <span className="text-sm text-muted-foreground truncate max-w-32">{botName}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 rounded-lg border border-border bg-card shadow-xl z-50 p-3 space-y-3">
          {/* Connection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <Button
              variant={connected ? 'outline' : 'default'}
              size="sm"
              className="h-7 text-xs"
              onClick={handleConnect}
            >
              {connected ? (
                <><WifiOff className="h-3 w-3 mr-1" /> Disconnect</>
              ) : (
                <><Wifi className="h-3 w-3 mr-1" /> Connect</>
              )}
            </Button>
          </div>

          {/* Manage Bots */}
          {onOpenBotManager && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => { onOpenBotManager(); setOpen(false); }}
            >
              <Bot className="h-3 w-3 mr-1.5" />
              Manage Bots{botCount > 0 ? ` (${botCount})` : ''}
            </Button>
          )}

          {connected && (
            <>
              {/* Server/Channel info */}
              <div className="rounded-md bg-secondary/30 p-2.5 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground/60 uppercase tracking-wider text-[9px] font-medium">Server</span>
                  <p className="text-sm">{serverName || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground/60 uppercase tracking-wider text-[9px] font-medium">Bot Name</span>
                  {editingName ? (
                    <div className="flex gap-1 mt-0.5">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-6 text-xs"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleSaveName}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setEditingName(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <p className="text-sm">{botName}</p>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setNewName(botName); setEditingName(true); }}>
                        <Edit2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground/60 uppercase tracking-wider text-[9px] font-medium">Channel</span>
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm">{channelName || 'None'}</p>
                    </div>
                  </div>
                  {onOpenChannelBrowser && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => { onOpenChannelBrowser(); setOpen(false); }}>
                      <FolderTree className="h-3 w-3 mr-1" />
                      Browse
                    </Button>
                  )}
                </div>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-6 text-xs relative" disabled={avatarUploading}>
                  {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                  Avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleAvatarFileSelect}
                    disabled={avatarUploading}
                  />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleClearAvatar}>
                  Clear
                </Button>
              </div>

              {/* Listeners */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Listeners ({clientsInChannel.length})</span>
                </div>
                {clientsInChannel.length > 0 ? (
                  <div className="space-y-0.5 pl-1 max-h-24 overflow-y-auto">
                    {clientsInChannel.map((client) => (
                      <div key={client.id} className="flex items-center gap-2 py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                        <span className="text-xs text-muted-foreground">{client.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50 pl-4">No other users</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {avatarEditFile && (
        <AvatarEditor
          file={avatarEditFile}
          onConfirm={handleAvatarCropped}
          onCancel={() => setAvatarEditFile(null)}
        />
      )}
    </div>
  );
}
