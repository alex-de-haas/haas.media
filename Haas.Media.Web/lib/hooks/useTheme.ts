"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ThemeMode, UseThemeReturn } from '../../types';

export const useTheme = (): UseThemeReturn => {
  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  // Initialize from storage or default to system, and resolve immediately to avoid flicker
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem('theme') as ThemeMode | null;
      return stored ?? 'system';
    } catch {
      return 'system';
    }
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('theme') as ThemeMode | null;
      const initialMode: ThemeMode = stored ?? 'system';
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return initialMode === 'system' ? (prefersDark ? 'dark' : 'light') : initialMode;
    } catch {
      return 'light';
    }
  });

  const applyTheme = useCallback((nextMode: ThemeMode) => {
    const root = window.document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryRef.current = media;

    const nextResolved: 'light' | 'dark' =
      nextMode === 'system' ? (media.matches ? 'dark' : 'light') : nextMode;

    root.classList.remove('light', 'dark');
    root.classList.add(nextResolved);
    setResolvedTheme(nextResolved);
  }, []);

  // Apply current mode on mount and when system preference changes while in system mode
  useEffect(() => {
    applyTheme(mode);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryRef.current = media;
    const onChange = () => {
      if (mode === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [applyTheme, mode]);

  // Set explicit theme mode
  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    localStorage.setItem('theme', nextMode);
    applyTheme(nextMode);
  }, [applyTheme]);

  const theme = useMemo(() => mode, [mode]);

  return { theme, resolvedTheme, setThemeMode };
};
