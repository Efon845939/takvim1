'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeOption = 'auto' | 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeOption;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeOption) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'takvimer-theme-preference';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(theme: ThemeOption) {
  const root = document.documentElement;
  const effectiveTheme = theme === 'auto' ? getSystemTheme() : theme;

  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<ThemeOption>('auto');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const savedTheme = window.localStorage.getItem(STORAGE_KEY) as ThemeOption | null;
    const initialTheme = savedTheme ?? 'auto';
    setThemeState(initialTheme);
    const currentTheme = initialTheme === 'auto' ? getSystemTheme() : initialTheme;
    setEffectiveTheme(currentTheme);
    applyThemeClass(initialTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (initialTheme === 'auto') {
        const newTheme = getSystemTheme();
        setEffectiveTheme(newTheme);
        applyThemeClass('auto');
      }
    };

    mediaQuery.addEventListener?.('change', handleSystemChange);
    return () => {
      mediaQuery.removeEventListener?.('change', handleSystemChange);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyThemeClass(theme);
    setEffectiveTheme(theme === 'auto' ? getSystemTheme() : theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const contextValue = useMemo(
    () => ({ theme, effectiveTheme, setTheme: setThemeState }),
    [theme, effectiveTheme]
  );

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
