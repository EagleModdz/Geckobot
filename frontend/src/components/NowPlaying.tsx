import { Music, Radio } from 'lucide-react';

interface NowPlayingProps {
  track: {
    title: string;
    artist: string;
    thumbnail: string;
    source: string;
  } | null;
  isPlaying: boolean;
  channelName?: string;
  botName?: string;
}

export function NowPlaying({ track, isPlaying, channelName, botName }: NowPlayingProps) {
  if (!track) {
    return (
      <div className="flex items-center gap-4 p-4">
        <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center">
          <Music className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Nothing playing</p>
          <p className="text-xs text-muted-foreground/70">Search for a song to get started</p>
          {channelName && (
            <div className="flex items-center gap-1 mt-1.5">
              <Radio className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/50">{botName || 'Bot'} in {channelName}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-secondary/50 flex-shrink-0 shadow-md">
        {track.thumbnail ? (
          <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/10 flex items-end justify-end p-1.5">
            <div className="flex items-end gap-[2px]">
              <div className="w-[3px] h-2 bg-green-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-[3px] h-3 bg-green-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-[3px] h-2 bg-green-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{track.title}</p>
        {track.artist && <p className="text-xs text-muted-foreground truncate">{track.artist}</p>}
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-secondary/70 text-muted-foreground uppercase tracking-wider">
            {track.source}
          </span>
          {channelName && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Radio className="h-2.5 w-2.5" />
              {channelName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
