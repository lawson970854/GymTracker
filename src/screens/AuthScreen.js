import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';

const LAST_METHOD_KEY = '@gymtracker:lastAuthMethod';

export default function AuthScreen() {
  const { theme: t, isDark } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [lastMethod, setLastMethod] = useState(null);

  const passwordRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
    AsyncStorage.getItem(LAST_METHOD_KEY).then(setLastMethod).catch(() => {});
  }, []);

  const rememberMethod = (method) => {
    setLastMethod(method);
    AsyncStorage.setItem(LAST_METHOD_KEY, method).catch(() => {});
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('未获取到 Apple 身份令牌');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) Alert.alert('登录失败', error.message);
      else rememberMethod('apple');
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('登录失败', e.message || '请重试');
      }
    }
  };

  const handleAuth = async () => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) return Alert.alert('提示', '请输入邮箱和密码');
    if (p.length < 6) return Alert.alert('提示', '密码至少 6 位');

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
        if (error) Alert.alert('登录失败', error.message);
        else rememberMethod('email');
      } else {
        const { error } = await supabase.auth.signUp({ email: e, password: p });
        if (error) Alert.alert('注册失败', error.message);
        else {
          rememberMethod('email');
          Alert.alert('注册成功', '请查收验证邮件后登录');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const e = email.trim();
    if (!e) return Alert.alert('提示', '请先在上方输入邮箱，再点击"忘记密码"');
    Alert.alert(
      '重置密码',
      `将发送重置密码邮件到 ${e}，确认发送吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '发送',
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(e);
            if (error) Alert.alert('发送失败', error.message);
            else Alert.alert('已发送', '请查收邮件，按提示重置密码后再回来登录');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.inner}>
          <View style={s.logoBadge}>
            <Ionicons name="barbell-outline" size={42} color={t.onAccent} />
          </View>
          <Text style={s.title}>铁记</Text>
          <Text style={s.subtitle}>登录或注册以同步你的训练数据</Text>

          {appleAvailable && (
            <>
              <View style={s.appleWrap}>
                {lastMethod === 'apple' && (
                  <View style={s.lastUsedBadge}>
                    <Text style={s.lastUsedText}>上次使用</Text>
                  </View>
                )}
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={RADIUS.btn}
                  style={s.appleBtn}
                  onPress={handleAppleSignIn}
                />
              </View>

              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>或使用邮箱</Text>
                <View style={s.dividerLine} />
              </View>
            </>
          )}

          <View style={s.emailWrap}>
            {lastMethod === 'email' && (
              <View style={[s.lastUsedBadge, s.lastUsedBadgeEmail]}>
                <Text style={s.lastUsedText}>上次使用</Text>
              </View>
            )}

            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tabBtn, isLogin && s.tabBtnActive]}
                onPress={() => setIsLogin(true)}
                accessibilityRole="button"
                accessibilityLabel="切换到登录"
              >
                <Text style={[s.tabText, isLogin && s.tabTextActive]}>登录</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tabBtn, !isLogin && s.tabBtnActive]}
                onPress={() => setIsLogin(false)}
                accessibilityRole="button"
                accessibilityLabel="切换到注册"
              >
                <Text style={[s.tabText, !isLogin && s.tabTextActive]}>注册</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.input}
              placeholder="邮箱"
              placeholderTextColor={t.textFaint}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityLabel="邮箱地址"
            />

            <View style={s.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={s.passwordInput}
                placeholder="密码（至少 6 位）"
                placeholderTextColor={t.textFaint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType={isLogin ? 'password' : 'newPassword'}
                returnKeyType="done"
                onSubmitEditing={handleAuth}
                accessibilityLabel="密码"
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                accessibilityLabel={showPassword ? '隐藏密码' : '显示密码'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={t.textFaint}
                />
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                accessibilityRole="button"
                accessibilityLabel="忘记密码"
                style={s.forgotBtn}
              >
                <Text style={s.forgotText}>忘记密码？</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={s.btn}
              onPress={handleAuth}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={isLogin ? '登录' : '注册'}
            >
              {loading
                ? <ActivityIndicator color={t.onAccent} />
                : <Text style={s.btnText}>{isLogin ? '登录' : '注册'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 34 },
  logoBadge: {
    width: 84, height: 84, borderRadius: 24,
    backgroundColor: t.accent,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 }, elevation: 6,
  },
  title: {
    fontSize: 30, fontFamily: FONTS.numBold, color: t.textPrimary,
    textAlign: 'center', letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14, textAlign: 'center', color: t.textMuted,
    marginTop: 6, marginBottom: 30, fontFamily: FONTS.ui,
  },
  appleWrap: { position: 'relative' },
  emailWrap: { position: 'relative' },
  lastUsedBadge: {
    position: 'absolute', top: -10, right: 8, zIndex: 1,
    backgroundColor: t.accent, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  lastUsedBadgeEmail: { top: -10 },
  lastUsedText: { color: t.onAccent, fontSize: 11, fontFamily: FONTS.uiBold },
  tabRow: {
    flexDirection: 'row', backgroundColor: t.card, borderRadius: RADIUS.btn,
    borderWidth: 1, borderColor: t.border, padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.btn - 4, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: t.accent },
  tabText: { fontSize: 15, fontFamily: FONTS.uiBold, color: t.textMuted },
  tabTextActive: { color: t.onAccent },
  input: {
    height: 54, borderRadius: RADIUS.btn, paddingHorizontal: 16,
    backgroundColor: t.card,
    borderWidth: 1, borderColor: t.border,
    fontSize: 15, color: t.textPrimary, marginBottom: 13,
    fontFamily: FONTS.ui,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 54, borderRadius: RADIUS.btn, paddingLeft: 16, paddingRight: 4,
    backgroundColor: t.card,
    borderWidth: 1, borderColor: t.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  passwordInput: { flex: 1, fontSize: 15, color: t.textPrimary, fontFamily: FONTS.ui },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { fontSize: 13, color: t.accentInk, fontFamily: FONTS.uiBold },
  btn: {
    backgroundColor: t.accent, borderRadius: RADIUS.btn,
    height: 54, alignItems: 'center', justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  btnText: { color: t.onAccent, fontSize: 16, fontFamily: FONTS.uiBold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: t.textFaint, fontFamily: FONTS.ui },
  appleBtn: { height: 50 },
});
