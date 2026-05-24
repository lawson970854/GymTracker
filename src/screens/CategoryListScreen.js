import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Alert, StyleSheet, SafeAreaView,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGymData, addCategory as dbAddCategory, deleteCategory as dbDeleteCategory } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { useTheme } from '../ThemeContext';

export default function CategoryListScreen({ navigation }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const categories = data?.categories || [];

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const addMutation = useMutation({
    mutationFn: dbAddCategory,
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        categories: [...(old?.categories || []), { id: 'temp_' + Date.now(), name, items: [] }],
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
    mutationFn: dbDeleteCategory,
    onMutate: async (catId) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        categories: (old?.categories || []).filter(c => c.id !== catId),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('删除失败', '请检查网络连接');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const addCategory = () => {
    const name = newName.trim();
    if (!name) return;
    setNewName('');
    setAdding(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate(name);
  };

  const deleteCategory = (cat) => {
    Alert.alert('删除分类', `确认删除分类「${cat.name}」？（不会删除器械和记录）`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteMutation.mutate(cat.id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          contentContainerStyle={categories.length === 0 && s.emptyContainer}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={s.deleteAction}
                  onPress={() => deleteCategory(item)}
                  accessibilityLabel={`删除${item.name}`}
                  accessibilityRole="button"
                >
                  <Text style={s.deleteActionText}>删除</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate('Category', { categoryId: item.id, categoryName: item.name })}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                accessibilityHint="进入分类详情"
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.catName}>{item.name}</Text>
                  <Text style={s.catSub}>{item.items?.length || 0} 个器械</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
              </TouchableOpacity>
            </Swipeable>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>还没有分类{'\n'}点下方按钮新建</Text>
          }
        />
        {adding ? (
          <View style={s.addRow}>
            <TextInput
              style={s.addInput}
              placeholder="分类名称，如：胸推"
              placeholderTextColor={theme.textFaint}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={addCategory}
              accessibilityLabel="分类名称"
            />
            <TouchableOpacity style={s.confirmBtn} onPress={addCategory} accessibilityRole="button">
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
            accessibilityLabel="新建分类"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="add" size={20} color="#fff" accessible={false} />
              <Text style={s.addBtnText}>新建分类</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
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
  catName: { fontSize: 17, fontWeight: '600', color: t.textPrimary, marginBottom: 3 },
  catSub: { fontSize: 13, color: t.accent },
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
