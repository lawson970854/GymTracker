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
import { useTranslation } from 'react-i18next';

const LAST_METHOD_KEY = '@gymtracker:lastAuthMethod';
const DANGER = '#E5484D';

export default function AuthScreen({ onSkip }) {
  const { t: tr } = useTranslation();
  const { theme: t, isDark } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [lastMethod, setLastMethod] = useState(null);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [resent, setResent] = useState(false);

  const passwordRef = useRef(null);
  const password2Ref = useRef(null);

  // 两次密码都填了才提示不一致，避免边打字边报错
  const mismatch = !isLogin && password2.length > 0 && password !== password2;

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
      if (!credential.identityToken) throw new Error(tr('auth.appleTokenMissing'));

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) Alert.alert(tr('auth.signInFailed'), error.message);
      else rememberMethod('apple');
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(tr('auth.signInFailed'), e.message || tr('auth.retry'));
      }
    }
  };

  const handleAuth = async () => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) return Alert.alert(tr('auth.notice'), tr('auth.needEmailPassword'));
    if (p.length < 6) return Alert.alert(tr('auth.notice'), tr('auth.passwordTooShort'));
    if (!isLogin && p !== password2.trim()) {
      return Alert.alert(tr('auth.notice'), tr('auth.passwordMismatch'));
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
        if (error) Alert.alert(tr('auth.signInFailed'), error.message);
        else rememberMethod('email');
      } else {
        const { data, error } = await supabase.auth.signUp({ email: e, password: p });
        if (error) {
          Alert.alert(tr('auth.signUpFailed'), error.message);
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
    if (error) Alert.alert(tr('auth.sendFailed'), error.message);
    else {
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    }
  };

  const backToLogin = () => {
    setPendingEmail(null);
    setPassword('');
    setPassword2('');
    setIsLogin(true);
  };

  const handleForgotPassword = () => {
    const e = email.trim();
    if (!e) return Alert.alert(tr('auth.notice'), tr('auth.needEmailFirst'));
    Alert.alert(
      tr('auth.resetTitle'),
      tr('auth.resetMessage', { email: e }),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('auth.send'),
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(e);
            if (error) Alert.alert(tr('auth.sendFailed'), error.message);
            else Alert.alert(tr('auth.sentTitle'), tr('auth.sentMessage'));
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      {onSkip && (
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel={tr('common.close')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={26} color={t.textMuted} />
        </TouchableOpacity>
      )}
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
              <Text style={s.title}>{tr('auth.verifyTitle')}</Text>
              <Text style={s.subtitle}>
                {tr('auth.verifySentTo')}{'\n'}
                <Text style={s.pendingEmail}>{pendingEmail}</Text>
              </Text>

              <View style={s.steps}>
                <Text style={s.stepLine}>{tr('auth.step1')}</Text>
                <Text style={s.stepLine}>{tr('auth.step2')}</Text>
                <Text style={s.stepLine}>{tr('auth.step3')}</Text>
              </View>

              <Text style={s.hint}>{tr('auth.spamHint')}</Text>

              <TouchableOpacity
                style={s.btn}
                onPress={handleResend}
                accessibilityRole="button"
                accessibilityLabel={tr('auth.resend')}
              >
                <Text style={s.btnText}>{resent ? tr('auth.resent') : tr('auth.resend')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={backToLogin}
                accessibilityRole="button"
                accessibilityLabel={tr('auth.backToLoginA11y')}
                style={s.switchRow}
              >
                <Text style={s.switchText}>
                  {tr('auth.verifiedPrompt')}{'  '}<Text style={s.switchLink}>{tr('auth.loginLink')}</Text>
                </Text>
              </TouchableOpacity>

            </>
          ) : (
          <>
          {/* 大标题随登录/注册模式切换，用强对比取代小字提示 */}
          <Text style={s.title}>{isLogin ? tr('auth.welcomeBack') : tr('auth.createAccount')}</Text>
          <Text style={s.subtitle}>{tr('auth.subtitleLogin')}</Text>

          {appleAvailable && (
            <View style={s.appleWrap}>
              {lastMethod === 'apple' && (
                <View style={s.lastUsedBadge}>
                  <Text style={s.lastUsedText}>{tr('auth.lastUsed')}</Text>
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
              <Text style={s.dividerText}>{tr('auth.or')}</Text>
              <View style={s.dividerLine} />
            </View>
          )}

          <View style={s.fieldWrap}>
            {lastMethod === 'email' && (
              <View style={s.lastUsedBadgeInline}>
                <Text style={s.lastUsedText}>{tr('auth.lastUsed')}</Text>
              </View>
            )}
            <Text style={s.label}>{tr('auth.email')}</Text>
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
              accessibilityLabel={tr('auth.emailA11y')}
            />
          </View>

          <View style={s.fieldWrap}>
            <View style={s.labelRow}>
              <Text style={s.label}>{tr('auth.password')}</Text>
              {isLogin && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  accessibilityRole="button"
                  accessibilityLabel={tr('auth.forgotPasswordA11y')}
                >
                  <Text style={s.forgotText}>{tr('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={s.passwordInput}
                placeholder={tr('auth.passwordPlaceholder')}
                placeholderTextColor={t.textFaint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType={isLogin ? 'password' : 'newPassword'}
                returnKeyType={isLogin ? 'done' : 'next'}
                onSubmitEditing={() => isLogin ? handleAuth() : password2Ref.current?.focus()}
                accessibilityLabel={tr('auth.password')}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                accessibilityLabel={showPassword ? tr('auth.hidePassword') : tr('auth.showPassword')}
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

          {!isLogin && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>{tr('auth.confirmPassword')}</Text>
              <View style={[s.passwordRow, mismatch && s.inputError]}>
                <TextInput
                  ref={password2Ref}
                  style={s.passwordInput}
                  placeholder={tr('auth.confirmPasswordPlaceholder')}
                  placeholderTextColor={t.textFaint}
                  value={password2}
                  onChangeText={setPassword2}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                  accessibilityLabel={tr('auth.confirmPassword')}
                />
                {password2.length > 0 && (
                  <View style={s.eyeBtn}>
                    <Ionicons
                      name={mismatch ? 'close-circle' : 'checkmark-circle'}
                      size={20}
                      color={mismatch ? DANGER : t.accent}
                    />
                  </View>
                )}
              </View>
              {mismatch && <Text style={s.errorText}>{tr('auth.passwordMismatch')}</Text>}
            </View>
          )}

          <TouchableOpacity
            style={s.btn}
            onPress={handleAuth}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isLogin ? tr('auth.login') : tr('auth.signup')}
          >
            {loading
              ? <ActivityIndicator color={t.onAccent} />
              : <Text style={s.btnText}>{isLogin ? tr('auth.login') : tr('auth.signup')}</Text>
            }
          </TouchableOpacity>

          {/* 底部切换：没有账号的人明确看到"去注册"，而不是靠上方小字猜 */}
          <TouchableOpacity
            onPress={() => { setIsLogin(!isLogin); setPassword2(''); }}
            accessibilityRole="button"
            accessibilityLabel={isLogin ? tr('auth.noAccountA11y') : tr('auth.hasAccountA11y')}
            style={s.switchRow}
          >
            {/* 原来写的是「没有账号？去注册」，把「去注册」用颜色劈成两半，
                看起来像一个词被切开，加间距也救不回来。现在链接本身就是完整
                的词。间隔用 JSX 插入而不是写在文案末尾 —— 行尾空格是隐形的，
                容易在后续编辑里丢掉。 */}
            <Text style={s.switchText}>
              {isLogin ? tr('auth.noAccount') : tr('auth.hasAccount')}
              {'  '}
              <Text style={s.switchLink}>{isLogin ? tr('auth.signupLink') : tr('auth.loginLink')}</Text>
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
  // 绝对定位，压在 ScrollView 上层，滚动时不跟着走
  closeBtn: {
    position: 'absolute', top: 8, left: 14, zIndex: 10,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
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
    // marginBottom 原本挂在它下面那行本机提示上，那行已删，间距挪到这里
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
  inputError: { borderColor: DANGER },
  errorText: { fontSize: 12.5, color: DANGER, fontFamily: FONTS.ui, marginTop: 7 },
  pendingEmail: { color: t.textPrimary, fontFamily: FONTS.uiBold },
  steps: {
    backgroundColor: t.card, borderRadius: RADIUS.btn,
    borderWidth: 1, borderColor: t.border,
    paddingVertical: 16, paddingHorizontal: 18, gap: 10,
  },
  stepLine: { fontSize: 14, color: t.textPrimary, fontFamily: FONTS.ui, lineHeight: 20 },
  hint: { fontSize: 13, color: t.textMuted, fontFamily: FONTS.ui, marginTop: 14, textAlign: 'center' },
  switchRow: { marginTop: 22, alignItems: 'center' },
  // 主题色 = 可点击。全 App 的链接（忘记密码、去注册、编辑资料）都是这个色，
  // 这里原本用的是正文色 textMuted，是唯一一个「可点却不像可点」的破例。
  switchText: { fontSize: 14, color: t.textMuted, fontFamily: FONTS.ui },
  switchLink: { color: t.accentInk, fontFamily: FONTS.uiBold },
});
