import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Power, PowerOff, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import type { BotInfo } from '@/hooks/useSocket';

interface BotManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botList: BotInfo[];
  selectedBotId: number;
}

export function BotManager({ open, onOpenChange, botList, selectedBotId }: BotManagerProps) {
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectBot = async (botId: number) => {
    try {
      await api.selectBot(botId);
      toast.success('Switched to bot');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to switch bot');
    }
  };

  const handleDisconnectBot = async (botId: number) => {
    try {
      await api.disconnectBotById(botId);
      toast.info('Bot disconnected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect bot');
    }
  };

  const handleCreateBot = async () => {
    setLoading(true);
    try {
      const result = await api.createBot(address || undefined, password || undefined);
      toast.success(`New bot created (ID: ${result.botId})`);
      setAddress('');
      setPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: BotInfo['status']) => {
    switch (status) {
      case 'connected': return 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]';
      case 'connecting': return 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]';
      case 'disconnected': return 'bg-red-500';
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[80vh] rounded-xl border border-border/50 bg-card shadow-2xl flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <Dialog.Title className="text-sm font-semibold">Bot Manager</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="px-4 pt-2 text-xs text-muted-foreground">
            Manage multiple bot instances. Select a bot to control it.
          </Dialog.Description>

          {/* Bot list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {botList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground/50">
                <Power className="h-8 w-8 mb-2" />
                <p className="text-sm">No bots available</p>
                <p className="text-xs mt-0.5">Connect a bot to get started</p>
              </div>
            ) : (
              botList.map((bot) => {
                const isSelected = bot.id === selectedBotId;
                return (
                  <div
                    key={bot.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/50 bg-secondary/20 hover:bg-secondary/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${statusColor(bot.status)}`} />

                      {/* Bot info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{bot.name}</p>
                          {isSelected && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {bot.server || 'No server'} &middot; ID {bot.id} &middot; {bot.status}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isSelected && bot.status === 'connected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleSelectBot(bot.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Select
                          </Button>
                        )}
                        {bot.status === 'connected' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDisconnectBot(bot.id)}
                          >
                            <PowerOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add bot section */}
          <div className="border-t border-border/50 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Connect New Bot</p>
            <div className="flex gap-2">
              <Input
                placeholder="Server address (optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-sm w-28"
              />
            </div>
            <Button
              className="w-full h-8 text-sm"
              onClick={handleCreateBot}
              disabled={loading}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {loading ? 'Connecting...' : 'Connect New Bot'}
            </Button>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Leave address empty to use the configured server from Settings
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
