// LocaleContext — 语言偏好的持久化与切换，形状照着 ThemeContext 来。
//
// 默认「跟随系统」；用户在设置里手动选过语言之后，偏好写进 AsyncStorage，
// 之后就不再跟系统变。存的是偏好本身（'system' 或具体标签），不是解析后的语言，
// 这样用户带着「跟随系统」的设置换手机语言时，行为才是对的。

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import i18next, { FALLBACK_LANGUAGE, LANGUAGES, LANGUAGE_TAGS, getSystemLanguage } from './index';

// 不复用 ThemeContext 的 app_settings_v1：那边是 read-modify-write 整个 JSON，
// 两个 Provider 同时写会互相覆盖，单独开一个 key 最省事。
const LOCALE_KEY = 'app_locale_v1';

export const SYSTEM_PREFERENCE = 'system';

const LocaleContext = createContext({
  language: FALLBACK_LANGUAGE,
  preference: SYSTEM_PREFERENCE,
  languages: LANGUAGES,
  setLanguagePreference: () => {},
});

export function LocaleProvider({ children }) {
  const [preference, setPreference] = useState(SYSTEM_PREFERENCE);
  const [language, setLanguage] = useState(() => i18next.language || FALLBACK_LANGUAGE);

  // 读取存下来的偏好。'system' 或非法值都不用管，初始状态已经是跟随系统了。
  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY)
      .then(stored => {
        if (!stored || stored === SYSTEM_PREFERENCE) return;
        if (!LANGUAGE_TAGS.includes(stored)) return;
        setPreference(stored);
        setLanguage(stored);
        i18next.changeLanguage(stored);
      })
      .catch(() => {});
  }, []);

  const setLanguagePreference = useCallback((next) => {
    if (next !== SYSTEM_PREFERENCE && !LANGUAGE_TAGS.includes(next)) return;

    const tag = next === SYSTEM_PREFERENCE ? getSystemLanguage() : next;
    setPreference(next);
    setLanguage(tag);
    i18next.changeLanguage(tag);
    AsyncStorage.setItem(LOCALE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ language, preference, languages: LANGUAGES, setLanguagePreference }),
    [language, preference, setLanguagePreference],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// 取文案用 react-i18next 的 useTranslation()；这个 hook 只用于读当前语言
// （日期/数字格式化要传 locale）和做语言切换 UI。
export const useLocale = () => useContext(LocaleContext);
