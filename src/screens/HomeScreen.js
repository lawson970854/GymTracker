import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Alert, StyleSheet, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { loadData, saveData, uid } from '../storage';

export default function HomeScreen({ navigation }) {
  const [gyms, setGyms] = useState([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData().then(d => setGyms(d.gyms));
  }, []));

  const addGym = async () => {
    const name = newName.trim();
    if (!name) return;
    const data = await loadData();
    data.gyms.push({ id: uid(), name });
    await saveData(data);
    setGyms(data.gyms);
    setNewName('');
    setAdding(false);
  };

  const deleteGym = (gym) => {
    Alert.alert('删除健身房', `确认删除「${gym.name}」及其所有记录？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          const data = await loadData();
          data.gyms = data.gyms.filter(g => g.id !== gym.id);
          data.records = data.records.filter(r => r.gymId !== gym.id);
          await saveData(data);
          setGyms(data.gyms);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.sectionTitle}>我的健身房</Text>

        <FlatList
          data={gyms}
          keyExtractor={g => g.id}
          contentContainerStyle={gyms.length === 0 && s.emptyContainer}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity style={s.deleteAction} onPress={() => deleteGym(item)}>
                  <Text style={s.deleteActionText}>删除</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={s.gymCard}
                onPress={() => navigation.navigate('Gym', { gymId: item.id, gymName: item.name })}
              >
                <Text style={s.gymName}>{item.name}</Text>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            </Swipeable>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>还没有健身房{'\n'}点下方按钮添加一个</Text>
          }
        />

        {adding ? (
          <View style={s.addRow}>
            <TextInput
              style={s.addInput}
              placeholder="健身房名称"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addGym}
            />
            <TouchableOpacity style={s.confirmBtn} onPress={addGym}>
              <Text style={s.confirmText}>确认</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAdding(false); setNewName(''); }}>
              <Text style={s.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.addBtn} onPress={() => setAdding(true)}>
            <Text style={s.addBtnText}>＋ 添加健身房</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 10, letterSpacing: 0.5 },
  deleteAction: {
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
    width: 72, marginBottom: 10, borderRadius: 12,
  },
  deleteActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  gymCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  gymName: { flex: 1, fontSize: 17, fontWeight: '500', color: '#222' },
  chevron: { fontSize: 22, color: '#CCC' },
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
