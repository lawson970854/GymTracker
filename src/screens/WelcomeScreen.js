// 首次启动的存储方式选择页。
//
// 为什么两个入口的视觉权重不对等：云端是实心主按钮，本机是文字链接。
// 等权的两个按钮会把「本机存储」抬成和云端平起平坐的选项，而它其实是
// 降级方案 —— 数据只在这一台设备上。用户在这个时点还没看到任何产品价值，
// 没有信息基础做「数据放哪」这种技术决策，所以这里不问存储位置，只讲后果
// （会不会丢），并把推荐路径做得更显眼。
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
        <Text style={s.cloudBenefit}>{t('welcome.cloudBenefit')}</Text>

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
    height: 54, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  cloudBtnText: { color: t.onAccent, fontSize: 16, fontFamily: FONTS.uiBold },
  cloudBenefit: {
    fontSize: 13, textAlign: 'center', color: t.textMuted,
    marginTop: 12, fontFamily: FONTS.ui,
  },

  localBtn: { marginTop: 26, alignItems: 'center', paddingVertical: 10 },
  localBtnText: { fontSize: 15, color: t.textMuted, fontFamily: FONTS.uiBold },

});
