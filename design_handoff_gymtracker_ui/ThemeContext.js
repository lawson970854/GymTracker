// ThemeContext.js — GymTracker "Precision Instrument" redesign
// Drop-in replacement. Adds: warm-neutral palette, light/dark, and 6
// USER-SELECTABLE color schemes (accent). Keeps the SAME token keys your
// screens already use (bg, card, input, textPrimary, accent, accentBg, gold…)
// so most makeStyles() blocks reskin automatically.

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'app_settings_v1';

// ---- Neutral base (varies by light/dark) ----
const NEUTRAL_LIGHT = {
  bg: '#F1F0EC',
  card: '#FFFFFF',
  card2: '#FAF9F6',
  input: '#F4F3EF',
  textPrimary: '#1B1A16',
  textSecondary: '#4B4943',
  textMuted: '#807D75',
  textFaint: '#A9A69D',
  border: '#E7E5DE',
  borderAlt: '#EFEEE8',
  divider: '#E7E5DE',
  gold: '#B07A1E', goldBg: '#FBF3E2', goldBorder: '#ECD6A6',
  orangeLabel: '#C2611C', orangeBg: '#FBEEE0', orangeBorder: '#EBC79A',
  onAccent: '#FFFFFF',
};

const NEUTRAL_DARK = {
  bg: '#0D0D0C',
  card: '#181816',
  card2: '#1F1F1C',
  input: '#1F1F1C',
  textPrimary: '#F3F2EC',
  textSecondary: '#C5C2B9',
  textMuted: '#918E84',
  textFaint: '#66635B',
  border: '#292824',
  borderAlt: '#211F1C',
  divider: '#292824',
  gold: '#E7C36B', goldBg: '#221C0E', goldBorder: '#4A3C19',
  orangeLabel: '#FF9F66', orangeBg: '#2A1B0C', orangeBorder: '#5C3D1A',
  onAccent: '#0E0E0C',
};

// ---- Accent schemes (accent / accentBg / accentInk / glow) ----
// accentInk = a slightly darker accent for small text on neutral backgrounds.
export const SCHEMES = ['emerald', 'blue', 'indigo', 'coral', 'pink', 'graphite'];
export const SCHEME_LABELS = { emerald: '翠绿', blue: '海蓝', indigo: '靛蓝', coral: '珊瑚', pink: '玫粉', graphite: '石墨' };

const ACCENTS = {
  light: {
    emerald:  { accent: '#0E9F6E', accentBg: '#E5F3EE', accentInk: '#0B6B4B' },
    blue:     { accent: '#1F77D6', accentBg: '#E6F0FB', accentInk: '#185FA6' },
    indigo:   { accent: '#5145D6', accentBg: '#ECEAFB', accentInk: '#3A2FA8' },
    coral:    { accent: '#E0552B', accentBg: '#FCEAE2', accentInk: '#B23E1C' },
    pink:     { accent: '#D6418A', accentBg: '#FBEAF2', accentInk: '#AC2E6C' },
    graphite: { accent: '#26251F', accentBg: '#ECEBE6', accentInk: '#26251F' },
  },
  dark: {
    emerald:  { accent: '#2BD79A', accentBg: '#0F2A20', accentInk: '#7DEEC4' },
    blue:     { accent: '#5AB0FF', accentBg: '#0E2234', accentInk: '#9FD2FF' },
    indigo:   { accent: '#8A7DFF', accentBg: '#1B1830', accentInk: '#BCB4FF' },
    coral:    { accent: '#FF7A4D', accentBg: '#2C160C', accentInk: '#FFB295' },
    pink:     { accent: '#FF80BC', accentBg: '#2C1320', accentInk: '#FFB2D6' },
    graphite: { accent: '#EDEBE3', accentBg: '#201F1B', accentInk: '#EDEBE3' },
  },
};

// graphite + volt-style light accents read text as white; in dark, graphite is
// near-white so its onAccent must be dark.
function onAccentFor(mode, scheme) {
  if (mode === 'dark' && scheme === 'graphite') return '#141310';
  return mode === 'dark' ? NEUTRAL_DARK.onAccent : NEUTRAL_LIGHT.onAccent;
}

export const RADIUS = { card: 22, lg: 26, btn: 15, input: 13, pill: 999, modal: 24 };

// Font families — load these with @expo-google-fonts (see README).
export const FONTS = {
  ui: 'Manrope_500Medium',
  uiBold: 'Manrope_700Bold',
  uiExtra: 'Manrope_800ExtraBold',
  num: 'Sora_600SemiBold',     // big numbers / hero metrics
  numBold: 'Sora_700Bold',
};

function buildTheme(mode, scheme) {
  const base = mode === 'dark' ? NEUTRAL_DARK : NEUTRAL_LIGHT;
  const acc = ACCENTS[mode === 'dark' ? 'dark' : 'light'][scheme] || ACCENTS.light.emerald;
  return {
    ...base,
    accent: acc.accent,
    accentBg: acc.accentBg,
    accentInk: acc.accentInk,
    onAccent: onAccentFor(mode, scheme),
  };
}

const ThemeContext = createContext({
  theme: buildTheme('light', 'emerald'),
  mode: 'light', scheme: 'emerald',
  setMode: () => {}, setScheme: () => {}, isDark: false,
});

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');
  const [scheme, setSchemeState] = useState('emerald');

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.themeMode === 'dark' || s.themeMode === 'light') setModeState(s.themeMode);
        if (SCHEMES.includes(s.colorScheme)) setSchemeState(s.colorScheme);
      } catch {}
    });
  }, []);

  const persist = async (patch) => {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const s = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...s, ...patch }));
  };

  const setMode = (m) => { const next = m === 'dark' ? 'dark' : 'light'; setModeState(next); persist({ themeMode: next }); };
  const setScheme = (sc) => { if (!SCHEMES.includes(sc)) return; setSchemeState(sc); persist({ colorScheme: sc }); };

  const isDark = mode === 'dark';
  const theme = useMemo(() => buildTheme(mode, scheme), [mode, scheme]);
  const value = useMemo(() => ({ theme, mode, scheme, setMode, setScheme, isDark }), [theme, mode, scheme, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
