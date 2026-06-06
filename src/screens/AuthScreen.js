import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';

export default function AuthScreen() {
  const { theme: t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef(null);

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
          <Text style={s.title}>GymTracker</Text>
          <Text style={s.subtitle}>{isLogin ? '登录账号' : '创建账号'}</Text>

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

          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            accessibilityRole="button"
            accessibilityLabel={isLogin ? '没有账号，点此注册' : '已有账号，点此登录'}
          >
            <Text style={s.toggle}>
              {isLogin ? '没有账号？点此注册' : '已有账号？点此登录'}
            </Text>
          </TouchableOpacity>
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
  subtitle: { fontSize: 15, textAlign: 'center', color: t.textMuted, marginTop: 6, marginBottom: 36, fontFamily: FONTS.ui },
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
  toggle: { fontSize: 14, textAlign: 'center', color: t.accentInk, fontFamily: FONTS.uiBold },
});
