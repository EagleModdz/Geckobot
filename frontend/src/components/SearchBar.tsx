import { useState } from 'react';
import { Search, Plus, Loader2, Youtube, AlertCircle } from 'lucide-react';
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

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify'>('youtube');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleAdd = async (track: Track) => {
    setAddingId(track.id);
    try {
      await api.addToQueue(track);
      toast.success('Added to queue', track.title);
    } catch {
      toast.error('Failed to add to queue');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab('youtube'); setError(null); }}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'youtube'
              ? 'border-b-2 border-red-500 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          YouTube
        </button>
        <button
          onClick={() => { setActiveTab('spotify'); setError(null); }}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'spotify'
              ? 'border-b-2 border-green-500 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Spotify
        </button>
      </div>

      {/* Search input */}
      <div className="flex gap-2 p-3">
        <Input
          placeholder={`Search ${activeTab}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button onClick={handleSearch} disabled={loading} size="icon">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Search for music</p>
          </div>
        )}
        {results.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 transition-colors group"
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleAdd(track)}
              disabled={addingId === track.id}
            >
              {addingId === track.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
