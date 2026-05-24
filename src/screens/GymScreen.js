import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Alert, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGymData, addMachine as dbAddMachine, deleteMachine as dbDeleteMachine, getBestRecord } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { useTheme } from '../ThemeContext';

export default function GymScreen({ navigation, route }) {
  const { gymId, gymName } = route.params;
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });

  const gym = data?.gyms?.find(g => g.id === gymId);
  const machines = gym?.machines || [];
  const records = data?.records || [];

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const addMutation = useMutation({
    mutationFn: (name) => dbAddMachine(gymId, name),
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        gyms: (old?.gyms || []).map(g =>
          g.id === gymId
            ? { ...g, machines: [...(g.machines || []), { id: 'temp_' + Date.now(), name }] }
            : g
        ),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('添加失败', '请检查网络连接');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: dbDeleteMachine,
    onMutate: async (machineId) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        gyms: (old?.gyms || []).map(g =>
          g.id === gymId
            ? { ...g, machines: (g.machines || []).filter(m => m.id !== machineId) }
            : g
        ),
        records: (old?.records || []).filter(r => r.machineId !== machineId),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('删除失败', '请检查网络连接');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const addMachine = () => {
    const name = newName.trim();
    if (!name) return;
    setNewName('');
    setAdding(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate(name);
  };

  const deleteMachine = (machine) => {
    Alert.alert('删除器械', `确认删除「${machine.name}」及其所有记录？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteMutation.mutate(machine.id);
        },
      },
    ]);
  };

  const bestFor = (machineId) => {
    const best = getBestRecord(records, gymId, machineId);
    if (!best) return '暂无记录';
    return `最佳 ${best.volume} 千克·次`;
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
        <View style={s.container}>
          <FlatList
            data={machines}
            keyExtractor={m => m.id}
            contentContainerStyle={machines.length === 0 && s.emptyContainer}
            renderItem={({ item }) => (
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity
                    style={s.deleteAction}
                    onPress={() => deleteMachine(item)}
                    accessibilityLabel={`删除${item.name}`}
                    accessibilityRole="button"
                  >
                    <Text style={s.deleteActionText}>删除</Text>
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity
                  style={s.card}
                  onPress={() => navigation.navigate('Machine', {
                    gymId, gymName, machineId: item.id, machineName: item.name,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityHint="进入器械训练记录"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.machineName}>{item.name}</Text>
                    <Text style={s.best}>{bestFor(item.id)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
                </TouchableOpacity>
              </Swipeable>
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
                placeholderTextColor={theme.textFaint}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={addMachine}
                accessibilityLabel="器械名称"
              />
              <TouchableOpacity style={s.confirmBtn} onPress={addMachine} accessibilityRole="button">
                <Text style={s.confirmText}>确认</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setAdding(false); setNewName(''); }} accessibilityRole="button" accessibilityLabel="取消">
                <Text style={s.cancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => setAdding(true)}
              accessibilityRole="button"
              accessibilityLabel="添加器械"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="add" size={20} color="#fff" accessible={false} />
              <Text style={s.addBtnText}>添加器械</Text>
            </View>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  container: { flex: 1, padding: 16 },
  deleteAction: {
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
    width: 72, marginBottom: 10,
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
  },
  deleteActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: t.card, borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  machineName: { fontSize: 16, fontWeight: '600', color: t.textPrimary, marginBottom: 3 },
  best: { fontSize: 13, color: t.accent },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: t.textFaint, fontSize: 15, lineHeight: 24, marginTop: 60 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: t.card, borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 4, color: t.textPrimary },
  confirmBtn: {
    backgroundColor: t.accent, borderRadius: 8,
    paddingHorizontal: 14, minHeight: 44, justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  cancelText: { color: t.textMuted, fontSize: 14 },
  addBtn: {
    backgroundColor: t.accent, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
