import { EventEmitter } from 'events';

export interface LogEntry {
  ts: number;
  level: 'info' | 'warn' | 'error';
  source: 'backend';
  message: string;
}

const MAX_LINES = 500;

class LogBuffer extends EventEmitter {
  private lines: LogEntry[] = [];

  push(level: LogEntry['level'], message: string) {
    const entry: LogEntry = { ts: Date.now(), level, source: 'backend', message };
    this.lines.push(entry);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.emit('line', entry);
  }

  getLines(): LogEntry[] {
    return [...this.lines];
  }
}

export const logBuffer = new LogBuffer();
