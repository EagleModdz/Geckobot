import { useSocket } from '@/hooks/useSocket';
import { NowPlaying } from '@/components/NowPlaying';
import { MediaPlayer } from '@/components/MediaPlayer';
import { SearchBar } from '@/components/SearchBar';
import { Queue } from '@/components/Queue';
import { BotControl } from '@/components/BotControl';
import { ChannelBrowser } from '@/components/ChannelBrowser';
import { BotManager } from '@/components/BotManager';
import { Button } from '@/components/ui/button';
import { LogOut, Music, Wifi, WifiOff, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function Dashboard() {
  const { connected, playerStatus, botStatus, queue, channels, botList, selectedBotId } = useSocket();
  const navigate = useNavigate();
  const [channelBrowserOpen, setChannelBrowserOpen] = useState(false);
  const [botManagerOpen, setBotManagerOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-4 py-2 flex items-center justify-between glass sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">TS3 Music Bot</span>
          <div className="flex items-center gap-1 ml-3">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{user.username}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar - Bot Control */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border/50 overflow-y-auto">
          <BotControl
            connected={botStatus.connected}
            botName={botStatus.botName}
            channelName={botStatus.channelName}
            serverName={botStatus.serverName}
            clientsInChannel={botStatus.clientsInChannel}
            botCount={botList.length}
            onOpenChannelBrowser={() => setChannelBrowserOpen(true)}
            onOpenBotManager={() => setBotManagerOpen(true)}
          />
        </aside>

        {/* Center - Player */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Now Playing + Controls */}
          <div className="border-b border-border/50">
            <NowPlaying
              track={playerStatus.currentTrack}
              isPlaying={playerStatus.isPlaying}
              channelName={botStatus.channelName}
              botName={botStatus.botName}
            />
            <MediaPlayer
              isPlaying={playerStatus.isPlaying}
              position={playerStatus.position}
              duration={playerStatus.duration}
              volume={playerStatus.volume}
            />
          </div>

          {/* Search */}
          <div className="flex-1 overflow-hidden">
            <SearchBar />
          </div>
        </main>

        {/* Right panel - Queue */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/50 overflow-hidden flex flex-col">
          <Queue items={queue} />
        </aside>
      </div>

      {/* Channel Browser Dialog */}
      <ChannelBrowser
        open={channelBrowserOpen}
        onOpenChange={setChannelBrowserOpen}
        channels={channels}
        currentChannelName={botStatus.channelName}
      />

      {/* Bot Manager Dialog */}
      <BotManager
        open={botManagerOpen}
        onOpenChange={setBotManagerOpen}
        botList={botList}
        selectedBotId={selectedBotId}
      />
    </div>
  );
}
