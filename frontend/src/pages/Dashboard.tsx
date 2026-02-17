import { useSocket } from '@/hooks/useSocket';
import { NowPlaying } from '@/components/NowPlaying';
import { SearchBar } from '@/components/SearchBar';
import { Queue } from '@/components/Queue';
import { ChannelBrowser } from '@/components/ChannelBrowser';
import { BotManager } from '@/components/BotManager';
import { PlayerBar } from '@/components/PlayerBar';
import { Sidebar } from '@/components/Sidebar';
import { useState } from 'react';

export function Dashboard() {
  const { connected, playerStatus, botStatus, queue, channels, botList, selectedBotId } = useSocket();
  const [channelBrowserOpen, setChannelBrowserOpen] = useState(false);
  const [botManagerOpen, setBotManagerOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(true);

  return (
    <div className="h-screen flex flex-row bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        botConnected={botStatus.connected}
        botName={botStatus.botName}
        clientsInChannel={botStatus.clientsInChannel}
        onOpenChannelBrowser={() => setChannelBrowserOpen(true)}
        onOpenBotManager={() => setBotManagerOpen(true)}
        currentPage="dashboard"
      />

      {/* Right side: main content + player bar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Center Content: NowPlaying + Search */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <NowPlaying
                track={playerStatus.currentTrack}
                isPlaying={playerStatus.isPlaying}
                channelName={botStatus.channelName}
                botName={botStatus.botName}
              />
              <SearchBar />
            </div>
          </main>

          {/* Queue Panel (toggleable) */}
          {queueOpen && (
            <aside className="w-80 border-l border-border/50 flex-shrink-0 overflow-hidden flex flex-col queue-enter bg-card/30">
              <Queue items={queue} onClose={() => setQueueOpen(false)} />
            </aside>
          )}
        </div>

        {/* Fixed Bottom Player Bar */}
        <div className="flex-shrink-0 z-20">
          <PlayerBar
            isPlaying={playerStatus.isPlaying}
            position={playerStatus.position}
            duration={playerStatus.duration}
            volume={playerStatus.volume}
            track={playerStatus.currentTrack}
            queueCount={queue.length}
            queueOpen={queueOpen}
            onToggleQueue={() => setQueueOpen((v) => !v)}
          />
        </div>
      </div>

      {/* Dialogs */}
      <ChannelBrowser
        open={channelBrowserOpen}
        onOpenChange={setChannelBrowserOpen}
        channels={channels}
        currentChannelName={botStatus.channelName}
      />
      <BotManager
        open={botManagerOpen}
        onOpenChange={setBotManagerOpen}
        botList={botList}
        selectedBotId={selectedBotId}
      />
    </div>
  );
}
