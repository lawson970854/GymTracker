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
import { fetchGymData, addGym as dbAddGym, deleteGym as dbDeleteGym, updateGymName as dbUpdateGymName } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { useTheme } from '../ThemeContext';
import RenameModal from '../components/RenameModal';

export default function HomeScreen({ navigation }) {
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const gyms = data?.gyms || [];

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [renamingGym, setRenamingGym] = useState(null);

  const addMutation = useMutation({
    mutationFn: dbAddGym,
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        gyms: [...(old?.gyms || []), { id: 'temp_' + Date.now(), name, machines: [] }],
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
    mutationFn: dbDeleteGym,
    onMutate: async (gymId) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        gyms: (old?.gyms || []).filter(g => g.id !== gymId),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('删除失败', '请检查网络连接');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => dbUpdateGymName(id, name),
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        gyms: (old?.gyms || []).map(g => g.id === id ? { ...g, name } : g),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('重命名失败', '请检查网络连接');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const addGym = () => {
    const name = newName.trim();
    if (!name) return;
    setNewName('');
    setAdding(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate(name);
  };

  const deleteGym = (gym) => {
    Alert.alert('删除健身房', `确认删除「${gym.name}」及其所有记录？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteMutation.mutate(gym.id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
        <View style={s.container}>
          <Text style={s.sectionTitle}>我的健身房</Text>
          <FlatList
            data={gyms}
            keyExtractor={g => g.id}
            contentContainerStyle={gyms.length === 0 && s.emptyContainer}
            renderItem={({ item }) => (
              <Swipeable
                renderRightActions={() => (
                  <View style={s.swipeActions}>
                    <TouchableOpacity
                      style={s.editAction}
                      onPress={() => setRenamingGym(item)}
                      accessibilityLabel={`重命名${item.name}`}
                      accessibilityRole="button"
                    >
                      <Text style={s.editActionText}>编辑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.deleteAction}
                      onPress={() => deleteGym(item)}
                      accessibilityLabel={`删除${item.name}`}
                      accessibilityRole="button"
                    >
                      <Text style={s.deleteActionText}>删除</Text>
                    </TouchableOpacity>
                  </View>
                )}
              >
                <TouchableOpacity
                  style={s.gymCard}
                  onPress={() => navigation.navigate('Gym', { gymId: item.id, gymName: item.name })}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityHint="进入健身房详情"
                >
                  <Text style={s.gymName}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
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
                placeholderTextColor={theme.textFaint}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={addGym}
                accessibilityLabel="健身房名称"
              />
              <TouchableOpacity style={s.confirmBtn} onPress={addGym} accessibilityRole="button">
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
              accessibilityLabel="添加健身房"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="add" size={20} color="#fff" accessible={false} />
              <Text style={s.addBtnText}>添加健身房</Text>
            </View>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <RenameModal
        visible={!!renamingGym}
        title="重命名健身房"
        initialValue={renamingGym?.name || ''}
        onCancel={() => setRenamingGym(null)}
        onConfirm={(name) => {
          if (renamingGym && name !== renamingGym.name) {
            renameMutation.mutate({ id: renamingGym.id, name });
          }
          setRenamingGym(null);
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: t.textMuted, marginBottom: 10, letterSpacing: 0.5 },
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
  gymCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  gymName: { flex: 1, fontSize: 17, fontWeight: '500', color: t.textPrimary },
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
