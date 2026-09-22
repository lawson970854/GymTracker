// 首次启动的存储方式选择页。
//
// 两个入口都是按钮，尺寸、圆角、字号一致，看起来是一组。层级靠填充区分：
// 登录是实心强调色 + 投影，「先不登录」是白底描边、无投影。
// 不做成「实心按钮 + 文字链接」那种强弱对比，是因为那样两者看起来不像同一
// 层级的选择；但也不能做成完全等权 —— 本机模式数据只在这一台设备上，是降级
// 方案，不该和云端平起平坐。填充差异是这两者之间的折中。
//
// 合规注意：非账号路径必须始终清晰可见、可直达。1.0 (7) 曾因 App Review
// 指南 5.1.1(v)（把不依赖账号的功能挡在登录墙后）被驳回。「先不登录，直接
// 开始」是这条合规线，弱化它的视觉权重可以，隐藏或移除不行。
//
// 这个选择是可逆的：登录时 migrateLocalDataToCloud() 会把本机已有的数据搬上云，
// 之后也能在「我的」里随时切换。曾经在这里写了一行字解释可逆性，但用户在这个
// 时点还没开始用，不会考虑「以后能不能换」，那行字只是噪音，已删。
import React, { useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';

// 两个按钮共用，写成常量是为了改的时候不会只改一个
const BTN_HEIGHT = 54;

export default function WelcomeScreen({ onChooseCloud, onChooseLocal }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <View style={s.logoShadow}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={s.logoImage}
            accessibilityIgnoresInvertColors
          />
        </View>

        <Text style={s.appName}>{t('profile.defaultNickname')}</Text>
        <Text style={s.tagline}>{t('welcome.tagline')}</Text>

        <TouchableOpacity
          style={s.cloudBtn}
          onPress={onChooseCloud}
          accessibilityRole="button"
          accessibilityLabel={t('welcome.cloudCta')}
        >
          <Text style={s.cloudBtnText}>{t('welcome.cloudCta')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.localBtn}
          onPress={onChooseLocal}
          accessibilityRole="button"
          accessibilityLabel={t('welcome.localCta')}
        >
          <Text style={s.localBtnText}>{t('welcome.localCta')}</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 34 },

  // 阴影和圆角拆到两层：iOS 上同一个 Image 同时设圆角裁剪和阴影会互相冲突
  logoShadow: {
    alignSelf: 'center', marginBottom: 22, borderRadius: 18,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 }, elevation: 6,
  },
  logoImage: { width: 84, height: 84, borderRadius: 18 },

  appName: {
    fontSize: 30, fontFamily: FONTS.numBold, color: t.textPrimary,
    textAlign: 'center', letterSpacing: -0.6,
  },
  tagline: {
    fontSize: 14.5, textAlign: 'center', color: t.textMuted,
    marginTop: 10, marginBottom: 44, fontFamily: FONTS.ui,
  },

  cloudBtn: {
    backgroundColor: t.accent, borderRadius: RADIUS.btn,
    height: BTN_HEIGHT, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  cloudBtnText: { color: t.onAccent, fontSize: 16, fontFamily: FONTS.uiBold },

  // 12pt：两个按钮是一组，靠紧凑间距让它们读起来是「一个选择」而不是
  // 「两件不相干的事」。上方文案块到这一组之间留 44pt（见 tagline）。
  localBtn: {
    marginTop: 12,
    backgroundColor: t.card, borderRadius: RADIUS.btn,
    height: BTN_HEIGHT, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: t.border,
  },
  localBtnText: { color: t.textPrimary, fontSize: 16, fontFamily: FONTS.uiBold },

});
