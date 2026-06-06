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
import { fetchGymData, addCategory as dbAddCategory, deleteCategory as dbDeleteCategory, updateCategoryName as dbUpdateCategoryName } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';
import RenameModal from '../components/RenameModal';

export default function CategoryListScreen({ navigation }) {
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const categories = data?.categories || [];

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [renamingCat, setRenamingCat] = useState(null);

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

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => dbUpdateCategoryName(id, name),
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        categories: (old?.categories || []).map(c => c.id === id ? { ...c, name } : c),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('重命名失败', '请检查网络连接');
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
      <View style={s.container}>
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          contentContainerStyle={categories.length === 0 && s.emptyContainer}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <View style={s.swipeActions}>
                  <TouchableOpacity
                    style={[s.swipeAct, s.swipeEdit]}
                    onPress={() => setRenamingCat(item)}
                    accessibilityLabel={`重命名${item.name}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="pencil" size={18} color="#fff" />
                    <Text style={s.swipeActText}>编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.swipeAct, s.swipeDel]}
                    onPress={() => deleteCategory(item)}
                    accessibilityLabel={`删除${item.name}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={s.swipeActText}>删除</Text>
                  </TouchableOpacity>
                </View>
              )}
            >
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate('Category', { categoryId: item.id, categoryName: item.name })}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                accessibilityHint="进入分类详情"
              >
                <View style={s.rowIcon}>
                  <Ionicons name="pricetag-outline" size={22} color={theme.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.catName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.catSub} numberOfLines={1}>{item.items?.length || 0} 个器械</Text>
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
      </KeyboardAvoidingView>

      <RenameModal
        visible={!!renamingCat}
        title="重命名分类"
        initialValue={renamingCat?.name || ''}
        onCancel={() => setRenamingCat(null)}
        onConfirm={(name) => {
          if (renamingCat && name !== renamingCat.name) {
            renameMutation.mutate({ id: renamingCat.id, name });
          }
          setRenamingCat(null);
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  container: { flex: 1, padding: 16 },
  swipeActions: { flexDirection: 'row', marginBottom: 10, gap: 9, paddingRight: 2 },
  swipeAct: {
    width: 64, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  swipeEdit: { backgroundColor: '#5B8DEF' },
  swipeDel: { backgroundColor: '#E5484D' },
  swipeActText: { color: '#fff', fontSize: 12, fontFamily: FONTS.uiBold, letterSpacing: 0.3 },
  card: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: t.border,
    padding: 16, paddingLeft: 18,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  rowIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: t.accentBg,
    alignItems: 'center', justifyContent: 'center',
  },
  catName: {
    fontSize: 16.5, fontFamily: FONTS.uiBold, color: t.textPrimary,
    marginBottom: 3, letterSpacing: -0.2,
  },
  catSub: {
    fontSize: 12.5, color: t.accentInk,
    fontFamily: FONTS.ui, fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: t.textFaint, fontSize: 15, lineHeight: 24, marginTop: 60, fontFamily: FONTS.ui },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: t.card,
    borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: t.border,
    padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 4, color: t.textPrimary, fontFamily: FONTS.ui },
  confirmBtn: {
    backgroundColor: t.accent, borderRadius: RADIUS.btn,
    paddingHorizontal: 18, minHeight: 44, justifyContent: 'center',
  },
  confirmText: { color: t.onAccent, fontFamily: FONTS.uiBold, fontSize: 14 },
  cancelBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  cancelText: { color: t.textMuted, fontSize: 14, fontFamily: FONTS.ui },
  addBtn: {
    backgroundColor: t.accent, borderRadius: RADIUS.btn,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  addBtnText: { color: t.onAccent, fontSize: 16, fontFamily: FONTS.uiBold },
});
