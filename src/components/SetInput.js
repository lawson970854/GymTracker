import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';

const REP_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1);

function RepPicker({ value, onChange }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={s.repBtn}
        onPress={() => setVisible(true)}
        accessibilityLabel={`当前次数 ${value}，点击更改`}
        accessibilityRole="button"
      >
        <Text style={s.repVal}>{value}</Text>
        <Text style={s.arrow} accessible={false}>▾</Text>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={s.modalRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setVisible(false)}
            accessibilityLabel="关闭"
          />
          <View style={s.pickerBox}>
            <Text style={s.pickerTitle}>选择次数</Text>
            <FlatList
              data={REP_OPTIONS}
              keyExtractor={n => String(n)}
              style={{ maxHeight: 300 }}
              initialScrollIndex={Math.max(0, value - 1)}
              getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.option, item === value && s.optionSelected]}
                  onPress={() => { onChange(item); setVisible(false); }}
                  accessibilityLabel={`${item} 次`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item === value }}
                >
                  <Text style={[s.optionText, item === value && s.optionTextSelected]}>
                    {item}
                  </Text>
                  {item === value && <Text style={s.check} accessible={false}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function SetInput({ sets, onChange }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const updateRep = (idx, val) => {
    const next = [...sets];
    next[idx] = val;
    onChange(next);
  };

  const addSet = () => onChange([...sets, sets[sets.length - 1] || 10]);
  const removeSet = () => {
    if (sets.length > 1) onChange(sets.slice(0, -1));
  };

  return (
    <View>
      <View style={s.header}>
        <Text style={s.label}>每组次数</Text>
        <View style={s.counter}>
          <TouchableOpacity
            style={s.btn}
            onPress={removeSet}
            accessibilityLabel="减少一组"
            accessibilityRole="button"
          >
            <Text style={s.btnText}>－</Text>
          </TouchableOpacity>
          <Text style={s.setCount} accessibilityLabel={`共 ${sets.length} 组`}>{sets.length} 组</Text>
          <TouchableOpacity
            style={s.btn}
            onPress={addSet}
            accessibilityLabel="增加一组"
            accessibilityRole="button"
          >
            <Text style={s.btnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {sets.map((rep, i) => (
        <View key={i} style={s.row}>
          <Text style={s.setLabel}>第 {i + 1} 组</Text>
          <RepPicker value={rep} onChange={v => updateRep(i, v)} />
        </View>
      ))}
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 15, fontWeight: '600', color: t.textPrimary },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: t.accentBg, justifyContent: 'center', alignItems: 'center',
  },
  btnText: { fontSize: 20, color: t.accent, fontWeight: '700' },
  setCount: { fontSize: 15, fontWeight: '600', color: t.textPrimary, minWidth: 32, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  setLabel: { width: 52, fontSize: 14, color: t.textSecondary },
  repBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: t.border, borderRadius: 8,
    paddingHorizontal: 12, minHeight: 44,
    backgroundColor: t.input,
  },
  repVal: { fontSize: 16, fontWeight: '600', color: t.textPrimary },
  arrow: { fontSize: 14, color: t.textFaint },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBox: {
    backgroundColor: t.card, borderRadius: 16,
    width: 260, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  pickerTitle: {
    fontSize: 15, fontWeight: '700', color: t.textPrimary,
    textAlign: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderColor: t.border,
  },
  option: {
    height: 48, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderColor: t.borderAlt,
  },
  optionSelected: { backgroundColor: t.accentBg },
  optionText: { fontSize: 16, color: t.textSecondary },
  optionTextSelected: { color: t.accent, fontWeight: '700' },
  check: { fontSize: 16, color: t.accent },
});
