import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Alert, StyleSheet, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { loadData, saveData, uid } from '../storage';

export default function CategoryListScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData().then(d => setCategories(d.categories || []));
  }, []));

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    const data = await loadData();
    data.categories = data.categories || [];
    data.categories.push({ id: uid(), name, items: [] });
    await saveData(data);
    setCategories(data.categories);
    setNewName('');
    setAdding(false);
  };

  const deleteCategory = (cat) => {
    Alert.alert('删除分类', `确认删除分类「${cat.name}」？（不会删除器械和记录）`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          const data = await loadData();
          data.categories = data.categories.filter(c => c.id !== cat.id);
          await saveData(data);
          setCategories(data.categories);
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
                <TouchableOpacity style={s.deleteAction} onPress={() => deleteCategory(item)}>
                  <Text style={s.deleteActionText}>删除</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate('Category', { categoryId: item.id, categoryName: item.name })}
              >
                <View>
                  <Text style={s.catName}>{item.name}</Text>
                  <Text style={s.catSub}>{item.items?.length || 0} 个器械</Text>
                </View>
                <Text style={s.chevron}>›</Text>
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
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addCategory}
            />
            <TouchableOpacity style={s.confirmBtn} onPress={addCategory}>
              <Text style={s.confirmText}>确认</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAdding(false); setNewName(''); }}>
              <Text style={s.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.addBtn} onPress={() => setAdding(true)}>
            <Text style={s.addBtnText}>＋ 新建分类</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  container: { flex: 1, padding: 16 },
  deleteAction: {
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
    width: 72, marginBottom: 10, borderRadius: 12,
  },
  deleteActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  catName: { fontSize: 17, fontWeight: '600', color: '#222', marginBottom: 3 },
  catSub: { fontSize: 13, color: '#1D9E75' },
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
