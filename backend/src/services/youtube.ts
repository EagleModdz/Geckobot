import { execFile } from 'child_process';
import { promisify } from 'util';
import { Track } from '../types';
import { settingsService } from './settings';

const execFileAsync = promisify(execFile);

function getYtDlpPath(): string {
  return settingsService.get().ytdlp.path || 'yt-dlp';
}

function getExtraArgs(): string[] {
  const cookiesFile = settingsService.get().ytdlp.cookiesFile;
  if (cookiesFile) return ['--cookies', cookiesFile];
  return [];
}

export async function searchYouTube(
  query: string,
  limit = 10,
): Promise<{ tracks: Track[]; error?: string }> {
  const ytdlp = getYtDlpPath();

  try {
    const { stdout } = await execFileAsync(
      ytdlp,
      [
        '--flat-playlist',
        '--dump-json',
        '--no-warnings',
        '--default-search',
        'ytsearch' + limit,
        ...getExtraArgs(),
        query,
      ],
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
    );

    const lines = stdout.trim().split('\n').filter(Boolean);
    const tracks = lines
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter((data): data is Record<string, unknown> => {
        if (!data) return false;
        // Filter out channels and playlists — only keep actual video entries
        if (data._type === 'playlist') return false;
        if (data.ie_key === 'YoutubeTab') return false;
        if (!data.id) return false;
        return true;
      })
      .map((data) => {
        const isLive = data.is_live === true || data.live_status === 'is_live';
        return {
          id: String(data.id),
          title: String(data.title || 'Unknown'),
          artist: String(data.uploader || data.channel || ''),
          duration: isLive ? 0 : (typeof data.duration === 'number' ? data.duration : 0),
          thumbnail: String(data.thumbnail || (Array.isArray(data.thumbnails) ? data.thumbnails[0]?.url : '') || ''),
          url: `https://www.youtube.com/watch?v=${data.id}`,
          source: 'youtube' as const,
          isLive,
        };
      });
    return { tracks };
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return {
        tracks: [],
        error: `yt-dlp not found at "${ytdlp}". Install it or set the correct path in Settings.`,
      };
    }
    const stderr = (error as { stderr?: string }).stderr || '';
    const msg = stderr || err.message || 'Unknown error';
    console.error('YouTube search failed:', msg);
    return { tracks: [], error: `YouTube search failed: ${msg.slice(0, 200)}` };
  }
}

export async function getYouTubeAudioUrl(videoUrl: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      getYtDlpPath(),
      ['-f', 'bestaudio', '-g', '--no-warnings', ...getExtraArgs(), videoUrl],
      { timeout: 30000 },
    );
    return stdout.trim();
  } catch (error) {
    console.error('Failed to get YouTube audio URL:', error);
    return null;
  }
}

export async function getYouTubeInfo(videoUrl: string): Promise<Track | null> {
  try {
    const { stdout } = await execFileAsync(
      getYtDlpPath(),
      ['--dump-json', '--no-warnings', '--no-download', ...getExtraArgs(), videoUrl],
      { timeout: 30000 },
    );

    const data = JSON.parse(stdout.trim());
    return {
      id: data.id,
      title: data.title || 'Unknown',
      artist: data.uploader || data.channel || '',
      duration: data.duration || 0,
      thumbnail: data.thumbnail || '',
      url: videoUrl,
      source: 'youtube',
    };
  } catch (error) {
    console.error('Failed to get YouTube info:', error);
    return null;
  }
}
