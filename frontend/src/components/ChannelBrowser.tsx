import * as Dialog from '@radix-ui/react-dialog';
import { Hash, Users, Lock, X, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { api, Channel } from '@/lib/api';
import { toast } from '@/hooks/useToast';

interface ChannelBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: Channel[];
  currentChannelName: string;
}

export function ChannelBrowser({ open, onOpenChange, channels, currentChannelName }: ChannelBrowserProps) {
  // Build tree structure from flat channel list
  const rootChannels = channels.filter((ch) => ch.parentId === 0);
  const childMap = new Map<number, Channel[]>();
  for (const ch of channels) {
    if (ch.parentId !== 0) {
      const siblings = childMap.get(ch.parentId) || [];
      siblings.push(ch);
      childMap.set(ch.parentId, siblings);
    }
  }

  const handleMoveToChannel = async (channel: Channel) => {
    try {
      await api.setBotChannel(channel.id);
      toast.success('Moved to channel', channel.name);
      onOpenChange(false);
    } catch {
      toast.error('Failed to move', channel.name);
    }
  };

  const renderChannel = (channel: Channel, depth: number = 0) => {
    const isCurrent = channel.name === currentChannelName;
    const children = childMap.get(channel.id) || [];

    return (
      <div key={channel.id}>
        <button
          onClick={() => handleMoveToChannel(channel)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors rounded-md ${
            isCurrent
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent/50 text-foreground'
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <Hash className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
          <span className="text-sm flex-1 truncate">{channel.name}</span>
          {channel.hasPassword && <Lock className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />}
          {channel.clients.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {channel.clients.length}
            </span>
          )}
          {isCurrent && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              Current
            </span>
          )}
          {!isCurrent && (
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
          )}
        </button>

        {/* Show clients in this channel */}
        {channel.clients.length > 0 && (
          <div className="ml-2" style={{ paddingLeft: `${24 + depth * 20}px` }}>
            {channel.clients.map((client) => (
              <div key={client.id} className="flex items-center gap-2 py-0.5 px-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                <span className="text-xs text-muted-foreground">{client.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Render children */}
        {children.map((child) => renderChannel(child, depth + 1))}
      </div>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[80vh] rounded-xl border border-border/50 bg-card shadow-2xl flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <Dialog.Title className="text-sm font-semibold">Channel Browser</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="px-4 pt-2 text-xs text-muted-foreground">
            Click a channel to move the bot there.
          </Dialog.Description>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50">
                <Hash className="h-8 w-8 mb-2" />
                <p className="text-sm">No channels available</p>
                <p className="text-xs mt-0.5">Connect the bot first</p>
              </div>
            ) : (
              rootChannels.map((ch) => renderChannel(ch))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
