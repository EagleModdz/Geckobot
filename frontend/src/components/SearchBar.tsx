import { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Search, Play, ListPlus, Loader2, Youtube, AlertCircle, Radio } from 'lucide-react';
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
  isLive?: boolean;
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
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'youtube'
            ? 'bg-red-500/20 text-red-400'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          YouTube
        </button>
        <button
          onClick={() => setActiveTab('spotify')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'spotify'
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
    <div className="divide-y divide-border/30 pb-4">
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
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm truncate">{track.title}</p>
              {track.isLive && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold bg-red-600 text-white px-1 py-px rounded flex-shrink-0">
                  <Radio className="h-2.5 w-2.5" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {track.artist} &middot; {track.isLive ? '∞' : formatDuration(track.duration)}
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

// Module-level cache — survives Dashboard unmount/remount when navigating away
const _cache = {
  query: '',
  allTracks: [] as Track[],
  results: [] as Track[],
  page: 1,
  activeTab: 'youtube' as 'youtube' | 'spotify',
  error: null as string | null,
};

export const SearchBar = forwardRef<SearchBarHandle>(function SearchBar(_props, ref) {
  const [query, setQuery] = useState(_cache.query);
  const [results, setResults] = useState<Track[]>(_cache.results);
  const [allTracks, setAllTracks] = useState<Track[]>(_cache.allTracks);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify'>(_cache.activeTab);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(_cache.error);
  const [page, setPage] = useState(_cache.page);
  const [hasMore, setHasMore] = useState(false);

  // Keep cache in sync so state survives navigation
  const setQueryC = (v: string) => { _cache.query = v; setQuery(v); };
  const setResultsC = (v: Track[]) => { _cache.results = v; setResults(v); };
  const setAllTracksC = (v: Track[]) => { _cache.allTracks = v; setAllTracks(v); };
  const setPageC = (v: number) => { _cache.page = v; setPage(v); };
  const setErrorC = (v: string | null) => { _cache.error = v; setError(v); };
  const setActiveTabC = (v: 'youtube' | 'spotify') => { _cache.activeTab = v; setActiveTab(v); };

  const [limit, setLimit] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    get hasResults() { return results.length > 0; }
  }));

  // Calculate limit based on available height
  useEffect(() => {
    const updateLimit = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        const itemHeight = 62; // Approximate height of a search result item
        const newLimit = Math.max(3, Math.floor(height / itemHeight));
        setLimit(newLimit);
      }
    };

    updateLimit(); // Initial calculation
    window.addEventListener('resize', updateLimit);
    return () => window.removeEventListener('resize', updateLimit);
  }, []);

  // Update displayed results when page, limit, or buffer changes
  useEffect(() => {
    if (activeTab === 'youtube') {
      const start = (page - 1) * limit;
      const end = start + limit;
      setResultsC(allTracks.slice(start, end));
      setHasMore(allTracks.length > end || (allTracks.length > 0 && allTracks.length % 50 === 0));
    }
  }, [page, limit, allTracks, activeTab]);

  const handleSearch = async (targetPage = 1, isNewSearch = false) => {
    if (!query.trim()) return;

    // Reset if new search
    let currentBuffer = isNewSearch ? [] : [...allTracks];
    if (isNewSearch) {
      setAllTracksC([]);
      setPageC(1);
      setResultsC([]);
      // currentBuffer is []
    }

    const endNeeded = targetPage * limit;
    const BATCH_SIZE = 25;

    if (activeTab === 'youtube') {
      // If we don't have enough data in buffer, fetch more
      if (currentBuffer.length < endNeeded) {
        setLoading(true);
        setErrorC(null);
        try {
          const nextBatchPage = Math.floor(currentBuffer.length / BATCH_SIZE) + 1;
          const data = await api.searchYouTube(query, nextBatchPage, BATCH_SIZE);

          if (data.error) setErrorC(data.error);

          if (data.tracks && data.tracks.length > 0) {
            currentBuffer = [...currentBuffer, ...data.tracks];
            setAllTracksC(currentBuffer);
          }
        } catch (err) {
          setErrorC(err instanceof Error ? err.message : 'Search failed');
        } finally {
          setLoading(false);
        }
      }
      setPageC(targetPage);
    } else {
      setLoading(true);
      setErrorC(null);
      try {
        const data = await api.searchSpotify(query);
        setResultsC(data.tracks);
        setAllTracksC(data.tracks);
      } catch (err) {
        setResultsC([]);
        setErrorC(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const onSearchClick = () => {
    handleSearch(1, true);
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
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar search input */}
      <div className="p-3 border-b border-border/30 flex-shrink-0">
        <SearchInput
          query={query}
          setQuery={setQueryC}
          activeTab={activeTab}
          setActiveTab={(t) => { setActiveTabC(t); setErrorC(null); setResultsC([]); setPageC(1); }}
          onSearch={onSearchClick}
          loading={loading}
        />
      </div>
      {/* Results */}
      <div ref={containerRef} className="flex-1 overflow-hidden min-h-0">
        <SearchResults
          results={results}
          error={error}
          loading={loading}
          busyId={busyId}
          onPlay={handlePlay}
          onQueue={handleQueue}
        />
      </div>

      {/* Pagination Footer */}
      {activeTab === 'youtube' && results.length > 0 && (
        <div className="p-2 border-t border-border/30 bg-card/50 flex items-center justify-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSearch(page - 1, false)}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground w-16 text-center">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSearch(page + 1, false)}
            disabled={!hasMore || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
});
