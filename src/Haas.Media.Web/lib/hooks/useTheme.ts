"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ThemeMode, UseThemeReturn } from '../../types';

export const useTheme = (): UseThemeReturn => {
  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  // SSR-safe initial state: always start as 'system' and 'light' to match server markup
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((nextMode: ThemeMode) => {
    const root = window.document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryRef.current = media;

    const nextResolved: 'light' | 'dark' =
      nextMode === 'system' ? (media.matches ? 'dark' : 'light') : nextMode;

    root.classList.remove('light', 'dark');
    root.classList.add(nextResolved);
    root.style.colorScheme = nextResolved;
    setResolvedTheme(nextResolved);
  }, []);

  // On mount, read stored preference and apply; also react to system changes when in system mode
  useEffect(() => {
    try {
      const stored = (localStorage.getItem('theme') as ThemeMode | null) ?? 'system';
      setMode(stored);
      applyTheme(stored);
    } catch {
      applyTheme('system');
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryRef.current = media;
    const onChange = () => {
      if (mode === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
    // It's intentional that we don't include `mode` here to avoid re-reading localStorage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTheme]);

  // Set explicit theme mode
  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    localStorage.setItem('theme', nextMode);
    applyTheme(nextMode);
  }, [applyTheme]);

  const theme = useMemo(() => mode, [mode]);

  return { theme, resolvedTheme, setThemeMode };
};
