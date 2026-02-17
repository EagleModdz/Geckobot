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
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-32 h-32 rounded-2xl bg-secondary/30 flex items-center justify-center mb-4">
          <Music className="w-12 h-12 text-muted-foreground/30" />
        </div>
        <p className="text-muted-foreground text-sm">Nothing playing</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Search for a song to get started</p>
        {channelName && (
          <div className="flex items-center gap-1 mt-3">
            <Radio className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[11px] text-muted-foreground/40">{botName || 'Bot'} in {channelName}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Blurred background from album art */}
      {track.thumbnail && (
        <div className="absolute inset-0 z-0">
          <img
            src={track.thumbnail}
            alt=""
            className="w-full h-full object-cover scale-110 blur-[60px] opacity-30"
          />
          <div className="absolute inset-0 bg-background/60" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center py-10 px-4">
        {/* Large album art */}
        <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-secondary/50 shadow-2xl shadow-black/30 mb-5">
          {track.thumbnail ? (
            <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute bottom-2 right-2 flex items-end gap-[2px]">
              <div className="w-[3px] h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-[3px] h-4 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-[3px] h-2.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          )}
        </div>

        {/* Track info */}
        <h2 className="text-lg font-semibold text-center truncate max-w-full">{track.title}</h2>
        {track.artist && <p className="text-sm text-muted-foreground mt-0.5">{track.artist}</p>}

        <div className="flex items-center gap-2 mt-2">
          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-secondary/70 text-muted-foreground uppercase tracking-wider font-medium">
            {track.source}
          </span>
          {channelName && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <Radio className="h-2.5 w-2.5" />
              {channelName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
