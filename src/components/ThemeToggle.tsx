'use client';

import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'motisha-theme';

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

function getPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle({ showButton = false, className = '' }: { showButton?: boolean; className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const stored = getStoredTheme();
    const initialTheme = stored ?? getPreferredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === 'light' || event.newValue === 'dark') {
        setTheme(event.newValue);
        applyTheme(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      applyTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  if (!showButton) return null;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title="Toggle light / dark mode"
      aria-pressed={theme === 'dark'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface-soft)',
        color: 'var(--text)',
        cursor: 'pointer',
        fontSize: '0.82rem',
        fontWeight: 700,
        transition: 'background 0.2s, color 0.2s, border-color 0.2s',
      }}
      className={className}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
