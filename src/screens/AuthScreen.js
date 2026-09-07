import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../supabase';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';

export default function AuthScreen() {
  const { theme: t, isDark } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const passwordRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

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
      } else {
        const { error } = await supabase.auth.signUp({ email: e, password: p });
        if (error) Alert.alert('注册失败', error.message);
        else Alert.alert('注册成功', '请查收验证邮件后登录');
      }
    } finally {
      setLoading(false);
    }
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

          {appleAvailable && (
            <>
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>或</Text>
                <View style={s.dividerLine} />
              </View>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={RADIUS.btn}
                style={s.appleBtn}
                onPress={handleAppleSignIn}
              />
            </>
          )}
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
  tabRow: {
    flexDirection: 'row', backgroundColor: t.card, borderRadius: RADIUS.btn,
    borderWidth: 1, borderColor: t.border, padding: 4,
    marginTop: 24, marginBottom: 28,
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
    marginBottom: 13,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  passwordInput: { flex: 1, fontSize: 15, color: t.textPrimary, fontFamily: FONTS.ui },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 16 },
  btn: {
    backgroundColor: t.accent, borderRadius: RADIUS.btn,
    height: 54, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 22,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  btnText: { color: t.onAccent, fontSize: 16, fontFamily: FONTS.uiBold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: t.textFaint, fontFamily: FONTS.ui },
  appleBtn: { height: 50 },
});
