import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGymData, addMachine as dbAddMachine, deleteMachine as dbDeleteMachine, addCategory as dbAddCategory, updateMachineName as dbUpdateMachineName, getBestRecord } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { useTheme } from '../ThemeContext';
import RenameModal from '../components/RenameModal';

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
  const categories = data?.categories || [];

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [renamingMachine, setRenamingMachine] = useState(null);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const addMutation = useMutation({
    mutationFn: ({ name, categoryId }) => dbAddMachine(gymId, name, categoryId),
    onMutate: async ({ name }) => {
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

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => dbUpdateMachineName(id, name),
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        gyms: (old?.gyms || []).map(g =>
          g.id === gymId
            ? { ...g, machines: (g.machines || []).map(m => m.id === id ? { ...m, name } : m) }
            : g
        ),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('重命名失败', '请检查网络连接');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const addCategoryMutation = useMutation({
    mutationFn: dbAddCategory,
    onSuccess: (newCat) => {
      qc.invalidateQueries({ queryKey: GYM_DATA_KEY });
      setSelectedCategoryId(newCat.id);
      setNewCatName('');
      setPickerVisible(false);
    },
    onError: () => Alert.alert('新建分类失败', '请检查网络连接'),
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
    const categoryId = selectedCategoryId;
    setNewName('');
    setAdding(false);
    setSelectedCategoryId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate({ name, categoryId });
  };

  const cancelAdd = () => {
    setAdding(false);
    setNewName('');
    setSelectedCategoryId(null);
  };

  const submitNewCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addCategoryMutation.mutate(name);
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
                  <View style={s.swipeActions}>
                    <TouchableOpacity
                      style={s.editAction}
                      onPress={() => setRenamingMachine(item)}
                      accessibilityLabel={`重命名${item.name}`}
                      accessibilityRole="button"
                    >
                      <Text style={s.editActionText}>编辑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.deleteAction}
                      onPress={() => deleteMachine(item)}
                      accessibilityLabel={`删除${item.name}`}
                      accessibilityRole="button"
                    >
                      <Text style={s.deleteActionText}>删除</Text>
                    </TouchableOpacity>
                  </View>
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
            <View style={s.addCard}>
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
              <TouchableOpacity
                style={s.categoryChip}
                onPress={() => setPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="选择分类"
              >
                <Ionicons name="pricetag-outline" size={14} color={selectedCategory ? theme.accent : theme.textMuted} />
                <Text style={[s.categoryChipText, selectedCategory && { color: theme.accent }]}>
                  {selectedCategory ? selectedCategory.name : '归类到（可选）'}
                </Text>
                {selectedCategory && (
                  <TouchableOpacity onPress={() => setSelectedCategoryId(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={cancelAdd} accessibilityRole="button" accessibilityLabel="取消">
                  <Text style={s.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmBtn} onPress={addMachine} accessibilityRole="button">
                  <Text style={s.confirmText}>确认</Text>
                </TouchableOpacity>
              </View>
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

      {/* 分类选择 Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerVisible(false)} />
          <TouchableOpacity activeOpacity={1} style={s.modalCard} onPress={() => {}}>
            <Text style={s.modalTitle}>选择分类</Text>
            <FlatList
              data={categories}
              keyExtractor={c => c.id}
              style={{ maxHeight: 280 }}
              ListEmptyComponent={
                <Text style={s.modalEmpty}>还没有分类，下方新建一个</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalItem}
                  onPress={() => {
                    setSelectedCategoryId(item.id);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={s.modalItemText}>{item.name}</Text>
                  {selectedCategoryId === item.id && (
                    <Ionicons name="checkmark" size={18} color={theme.accent} />
                  )}
                </TouchableOpacity>
              )}
            />
            <View style={s.modalNewRow}>
              <TextInput
                style={s.modalInput}
                placeholder="+ 新建分类，如：杠铃卧推"
                placeholderTextColor={theme.textFaint}
                value={newCatName}
                onChangeText={setNewCatName}
                returnKeyType="done"
                onSubmitEditing={submitNewCategory}
              />
              <TouchableOpacity style={s.modalNewBtn} onPress={submitNewCategory}>
                <Text style={s.modalNewBtnText}>新建</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <RenameModal
        visible={!!renamingMachine}
        title="重命名器械"
        initialValue={renamingMachine?.name || ''}
        onCancel={() => setRenamingMachine(null)}
        onConfirm={(name) => {
          if (renamingMachine && name !== renamingMachine.name) {
            renameMutation.mutate({ id: renamingMachine.id, name });
          }
          setRenamingMachine(null);
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  container: { flex: 1, padding: 16 },
  swipeActions: { flexDirection: 'row', marginBottom: 10 },
  editAction: {
    backgroundColor: '#5B9BD5', justifyContent: 'center', alignItems: 'center',
    width: 64,
  },
  editActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteAction: {
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
    width: 64,
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
  addCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 12, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  addInput: {
    fontSize: 16, paddingVertical: 8, paddingHorizontal: 4,
    color: t.textPrimary,
    borderBottomWidth: 1, borderBottomColor: t.divider || 'rgba(0,0,0,0.08)',
  },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: t.bg,
    borderWidth: 1, borderColor: t.divider || 'rgba(0,0,0,0.1)',
  },
  categoryChipText: { fontSize: 13, color: t.textMuted },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  confirmBtn: {
    backgroundColor: t.accent, borderRadius: 8,
    paddingHorizontal: 18, minHeight: 40, justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12 },
  cancelText: { color: t.textMuted, fontSize: 14 },
  // 分类选择 Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxWidth: 400, backgroundColor: t.card, borderRadius: 14, padding: 18,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: t.textPrimary, marginBottom: 12 },
  modalEmpty: { textAlign: 'center', color: t.textFaint, fontSize: 14, paddingVertical: 18 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: t.divider || 'rgba(0,0,0,0.06)',
  },
  modalItemText: { fontSize: 15, color: t.textPrimary },
  modalNewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
  },
  modalInput: {
    flex: 1, fontSize: 14, paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: t.bg, borderRadius: 8, color: t.textPrimary,
  },
  modalNewBtn: {
    backgroundColor: t.accent, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  modalNewBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  addBtn: {
    backgroundColor: t.accent, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
