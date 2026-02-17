import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 'gecko' | 'ocean' | 'purple' | 'sunset' | 'rose' | 'cyan' | 'crimson' | 'mint';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  color: string; // Preview color (hex)
}

export const themes: ThemeOption[] = [
  { id: 'gecko', name: 'Gecko Green', color: '#22c55e' },
  { id: 'ocean', name: 'Ocean Blue', color: '#3b82f6' },
  { id: 'purple', name: 'Purple Haze', color: '#a855f7' },
  { id: 'sunset', name: 'Sunset Orange', color: '#f97316' },
  { id: 'rose', name: 'Rose Pink', color: '#e8457a' },
  { id: 'cyan', name: 'Cyber Cyan', color: '#06b6d4' },
  { id: 'crimson', name: 'Crimson Red', color: '#dc2626' },
  { id: 'mint', name: 'Mint Fresh', color: '#34d399' },
];

function getStoredTheme(): ThemeId {
  const stored = localStorage.getItem('theme');
  if (stored && themes.some((t) => t.id === stored)) return stored as ThemeId;
  return 'gecko';
}

function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => {
    localStorage.setItem('theme', id);
    setThemeState(id);
  }, []);

  return { theme, setTheme, themes };
}
