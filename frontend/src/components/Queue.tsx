import { useRef, useCallback } from 'react';
import { Trash2, GripVertical, ListMusic, Play, X, Shuffle } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { formatDuration } from '@/lib/utils';

interface QueueItem {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  source: string;
  addedBy: string;
}

interface QueueProps {
  items: QueueItem[];
  onClose?: () => void;
}

export function Queue({ items, onClose }: QueueProps) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleRemove = async (id: string, title: string) => {
    try {
      await api.removeFromQueue(id);
      toast.info('Removed from queue', title);
    } catch {
      toast.error('Failed to remove');
    }
  };

  const handleClear = async () => {
    try {
      await api.clearQueue();
      toast.info('Queue cleared');
    } catch {
      toast.error('Failed to clear queue');
    }
  };

  const handlePlayQueue = async () => {
    try {
      await api.playQueue();
      toast.success('Playing queue');
    } catch {
      toast.error('Failed to play queue');
    }
  };

  const handleShuffle = async () => {
    try {
      await api.shuffleQueue();
      toast.info('Queue shuffled');
    } catch {
      toast.error('Failed to shuffle queue');
    }
  };

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      api.moveInQueue(dragItem.current, dragOverItem.current).catch(() => {
        toast.error('Failed to reorder');
      });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <ListMusic className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Queue</span>
          {items.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <>
              <Button variant="ghost" size="sm" className="text-xs h-7 text-primary hover:text-primary" onClick={handlePlayQueue}>
                <Play className="h-3 w-3 mr-1" />
                Play
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleShuffle} title="Shuffle queue">
                <Shuffle className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-destructive" onClick={handleClear}>
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50">
            <ListMusic className="h-8 w-8 mb-2" />
            <p className="text-sm">Queue is empty</p>
            <p className="text-xs mt-0.5">Search and add tracks to get started</p>
          </div>
        )}
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="flex items-center gap-2 px-2 py-2 hover:bg-accent/30 transition-colors group border-b border-border/20 last:border-0"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors" />
            <span className="text-[11px] text-muted-foreground/50 w-5 text-right font-mono">{index + 1}</span>
            <div className="w-9 h-9 rounded bg-secondary/50 flex-shrink-0 overflow-hidden">
              {item.thumbnail ? (
                <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground/50">
                  {index + 1}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{item.title}</p>
              <p className="text-[11px] text-muted-foreground/60 truncate">
                {item.artist ? `${item.artist} \u00b7 ` : ''}{formatDuration(item.duration)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(item.id, item.title)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
