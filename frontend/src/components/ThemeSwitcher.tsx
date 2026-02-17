import { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme, themes, type ThemeId } from '@/hooks/useTheme';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(!open)}>
        <Palette className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-card p-1.5 shadow-xl z-50">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id as ThemeId); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                theme === t.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: t.color }} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
