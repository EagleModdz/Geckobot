import { Play, Pause, SkipBack, SkipForward, Square, Volume2, VolumeX, Repeat, Repeat1, Shuffle, ListMusic, Music, Radio } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { formatDuration } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useState, useEffect, useRef } from 'react';

type RepeatMode = 'off' | 'one' | 'all';

interface PlayerBarProps {
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  track: {
    title: string;
    artist: string;
    thumbnail: string;
    source: string;
    isLive?: boolean;
  } | null;
  queueCount: number;
  queueOpen: boolean;
  onToggleQueue: () => void;
}

export function PlayerBar({ isPlaying, position, duration, volume, track, queueCount, queueOpen, onToggleQueue }: PlayerBarProps) {
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(50);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [shuffleOn, setShuffleOn] = useState(false);

  // Client-side position interpolation: tick every 500ms while playing
  const [interpolatedPos, setInterpolatedPos] = useState(position);
  const [seekingPos, setSeekingPos] = useState<number | null>(null);
  const lastServerPos = useRef(position);
  const lastServerTime = useRef(Date.now());

  // Live stream: duration is 0 while playing
  const isLive = track?.isLive === true || (isPlaying && duration === 0);

  // Sync when server sends a new position
  useEffect(() => {
    lastServerPos.current = position;
    lastServerTime.current = Date.now();
    setInterpolatedPos(position);
  }, [position]);

  // Tick forward while playing (pause ticking while user is dragging or stream is live)
  useEffect(() => {
    if (!isPlaying || !duration || isLive || seekingPos !== null) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastServerTime.current) / 1000;
      const newPos = Math.min(lastServerPos.current + elapsed, duration);
      setInterpolatedPos(newPos);
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, duration, isLive, seekingPos]);

  const displayPosition = seekingPos ?? (isPlaying ? interpolatedPos : position);
  const displayVolume = localVolume ?? volume;

  const handlePlayPause = async () => {
    try {
      if (isPlaying) await api.pause();
      else await api.play();
    } catch {
      toast.error('Playback failed');
    }
  };

  const handleStop = async () => {
    try {
      await api.stop();
      toast.info('Playback stopped');
    } catch {
      toast.error('Failed to stop');
    }
  };

  const handleSkip = async () => {
    try { await api.skip(); } catch { toast.error('Failed to skip'); }
  };

  const handlePrevious = async () => {
    try { await api.previous(); } catch { toast.error('No previous track'); }
  };

  const handleVolumeChange = (value: number[]) => {
    const v = value[0];
    setLocalVolume(v);
    setIsMuted(v === 0);
    api.setVolume(v);
  };

  const handleVolumeCommit = () => setLocalVolume(null);

  const handleMuteToggle = () => {
    if (isMuted) {
      api.setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(displayVolume);
      api.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSeekChange = (value: number[]) => setSeekingPos(value[0]);
  const handleSeekCommit = (value: number[]) => {
    const pos = value[0];
    setSeekingPos(null);
    lastServerPos.current = pos;
    lastServerTime.current = Date.now();
    setInterpolatedPos(pos);
    api.seek(pos);
  };

  const handleRepeatCycle = async () => {
    const next: RepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    try {
      await api.setRepeat(next);
      setRepeatMode(next);
      toast.info(`Repeat: ${next}`);
    } catch { toast.error('Failed to set repeat'); }
  };

  const handleShuffleToggle = async () => {
    const next = !shuffleOn;
    try {
      await api.setShuffle(next);
      setShuffleOn(next);
      toast.info(`Shuffle: ${next ? 'on' : 'off'}`);
    } catch { toast.error('Failed to set shuffle'); }
  };

  return (
    <div className="player-bar-glass border-t border-border/50 px-4 py-2 flex flex-col gap-1">
      {/* Progress bar / Live indicator */}
      <div className="flex items-center gap-2">
        {isLive ? (
          <>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 w-9 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
            <div className="flex-1 h-1 rounded-full bg-red-500/20 overflow-hidden">
              <div className="h-full bg-red-500/60 animate-pulse" style={{ width: '100%' }} />
            </div>
            <span className="text-[10px] text-muted-foreground w-9 tabular-nums">∞</span>
          </>
        ) : (
          <>
            <span className="text-[10px] text-muted-foreground w-9 text-right tabular-nums">{formatDuration(displayPosition)}</span>
            <Slider
              value={[displayPosition]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeekChange}
              onValueCommit={handleSeekCommit}
              className="cursor-pointer flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-9 tabular-nums">{formatDuration(duration)}</span>
          </>
        )}
      </div>

      {/* Main bar row */}
      <div className="flex items-center gap-3">
        {/* Left: Track info */}
        <div className="flex items-center gap-3 w-56 min-w-0 flex-shrink-0">
          <div className="w-11 h-11 rounded-md overflow-hidden bg-secondary/50 flex-shrink-0 relative">
            {track?.thumbnail ? (
              <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-5 h-5 text-muted-foreground/50" />
              </div>
            )}
            {isLive && (
              <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold bg-red-600 text-white leading-tight py-px">
                LIVE
              </span>
            )}
          </div>
          {track ? (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{track.title}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                {isLive && <Radio className="h-3 w-3 text-red-500 flex-shrink-0" />}
                {track.artist}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nothing playing</p>
          )}
        </div>

        {/* Center: Transport controls */}
        <div className="flex-1 flex items-center justify-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${shuffleOn ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={handleShuffleToggle}
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevious} disabled={isLive}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full shadow-md mx-1"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSkip}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={handleRepeatCycle}
          >
            {repeatMode === 'one' ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleStop}>
            <Square className="h-3 w-3" />
          </Button>
        </div>

        {/* Right: Volume + Queue toggle */}
        <div className="flex items-center gap-2 w-48 flex-shrink-0 justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMuteToggle}>
            {isMuted || displayVolume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : displayVolume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            onValueCommit={handleVolumeCommit}
            className="cursor-pointer w-24"
          />
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 relative ${queueOpen ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={onToggleQueue}
          >
            <ListMusic className="h-4 w-4" />
            {queueCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-medium">
                {queueCount > 9 ? '9+' : queueCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
