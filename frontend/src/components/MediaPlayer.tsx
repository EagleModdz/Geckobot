import { Play, Pause, SkipBack, SkipForward, Square, Volume2, VolumeX, Repeat, Repeat1, Shuffle } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { formatDuration } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useState } from 'react';

interface MediaPlayerProps {
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
}

type RepeatMode = 'off' | 'one' | 'all';

export function MediaPlayer({ isPlaying, position, duration, volume }: MediaPlayerProps) {
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(50);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [shuffleOn, setShuffleOn] = useState(false);

  const displayVolume = localVolume ?? volume;

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await api.pause();
      } else {
        await api.play();
      }
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
    try {
      await api.skip();
    } catch {
      toast.error('Failed to skip');
    }
  };

  const handlePrevious = async () => {
    try {
      await api.previous();
    } catch {
      toast.error('No previous track');
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const v = value[0];
    setLocalVolume(v);
    setIsMuted(v === 0);
    api.setVolume(v);
  };

  const handleVolumeCommit = () => {
    setLocalVolume(null);
  };

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

  const handleSeek = (value: number[]) => {
    api.seek(value[0]);
  };

  const handleRepeatCycle = async () => {
    const next: RepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    try {
      await api.setRepeat(next);
      setRepeatMode(next);
      toast.info(`Repeat: ${next}`);
    } catch {
      toast.error('Failed to set repeat');
    }
  };

  const handleShuffleToggle = async () => {
    const next = !shuffleOn;
    try {
      await api.setShuffle(next);
      setShuffleOn(next);
      toast.info(`Shuffle: ${next ? 'on' : 'off'}`);
    } catch {
      toast.error('Failed to set shuffle');
    }
  };

  return (
    <div className="space-y-3 px-4 pb-4 pt-1">
      {/* Progress bar */}
      <div className="space-y-1">
        <Slider
          value={[position]}
          max={duration || 100}
          step={1}
          onValueCommit={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground/70">
          <span>{formatDuration(position)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {/* Shuffle */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${shuffleOn ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={handleShuffleToggle}
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handlePrevious}>
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause - larger */}
          <Button
            variant="default"
            size="icon"
            className="h-11 w-11 rounded-full shadow-md"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSkip}>
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Repeat */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={handleRepeatCycle}
          >
            {repeatMode === 'one' ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleStop}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-36">
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
            className="cursor-pointer"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{isMuted ? 0 : displayVolume}%</span>
        </div>
      </div>
    </div>
  );
}
