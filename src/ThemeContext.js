import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'app_settings_v1';

export const LIGHT = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  input: '#F0F0F0',
  textPrimary: '#222222',
  textSecondary: '#555555',
  textMuted: '#767676',
  textFaint: '#8E8E93',
  border: '#F0F0F0',
  borderAlt: '#F5F5F5',
  accent: '#1D9E75',
  accentBg: '#EDF7F3',
  orangeLabel: '#E65100',
  orangeBg: '#FFF3E0',
  orangeBorder: '#FFB74D',
  gold: '#B8860B',
  goldBg: '#FFF9E6',
  goldBorder: '#FFD700',
};

export const DARK = {
  bg: '#121212',
  card: '#1E1E1E',
  input: '#2A2A2A',
  textPrimary: '#EEEEEE',
  textSecondary: '#AAAAAA',
  textMuted: '#777777',
  textFaint: '#6E6E6E',
  border: '#2C2C2C',
  borderAlt: '#333333',
  accent: '#1D9E75',
  accentBg: '#0D2820',
  orangeLabel: '#FF9500',
  orangeBg: '#2A1A00',
  orangeBorder: '#7B4800',
  gold: '#D4A800',
  goldBg: '#252000',
  goldBorder: '#6B5000',
};

export const RADIUS = { card: 12, btn: 12, input: 8, modal: 20 };

const ThemeContext = createContext({
  theme: LIGHT,
  mode: 'system',
  setMode: () => {},
  isDark: false,
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (raw) {
        try {
          const s = JSON.parse(raw);
          if (s.themeMode) setModeState(s.themeMode);
        } catch {}
      }
    });
  }, []);

  const setMode = async (m) => {
    setModeState(m);
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const s = raw ? JSON.parse(raw) : {};
    s.themeMode = m;
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  };

  const resolvedScheme = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const isDark = resolvedScheme === 'dark';
  const theme = isDark ? DARK : LIGHT;

  const value = useMemo(() => ({ theme, mode, setMode, isDark }), [theme, mode, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
