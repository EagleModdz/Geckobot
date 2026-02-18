import { useSocket } from '@/hooks/useSocket';
import { NowPlaying } from '@/components/NowPlaying';
import { SearchBar } from '@/components/SearchBar';
import { Queue } from '@/components/Queue';
import { PlayerBar } from '@/components/PlayerBar';
import { useState } from 'react';

export function Dashboard() {
  const { playerStatus, botStatus, queue } = useSocket();
  const [queueOpen, setQueueOpen] = useState(true);

  return (
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
  );
}
