import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';

// 通用重命名弹窗：传入当前名称和回调，即可让用户修改任何"名称"字段
export default function RenameModal({ visible, title = '重命名', initialValue = '', onCancel, onConfirm }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [value, setValue] = useState(initialValue);

  // 每次打开都用最新的 initialValue 重置（避免用上次的旧值）
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        <View style={s.card}>
          <Text style={s.title}>{title}</Text>
          <TextInput
            style={s.input}
            value={value}
            onChangeText={setValue}
            placeholderTextColor={theme.textFaint}
            autoFocus
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
              <Text style={s.confirmText}>确认</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(10,9,8,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 400, backgroundColor: t.card,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: t.border,
    padding: 22,
  },
  title: { fontSize: 16, fontFamily: FONTS.uiBold, color: t.textPrimary, marginBottom: 14 },
  input: {
    fontSize: 16, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: t.card2,
    borderRadius: RADIUS.input,
    borderWidth: 1, borderColor: t.border,
    color: t.textPrimary, fontFamily: FONTS.ui,
  },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  cancelBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14 },
  cancelText: { color: t.textMuted, fontSize: 14, fontFamily: FONTS.ui },
  confirmBtn: {
    backgroundColor: t.accent, borderRadius: 10,
    paddingHorizontal: 18, minHeight: 40, justifyContent: 'center',
  },
  confirmText: { color: t.onAccent, fontFamily: FONTS.uiBold, fontSize: 14 },
});
