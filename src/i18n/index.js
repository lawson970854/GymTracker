// i18n 骨架 —— 目前只装了简体中文一种语言，App 行为与改造前完全一致。
//
// 加一门新语言要动三个地方，缺一不可：
//   1. locales/ 下加 <tag>.json
//   2. 下面的 LANGUAGES 里加一条
//   3. app.json 里 expo-localization 插件的 supportedLocales 加同一个标签
// 第 3 步是原生改动（写进 Info.plist 的 CFBundleLocalizations），必须重新
// 构建提交新版本，OTA 推不了。只改前两步的话，App 内能切语言，但 App Store
// 的「语言」栏和 iOS 设置里的 App 语言开关不会认。

// Hermes 没有实现 Intl.PluralRules（Intl.DateTimeFormat / NumberFormat 都有，唯独缺这个）。
// 缺了它，i18next 无法判断某种语言有哪些复数类别，会退回成英语式的 _one / _other ——
// 于是中文在 count === 1 时去找并不存在的 xxx_one，直接吐出 key 名。
// 这个 polyfill 只在原生缺失时才安装，必须在 i18next.init() 之前完成。
// 加新语言时，记得把对应的 locale-data 一起引进来。
// 路径必须带 .js：该包的 exports 字段把 ./locale-data/* 原样映射，不会自动补扩展名
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/zh.js';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import zhHans from './locales/zh-Hans.json';

export const FALLBACK_LANGUAGE = 'zh-Hans';

// label 用该语言自己的写法，将来做语言选择列表时直接用，不需要翻译
export const LANGUAGES = {
  'zh-Hans': { label: '简体中文', translation: zhHans },
};

export const LANGUAGE_TAGS = Object.keys(LANGUAGES);

// 系统给的是完整 BCP-47 标签（zh-Hans-CN / zh-Hant-TW / ja-JP / en-US），
// 要收敛到我们支持的语言。三级匹配：完全相同 → 我们的标签是它的前缀 → 基础语言码相同。
// 最后一级意味着繁体中文用户目前会落到简体，这是暂时的降级，等加 zh-Hant 时自然消失。
export function resolveLanguage(tag) {
  if (!tag) return null;
  const lower = String(tag).toLowerCase();

  const exact = LANGUAGE_TAGS.find(t => t.toLowerCase() === lower);
  if (exact) return exact;

  const prefixed = LANGUAGE_TAGS.find(t => lower.startsWith(`${t.toLowerCase()}-`));
  if (prefixed) return prefixed;

  const base = lower.split('-')[0];
  return LANGUAGE_TAGS.find(t => t.toLowerCase().split('-')[0] === base) ?? null;
}

// getLocales() 返回的是用户在系统里排好序的语言偏好列表，按顺序取第一个我们支持的
export function getSystemLanguage() {
  try {
    for (const locale of getLocales()) {
      const match = resolveLanguage(locale.languageTag) ?? resolveLanguage(locale.languageCode);
      if (match) return match;
    }
  } catch {
    // getLocales() 理论上不会抛，兜一下避免启动直接崩
  }
  return FALLBACK_LANGUAGE;
}

const resources = Object.fromEntries(
  Object.entries(LANGUAGES).map(([tag, { translation }]) => [tag, { translation }]),
);

// 这里就用系统语言初始化，保证首帧渲染的语言是对的；
// 用户在设置里手动指定过的语言存在 AsyncStorage（异步），由 LocaleProvider 读出来再覆盖。
i18next.use(initReactI18next).init({
  resources,
  lng: getSystemLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false }, // RN 渲染的不是 HTML，转义反而会把「」这类字符弄坏
  returnNull: false,
});

export default i18next;
