import { QueueItem, Track } from '../types';
import { v4 as uuid } from 'uuid';
import { ts3audiobot } from './ts3audiobot';
import { EventEmitter } from 'events';

interface QueueData {
  queue: QueueItem[];
  currentIndex: number;
  isPlaying: boolean;
}

class QueueService extends EventEmitter {
  private queues = new Map<number, QueueData>();
  private lastPlayNextTime = 0;

  private getQueueData(botId?: number): QueueData {
    const id = botId ?? ts3audiobot.getSelectedBotId();
    let data = this.queues.get(id);
    if (!data) {
      data = { queue: [], currentIndex: -1, isPlaying: false };
      this.queues.set(id, data);
    }
    return data;
  }

  getQueue(botId?: number): QueueItem[] {
    return [...this.getQueueData(botId).queue];
  }

  getCurrentTrack(botId?: number): QueueItem | null {
    const data = this.getQueueData(botId);
    if (data.currentIndex >= 0 && data.currentIndex < data.queue.length) {
      return data.queue[data.currentIndex];
    }
    return null;
  }

  /** Returns true when the queue service is actively driving playback (not direct play) */
  isQueueDriving(botId?: number): boolean {
    const data = this.getQueueData(botId);
    return data.isPlaying && data.currentIndex >= 0;
  }

  /** Timestamp of last playNext() call — used to debounce song-end detection */
  getLastPlayTime(): number {
    return this.lastPlayNextTime;
  }

  async addTrack(track: Track, addedBy: string = 'Web', botId?: number, autoPlay: boolean = true): Promise<QueueItem> {
    const data = this.getQueueData(botId);
    const item: QueueItem = {
      ...track,
      id: uuid(),
      addedBy,
      addedAt: Date.now(),
    };
    data.queue.push(item);
    const resolvedBotId = botId ?? ts3audiobot.getSelectedBotId();
    this.emit('queue:updated', { botId: resolvedBotId, queue: data.queue });

    // If nothing is playing and autoPlay is enabled, start playing this track
    if (autoPlay && !data.isPlaying) {
      await this.playNext(botId);
    }

    return item;
  }

  async playQueue(botId?: number): Promise<boolean> {
    const data = this.getQueueData(botId);
    if (data.queue.length === 0) return false;
    // Start from the beginning
    data.currentIndex = -1;
    data.isPlaying = false;
    return this.playNext(botId);
  }

  async removeTrack(id: string, botId?: number): Promise<boolean> {
    const data = this.getQueueData(botId);
    const index = data.queue.findIndex((item) => item.id === id);
    if (index === -1) return false;

    data.queue.splice(index, 1);

    // Adjust currentIndex if needed
    if (index < data.currentIndex) {
      data.currentIndex--;
    } else if (index === data.currentIndex) {
      // Currently playing track was removed, play next
      data.currentIndex--;
      await this.playNext(botId);
    }

    const resolvedBotId = botId ?? ts3audiobot.getSelectedBotId();
    this.emit('queue:updated', { botId: resolvedBotId, queue: data.queue });
    return true;
  }

  moveTrack(fromIndex: number, toIndex: number, botId?: number): boolean {
    const data = this.getQueueData(botId);
    if (
      fromIndex < 0 || fromIndex >= data.queue.length ||
      toIndex < 0 || toIndex >= data.queue.length
    ) {
      return false;
    }

    const [item] = data.queue.splice(fromIndex, 1);
    data.queue.splice(toIndex, 0, item);

    // Adjust currentIndex
    if (data.currentIndex === fromIndex) {
      data.currentIndex = toIndex;
    } else if (fromIndex < data.currentIndex && toIndex >= data.currentIndex) {
      data.currentIndex--;
    } else if (fromIndex > data.currentIndex && toIndex <= data.currentIndex) {
      data.currentIndex++;
    }

    const resolvedBotId = botId ?? ts3audiobot.getSelectedBotId();
    this.emit('queue:updated', { botId: resolvedBotId, queue: data.queue });
    return true;
  }

  /** Fisher-Yates shuffle of the remaining (not-yet-played) queue tracks */
  shuffleQueue(botId?: number): boolean {
    const data = this.getQueueData(botId);
    if (data.queue.length <= 1) return false;

    // Keep already-played tracks in place; shuffle only the upcoming ones
    const startIdx = data.currentIndex + 1;
    const upcoming = data.queue.slice(startIdx);

    for (let i = upcoming.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
    }

    data.queue.splice(startIdx, upcoming.length, ...upcoming);

    const resolvedBotId = botId ?? ts3audiobot.getSelectedBotId();
    this.emit('queue:updated', { botId: resolvedBotId, queue: data.queue });
    return true;
  }

  async playNext(botId?: number): Promise<boolean> {
    const data = this.getQueueData(botId);
    data.currentIndex++;
    if (data.currentIndex >= data.queue.length) {
      data.currentIndex = -1;
      data.isPlaying = false;
      this.emit('queue:ended');
      return false;
    }

    const track = data.queue[data.currentIndex];

    // Clear any stale direct-play metadata so queue track metadata takes over
    ts3audiobot.setDirectPlayMeta(null);

    this.lastPlayNextTime = Date.now();
    const result = await ts3audiobot.play(track.url);
    data.isPlaying = result.ok;
    if (result.ok) {
      this.emit('track:started', track);
    }
    return result.ok;
  }

  async playPrevious(botId?: number): Promise<boolean> {
    const data = this.getQueueData(botId);
    if (data.currentIndex <= 0) return false;
    data.currentIndex -= 2; // playNext will increment
    return this.playNext(botId);
  }

  async skip(botId?: number): Promise<boolean> {
    return this.playNext(botId);
  }

  clear(botId?: number): void {
    const data = this.getQueueData(botId);
    data.queue = [];
    data.currentIndex = -1;
    data.isPlaying = false;
    const resolvedBotId = botId ?? ts3audiobot.getSelectedBotId();
    this.emit('queue:updated', { botId: resolvedBotId, queue: data.queue });
  }

  setPlaying(playing: boolean, botId?: number): void {
    const data = this.getQueueData(botId);
    data.isPlaying = playing;
  }
}

export const queueService = new QueueService();
