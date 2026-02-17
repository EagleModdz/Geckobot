import { useState, forwardRef, useImperativeHandle } from 'react';
import { Search, Play, ListPlus, Loader2, Youtube, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { formatDuration } from '@/lib/utils';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  url: string;
  source: string;
}

export interface SearchBarHandle {
  hasResults: boolean;
}

interface SearchInputProps {
  query: string;
  setQuery: (q: string) => void;
  activeTab: 'youtube' | 'spotify';
  setActiveTab: (t: 'youtube' | 'spotify') => void;
  onSearch: () => void;
  loading: boolean;
}

export function SearchInput({ query, setQuery, activeTab, setActiveTab, onSearch, loading }: SearchInputProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-secondary/50 rounded-md p-0.5">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            activeTab === 'youtube'
              ? 'bg-red-500/20 text-red-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          YouTube
        </button>
        <button
          onClick={() => setActiveTab('spotify')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            activeTab === 'spotify'
              ? 'bg-green-500/20 text-green-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Spotify
        </button>
      </div>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={`Search ${activeTab}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="h-8 pl-8 text-sm"
        />
      </div>
      <Button onClick={onSearch} disabled={loading} size="sm" className="h-8">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export function SearchResults({ results, error, loading, busyId, onPlay, onQueue }: {
  results: Track[];
  error: string | null;
  loading: boolean;
  busyId: string | null;
  onPlay: (track: Track) => void;
  onQueue: (track: Track) => void;
}) {
  if (error) {
    return (
      <div className="mx-4 mt-4 flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
        <p className="text-xs text-destructive">{error}</p>
      </div>
    );
  }

  if (results.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Search className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">Search for music</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {results.map((track) => (
        <div
          key={track.id}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors group"
        >
          <div className="w-10 h-10 rounded bg-secondary flex-shrink-0 overflow-hidden">
            {track.thumbnail ? (
              <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Youtube className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate">{track.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {track.artist} &middot; {formatDuration(track.duration)}
            </p>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary"
              onClick={() => onPlay(track)}
              disabled={busyId === track.id}
              title="Play now"
            >
              {busyId === track.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onQueue(track)}
              disabled={busyId === track.id}
              title="Add to queue"
            >
              <ListPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export const SearchBar = forwardRef<SearchBarHandle>(function SearchBar(_props, ref) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify'>('youtube');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    get hasResults() { return results.length > 0; }
  }));

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data =
        activeTab === 'youtube'
          ? await api.searchYouTube(query)
          : await api.searchSpotify(query);
      setResults(data.tracks);
      if (data.error) setError(data.error);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (track: Track) => {
    setBusyId(track.id);
    try {
      await api.play(track.url, {
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
        source: track.source,
      });
      toast.success('Now playing', track.title);
    } catch {
      toast.error('Failed to play');
    } finally {
      setBusyId(null);
    }
  };

  const handleQueue = async (track: Track) => {
    setBusyId(track.id);
    try {
      await api.addToQueue(track);
      toast.success('Added to queue', track.title);
    } catch {
      toast.error('Failed to add to queue');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar search input */}
      <div className="p-3 border-b border-border/30">
        <SearchInput
          query={query}
          setQuery={setQuery}
          activeTab={activeTab}
          setActiveTab={(t) => { setActiveTab(t); setError(null); }}
          onSearch={handleSearch}
          loading={loading}
        />
      </div>
      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <SearchResults
          results={results}
          error={error}
          loading={loading}
          busyId={busyId}
          onPlay={handlePlay}
          onQueue={handleQueue}
        />
      </div>
    </div>
  );
});
