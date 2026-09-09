import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, SafeAreaView, ScrollView,
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
  const [pendingEmail, setPendingEmail] = useState(null);
  const [resent, setResent] = useState(false);

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
        const { data, error } = await supabase.auth.signUp({ email: e, password: p });
        if (error) {
          Alert.alert('注册失败', error.message);
        } else {
          rememberMethod('email');
          // 关闭邮箱验证时 signUp 直接返回会话，App.js 会自动进入主界面；
          // 开启验证时没有会话，切到"去收邮件"的页面状态，而不是弹个提示框了事。
          if (!data.session) setPendingEmail(e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    if (error) Alert.alert('发送失败', error.message);
    else {
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    }
  };

  const backToLogin = () => {
    setPendingEmail(null);
    setPassword('');
    setIsLogin(true);
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
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoShadow}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={s.logoImage}
              accessibilityIgnoresInvertColors
            />
          </View>

          {pendingEmail ? (
            <>
              <Text style={s.title}>去邮箱完成验证</Text>
              <Text style={s.subtitle}>
                验证邮件已发送到{'\n'}
                <Text style={s.pendingEmail}>{pendingEmail}</Text>
              </Text>

              <View style={s.steps}>
                <Text style={s.stepLine}>1. 打开邮箱，找到「铁记」的验证邮件</Text>
                <Text style={s.stepLine}>2. 点击邮件里的确认链接</Text>
                <Text style={s.stepLine}>3. 回到这里，用刚才的邮箱和密码登录</Text>
              </View>

              <Text style={s.hint}>没收到？先看看垃圾邮件文件夹。</Text>

              <TouchableOpacity
                style={s.btn}
                onPress={handleResend}
                accessibilityRole="button"
                accessibilityLabel="重新发送验证邮件"
              >
                <Text style={s.btnText}>{resent ? '已重新发送' : '重新发送验证邮件'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={backToLogin}
                accessibilityRole="button"
                accessibilityLabel="返回登录"
                style={s.switchRow}
              >
                <Text style={s.switchText}>
                  已经验证好了？<Text style={s.switchLink}> 去登录</Text>
                </Text>
              </TouchableOpacity>
            </>
          ) : (
          <>
          {/* 大标题随登录/注册模式切换，用强对比取代小字提示 */}
          <Text style={s.title}>{isLogin ? '欢迎回来' : '创建你的账号'}</Text>
          <Text style={s.subtitle}>
            {isLogin ? '登录铁记，继续记录你的训练' : '注册铁记，开始记录你的训练'}
          </Text>

          {appleAvailable && (
            <View style={s.appleWrap}>
              {lastMethod === 'apple' && (
                <View style={s.lastUsedBadge}>
                  <Text style={s.lastUsedText}>上次使用</Text>
                </View>
              )}
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={isLogin
                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                buttonStyle={isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={RADIUS.btn}
                style={s.appleBtn}
                onPress={handleAppleSignIn}
              />
            </View>
          )}

          {appleAvailable && (
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>或</Text>
              <View style={s.dividerLine} />
            </View>
          )}

          <View style={s.fieldWrap}>
            {lastMethod === 'email' && (
              <View style={s.lastUsedBadgeInline}>
                <Text style={s.lastUsedText}>上次使用</Text>
              </View>
            )}
            <Text style={s.label}>邮箱</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
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
          </View>

          <View style={s.fieldWrap}>
            <View style={s.labelRow}>
              <Text style={s.label}>密码</Text>
              {isLogin && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  accessibilityRole="button"
                  accessibilityLabel="忘记密码"
                >
                  <Text style={s.forgotText}>忘记密码？</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={s.passwordInput}
                placeholder="至少 6 位"
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

          {/* 底部切换：没有账号的人明确看到"去注册"，而不是靠上方小字猜 */}
          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            accessibilityRole="button"
            accessibilityLabel={isLogin ? '没有账号，去注册' : '已有账号，去登录'}
            style={s.switchRow}
          >
            <Text style={s.switchText}>
              {isLogin ? '没有账号？' : '已有账号？'}
              <Text style={s.switchLink}>{isLogin ? ' 去注册' : ' 去登录'}</Text>
            </Text>
          </TouchableOpacity>
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 34, paddingVertical: 40 },
  // 阴影和圆角拆到两层：iOS 上同一个 Image 同时设圆角裁剪和阴影会互相冲突
  logoShadow: {
    alignSelf: 'center', marginBottom: 24, borderRadius: 18,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 }, elevation: 6,
  },
  logoImage: { width: 76, height: 76, borderRadius: 18 },
  title: {
    fontSize: 28, fontFamily: FONTS.numBold, color: t.textPrimary,
    textAlign: 'center', letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14, textAlign: 'center', color: t.textMuted,
    marginTop: 8, marginBottom: 32, fontFamily: FONTS.ui,
  },
  appleWrap: { position: 'relative' },
  appleBtn: { height: 50 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: t.textFaint, fontFamily: FONTS.ui },
  lastUsedBadge: {
    position: 'absolute', top: -10, right: 8, zIndex: 1,
    backgroundColor: t.accent, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  lastUsedBadgeInline: {
    position: 'absolute', top: -8, right: 0, zIndex: 1,
    backgroundColor: t.accent, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  lastUsedText: { color: t.onAccent, fontSize: 11, fontFamily: FONTS.uiBold },
  fieldWrap: { position: 'relative', marginBottom: 16 },
  label: { fontSize: 13, color: t.textMuted, fontFamily: FONTS.uiBold, marginBottom: 8 },
  labelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  forgotText: { fontSize: 13, color: t.accentInk, fontFamily: FONTS.uiBold },
  input: {
    height: 54, borderRadius: RADIUS.btn, paddingHorizontal: 16,
    backgroundColor: t.card,
    borderWidth: 1, borderColor: t.border,
    fontSize: 15, color: t.textPrimary,
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
  btn: {
    backgroundColor: t.accent, borderRadius: RADIUS.btn,
    height: 54, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  btnText: { color: t.onAccent, fontSize: 16, fontFamily: FONTS.uiBold },
  pendingEmail: { color: t.textPrimary, fontFamily: FONTS.uiBold },
  steps: {
    backgroundColor: t.card, borderRadius: RADIUS.btn,
    borderWidth: 1, borderColor: t.border,
    paddingVertical: 16, paddingHorizontal: 18, gap: 10,
  },
  stepLine: { fontSize: 14, color: t.textPrimary, fontFamily: FONTS.ui, lineHeight: 20 },
  hint: { fontSize: 13, color: t.textMuted, fontFamily: FONTS.ui, marginTop: 14, textAlign: 'center' },
  switchRow: { marginTop: 22, alignItems: 'center' },
  switchText: { fontSize: 14, color: t.textMuted, fontFamily: FONTS.ui },
  switchLink: { color: t.accentInk, fontFamily: FONTS.uiBold },
});
