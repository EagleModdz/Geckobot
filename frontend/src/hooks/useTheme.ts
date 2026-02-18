import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 'light' | 'dark' | 'gecko' | 'ocean' | 'purple' | 'sunset' | 'rose' | 'cyan' | 'crimson' | 'mint' | 'midnight' | 'forest' | 'gold' | 'dracula' | 'nord';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  color: string; // Preview color (hex)
  gradient?: string; // Optional gradient for fancier preview
}

export const themes: ThemeOption[] = [
  { id: 'light', name: 'Light Mode', color: '#ffffff', gradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)' },
  { id: 'dark', name: 'Full Dark', color: '#000000', gradient: 'linear-gradient(135deg, #09090b 0%, #000000 100%)' },
  { id: 'gecko', name: 'Gecko Green', color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
  { id: 'ocean', name: 'Ocean Blue', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  { id: 'purple', name: 'Purple Haze', color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' },
  { id: 'sunset', name: 'Sunset Orange', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
  { id: 'rose', name: 'Rose Pink', color: '#e8457a', gradient: 'linear-gradient(135deg, #e8457a 0%, #be126d 100%)' },
  { id: 'cyan', name: 'Cyber Cyan', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  { id: 'crimson', name: 'Crimson Red', color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
  { id: 'mint', name: 'Mint Fresh', color: '#34d399', gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' },
  { id: 'midnight', name: 'Midnight', color: '#1e293b', gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
  { id: 'forest', name: 'Dark Forest', color: '#14532d', gradient: 'linear-gradient(135deg, #166534 0%, #14532d 100%)' },
  { id: 'gold', name: 'Luxury Gold', color: '#eab308', gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' },

  { id: 'dracula', name: 'Dracula', color: '#bd93f9', gradient: 'linear-gradient(135deg, #bd93f9 0%, #6272a4 100%)' },
  { id: 'nord', name: 'Nordic Frost', color: '#88c0d0', gradient: 'linear-gradient(135deg, #88c0d0 0%, #81a1c1 100%)' },
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
