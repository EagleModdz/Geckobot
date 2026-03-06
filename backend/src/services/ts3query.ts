import net from 'net';

// ── TS3 wire-format helpers ───────────────────────────────────────────────────

function ts3Unescape(s: string): string {
  return s
    .replace(/\\\\/g, '\x01')
    .replace(/\\s/g, ' ')
    .replace(/\\p/g, '|')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\x01/g, '\\');
}

export function ts3Escape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/ /g, '\\s')
    .replace(/\|/g, '\\p')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function parseTs3Props(s: string): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const token of s.split(' ').filter(Boolean)) {
    const eq = token.indexOf('=');
    obj[eq === -1 ? token : token.slice(0, eq)] = eq === -1 ? '' : ts3Unescape(token.slice(eq + 1));
  }
  return obj;
}

// ── Client list parsing ───────────────────────────────────────────────────────

export interface Ts3Client {
  clid: number;
  cid: number;
  uid: string;
  nickname: string;
  /** 0 = regular client, 1 = server query */
  type: number;
  away: boolean;
  awayMessage: string;
  /** Milliseconds since last input */
  idleMs: number;
}

export function parseClientList(raw: string): Ts3Client[] {
  if (!raw.trim()) return [];
  return raw.split('|').flatMap((entry) => {
    const e = entry.trim();
    if (!e) return [];
    const p = parseTs3Props(e);
    return [{
      clid:        parseInt(p['clid']                     ?? '0', 10),
      cid:         parseInt(p['cid']                      ?? '0', 10),
      uid:                  p['client_unique_identifier'] ?? '',
      nickname:             p['client_nickname']          ?? '',
      type:        parseInt(p['client_type']              ?? '0', 10),
      away:                 p['client_away']              === '1',
      awayMessage:          p['client_away_message']      ?? '',
      idleMs:      parseInt(p['client_idle_time']         ?? '0', 10),
    }];
  });
}

// ── One-shot query session ────────────────────────────────────────────────────

/**
 * Opens a TCP connection to the TS3 query port, logs in, selects virtual server 1,
 * runs `fn`, then closes the socket.  All `send()` calls inside `fn` are sequential.
 */
export async function runTs3Query<T>(
  host: string,
  queryPort: number,
  user: string,
  pass: string,
  fn: (send: (cmd: string) => Promise<string>) => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const socket = new net.Socket();
    let buf = '';
    let bannerLines = 0;
    const queue: Array<{ cmd: string; resolve: (s: string) => void; reject: (e: Error) => void }> = [];
    let inFlight = false;
    let responseAccum: string[] = [];
    let finished = false;

    function die(err: Error) {
      if (finished) return;
      finished = true;
      socket.destroy();
      for (const item of queue) item.reject(err);
      reject(err);
    }

    function done(value: T) {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(value);
    }

    function flush() {
      if (inFlight || queue.length === 0) return;
      inFlight = true;
      responseAccum = [];
      socket.write(queue[0].cmd + '\n');
    }

    function send(cmd: string): Promise<string> {
      return new Promise<string>((res, rej) => {
        queue.push({ cmd, resolve: res, reject: rej });
        flush();
      });
    }

    async function setupAndRun() {
      try {
        await send(`login ${ts3Escape(user)} ${ts3Escape(pass)}`);
        await send('use 1');
        const result = await fn(send);
        done(result);
      } catch (err) {
        die(err instanceof Error ? err : new Error(String(err)));
      }
    }

    socket.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '').trim();
        if (!line) continue;

        // Drain welcome banner (always 2 lines: "TS3" + welcome text)
        if (bannerLines < 2) {
          bannerLines++;
          if (bannerLines === 2) setupAndRun();
          continue;
        }

        if (line.startsWith('notify')) continue; // ignore server-push events

        if (line.startsWith('error ')) {
          const p = parseTs3Props(line.slice(6));
          const item = queue.shift();
          inFlight = false;
          if (item) {
            if (p['id'] === '0') {
              item.resolve(responseAccum.join('\n'));
            } else {
              item.reject(new Error(`TS3 error ${p['id']}: ${ts3Unescape(p['msg'] ?? 'unknown')}`));
            }
          }
          flush();
        } else {
          responseAccum.push(line);
        }
      }
    });

    socket.on('error', (err) => die(err));
    socket.on('timeout', () => die(new Error('TS3 query connection timed out')));
    socket.on('close', () => {
      if (!finished) die(new Error('TS3 query connection closed unexpectedly'));
    });

    socket.setTimeout(10_000);
    socket.connect(queryPort, host);
  });
}
