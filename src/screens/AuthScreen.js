import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, useColorScheme, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { LIGHT, DARK } from '../ThemeContext';

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const t = colorScheme === 'dark' ? DARK : LIGHT;

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
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.inner}>
          <Text style={s.logo} accessible={false}>💪</Text>
          <Text style={[s.title, { color: t.textPrimary }]}>GymTracker</Text>
          <Text style={[s.subtitle, { color: t.textMuted }]}>{isLogin ? '登录账号' : '创建账号'}</Text>

          <TextInput
            style={[s.input, { backgroundColor: t.card, color: t.textPrimary }]}
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

          <View style={[s.passwordRow, { backgroundColor: t.card }]}>
            <TextInput
              ref={passwordRef}
              style={[s.passwordInput, { color: t.textPrimary }]}
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
            style={[s.btn, { backgroundColor: t.accent }]}
            onPress={handleAuth}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isLogin ? '登录' : '注册'}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>{isLogin ? '登录' : '注册'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            accessibilityRole="button"
            accessibilityLabel={isLogin ? '没有账号，点此注册' : '已有账号，点此登录'}
          >
            <Text style={[s.toggle, { color: t.accent }]}>
              {isLogin ? '没有账号？点此注册' : '已有账号？点此登录'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 36 },
  input: {
    borderRadius: 12, padding: 16,
    fontSize: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  passwordInput: { flex: 1, padding: 16, fontSize: 16 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 16 },
  btn: {
    borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggle: { fontSize: 14, textAlign: 'center', textDecorationLine: 'underline' },
});
