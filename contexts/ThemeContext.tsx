import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: typeof Colors.dark;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('theme_mode');
      if (saved === 'light' || saved === 'dark') setMode(saved);
    })();
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem('theme_mode', next);
      return next;
    });
  }, []);

  const setTheme = useCallback((m: ThemeMode) => {
    setMode(m);
    AsyncStorage.setItem('theme_mode', m);
  }, []);

  const value = useMemo(() => ({
    mode,
    colors: Colors[mode],
    isDark: mode === 'dark',
    toggleTheme,
    setTheme,
  }), [mode, toggleTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
