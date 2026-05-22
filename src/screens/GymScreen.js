import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Alert, StyleSheet, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadData, saveData, uid, getBestRecord } from '../storage';

export default function GymScreen({ navigation, route }) {
  const { gymId, gymName } = route.params;
  const [machines, setMachines] = useState([]);
  const [records, setRecords] = useState([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData().then(d => {
      const gym = d.gyms.find(g => g.id === gymId);
      setMachines(gym?.machines || []);
      setRecords(d.records);
    });
  }, [gymId]));

  const addMachine = async () => {
    const name = newName.trim();
    if (!name) return;
    const data = await loadData();
    const gym = data.gyms.find(g => g.id === gymId);
    if (!gym.machines) gym.machines = [];
    gym.machines.push({ id: uid(), name });
    await saveData(data);
    setMachines(gym.machines);
    setNewName('');
    setAdding(false);
  };

  const deleteMachine = (machine) => {
    Alert.alert('删除器械', `确认删除「${machine.name}」及其所有记录？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          const data = await loadData();
          const gym = data.gyms.find(g => g.id === gymId);
          gym.machines = gym.machines.filter(m => m.id !== machine.id);
          data.records = data.records.filter(r => r.machineId !== machine.id);
          await saveData(data);
          setMachines(gym.machines);
          setRecords(data.records);
        },
      },
    ]);
  };

  const bestFor = (machineId) => {
    const best = getBestRecord(records, gymId, machineId);
    if (!best) return '暂无记录';
    return `最佳 ${best.volume} kg·次`;
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.hint}>长按器械可删除</Text>

        <FlatList
          data={machines}
          keyExtractor={m => m.id}
          contentContainerStyle={machines.length === 0 && s.emptyContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('Machine', {
                gymId, gymName, machineId: item.id, machineName: item.name,
              })}
              onLongPress={() => deleteMachine(item)}
              delayLongPress={500}
            >
              <View>
                <Text style={s.machineName}>{item.name}</Text>
                <Text style={s.best}>{bestFor(item.id)}</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>还没有器械{'\n'}点下方按钮添加</Text>
          }
        />

        {adding ? (
          <View style={s.addRow}>
            <TextInput
              style={s.addInput}
              placeholder="器械名称，如：高位下拉"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addMachine}
            />
            <TouchableOpacity style={s.confirmBtn} onPress={addMachine}>
              <Text style={s.confirmText}>确认</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAdding(false); setNewName(''); }}>
              <Text style={s.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.addBtn} onPress={() => setAdding(true)}>
            <Text style={s.addBtnText}>＋ 添加器械</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  container: { flex: 1, padding: 16 },
  hint: { fontSize: 12, color: '#BBB', marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  machineName: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 3 },
  best: { fontSize: 13, color: '#1D9E75' },
  chevron: { fontSize: 22, color: '#CCC', marginLeft: 'auto' },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#BBB', fontSize: 15, lineHeight: 24, marginTop: 60 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 4 },
  confirmBtn: {
    backgroundColor: '#1D9E75', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  confirmText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelText: { color: '#999', fontSize: 14 },
  addBtn: {
    backgroundColor: '#1D9E75', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
