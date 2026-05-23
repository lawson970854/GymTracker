import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';

const REP_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1); // 1-50次

function RepPicker({ value, onChange }) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity style={s.repBtn} onPress={() => setVisible(true)}>
        <Text style={s.repVal}>{value}</Text>
        <Text style={s.arrow}>▾</Text>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        {/* 背景遮罩单独一层，不包裹 picker box，避免拦截 FlatList 滚动手势 */}
        <View style={s.modalRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setVisible(false)}
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
                >
                  <Text style={[s.optionText, item === value && s.optionTextSelected]}>
                    {item}
                  </Text>
                  {item === value && <Text style={s.check}>✓</Text>}
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
          <TouchableOpacity style={s.btn} onPress={removeSet}>
            <Text style={s.btnText}>－</Text>
          </TouchableOpacity>
          <Text style={s.setCount}>{sets.length} 组</Text>
          <TouchableOpacity style={s.btn} onPress={addSet}>
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

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 15, fontWeight: '600', color: '#333' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#E8F8F1', justifyContent: 'center', alignItems: 'center',
  },
  btnText: { fontSize: 18, color: '#1D9E75', fontWeight: '700' },
  setCount: { fontSize: 15, fontWeight: '600', color: '#333', minWidth: 32, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  setLabel: { width: 52, fontSize: 14, color: '#666' },
  repBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  repVal: { fontSize: 16, fontWeight: '600', color: '#333' },
  arrow: { fontSize: 14, color: '#999' },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBox: {
    backgroundColor: '#fff', borderRadius: 16,
    width: 260, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  pickerTitle: {
    fontSize: 15, fontWeight: '700', color: '#333',
    textAlign: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  option: {
    height: 48, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderColor: '#F5F5F5',
  },
  optionSelected: { backgroundColor: '#E8F8F1' },
  optionText: { fontSize: 16, color: '#444' },
  optionTextSelected: { color: '#1D9E75', fontWeight: '700' },
  check: { fontSize: 16, color: '#1D9E75' },
});
