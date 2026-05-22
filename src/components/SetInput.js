import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function SetInput({ sets, onChange }) {
  const updateRep = (idx, val) => {
    const next = [...sets];
    next[idx] = parseInt(val) || 0;
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
          <TextInput
            style={s.input}
            keyboardType="number-pad"
            value={String(rep)}
            onChangeText={v => updateRep(i, v)}
            selectTextOnFocus
          />
          <Text style={s.unit}>次</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '600', color: '#333' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#E8F8F1', justifyContent: 'center', alignItems: 'center',
  },
  btnText: { fontSize: 18, color: '#1D9E75', fontWeight: '700' },
  setCount: { fontSize: 15, fontWeight: '600', color: '#333', minWidth: 32, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  setLabel: { width: 52, fontSize: 14, color: '#666' },
  input: {
    flex: 1,
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 16, textAlign: 'center',
    backgroundColor: '#FAFAFA',
  },
  unit: { width: 28, fontSize: 14, color: '#666', textAlign: 'right' },
});
