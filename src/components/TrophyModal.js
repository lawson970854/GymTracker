import React, { useEffect, useRef, useMemo } from 'react';
import { Modal, View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';

export default function TrophyModal({ visible, type, onClose }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const scale = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0);
    bounce.setValue(0);

    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, { toValue: -12, duration: 300, useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ),
    ]).start();

    const timer = setTimeout(onClose, 2800);
    return () => clearTimeout(timer);
  }, [visible]);

  const isGold = type === 'gold';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={s.overlay}
        onPress={onClose}
        activeOpacity={1}
        accessibilityLabel={isGold ? '历史最高记录，点击关闭' : '今日最佳，点击关闭'}
        accessibilityRole="button"
      >
        <Animated.View style={[s.card, { transform: [{ scale }, { translateY: bounce }] }]}>
          <Text style={s.emoji} accessible={false}>{isGold ? '🏆' : '🥈'}</Text>
          <Text style={s.title}>{isGold ? '历史最高记录！' : '今日最佳！'}</Text>
          <Text style={s.sub}>{isGold ? '突破个人记录，太厉害了！' : '超越今日之前成绩！'}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: t.card,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 240,
  },
  emoji: { fontSize: 72, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: t.textPrimary, marginBottom: 6 },
  sub: { fontSize: 15, color: t.textMuted, textAlign: 'center' },
});
