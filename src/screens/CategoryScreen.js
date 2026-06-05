import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, FlatList,
  StyleSheet, SafeAreaView, Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGymData, addCategoryItem, removeCategoryItem } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import InteractiveLineChart from '../components/InteractiveLineChart';
import { useTheme } from '../ThemeContext';

const W = Dimensions.get('window').width;

export default function CategoryScreen({ route }) {
  const { categoryId } = route.params;
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: gymData } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });

  const gyms = gymData?.gyms || [];
  const records = gymData?.records || [];
  const category = gymData?.categories?.find(c => c.id === categoryId) || null;

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pickerStep, setPickerStep] = useState('gym');
  const [pickerGym, setPickerGym] = useState(null);

  const removeMutation = useMutation({
    mutationFn: ({ gymId, machineId }) => removeCategoryItem(categoryId, gymId, machineId),
    onMutate: async ({ gymId, machineId }) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        categories: (old?.categories || []).map(c =>
          c.id === categoryId
            ? { ...c, items: c.items.filter(i => !(i.gymId === gymId && i.machineId === machineId)) }
            : c
        ),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('移除失败', '请检查网络连接');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const addMutation = useMutation({
    mutationFn: ({ gymId, machineId }) => addCategoryItem(categoryId, gymId, machineId),
    onMutate: async ({ gymId, machineId }) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        categories: (old?.categories || []).map(c =>
          c.id === categoryId
            ? { ...c, items: [...c.items, { gymId, machineId }] }
            : c
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

  const items = category?.items || [];

  const enrichedItems = items.map(item => {
    const gym = gyms.find(g => g.id === item.gymId);
    const machine = gym?.machines?.find(m => m.id === item.machineId);
    const recs = records.filter(r => r.gymId === item.gymId && r.machineId === item.machineId);
    const best = recs.length ? recs.reduce((b, r) => r.volume > b.volume ? r : b, recs[0]) : null;
    return { ...item, gymName: gym?.name || '?', machineName: machine?.name || '?', best, count: recs.length };
  });

  const allRecords = records.filter(r =>
    items.some(item => item.gymId === r.gymId && item.machineId === r.machineId)
  );

  const byDate = {};
  const byDateGyms = {};
  allRecords.forEach(r => {
    byDate[r.date] = (byDate[r.date] || 0) + r.volume;
    if (!byDateGyms[r.date]) byDateGyms[r.date] = new Set();
    const item = enrichedItems.find(i => i.gymId === r.gymId && i.machineId === r.machineId);
    if (item) byDateGyms[r.date].add(item.gymName);
  });
  const chartEntries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  const chartGymLabels = chartEntries.map(([d]) => [...(byDateGyms[d] || [])].join('、'));
  const hasChart = chartEntries.length >= 2;

  const totalVolume = allRecords.reduce((s, r) => s + r.volume, 0);
  const overallBest = allRecords.length
    ? allRecords.reduce((b, r) => r.volume > b.volume ? r : b, allRecords[0])
    : null;
  const bestItem = overallBest
    ? enrichedItems.find(i => i.gymId === overallBest.gymId && i.machineId === overallBest.machineId)
    : null;

  const removeItem = (item) => {
    Alert.alert('移除器械', `从分类中移除「${item.machineName}」？（记录不会删除）`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移除', style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removeMutation.mutate({ gymId: item.gymId, machineId: item.machineId });
        },
      },
    ]);
  };

  const addItem = (gymId, machineId) => {
    const already = items.some(i => i.gymId === gymId && i.machineId === machineId);
    if (already) { setAddModalVisible(false); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate({ gymId, machineId });
    setAddModalVisible(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {overallBest && (
          <View style={s.bestCard}>
            <Text style={s.bestLabel}>🏆 同类历史最佳</Text>
            <Text style={s.bestVolume}>{overallBest.volume}<Text style={s.unitSuffix}> 千克·次</Text></Text>
            <Text style={s.bestDetail}>
              {overallBest.weight} 千克 × {overallBest.sets?.length || 0}组（{overallBest.sets?.join('/') || '-'} 次）· {overallBest.date}
            </Text>
            {bestItem && (
              <Text style={s.bestSource}>
                {bestItem.gymName}  ·  {bestItem.machineName}
              </Text>
            )}
          </View>
        )}

        {allRecords.length > 0 && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{allRecords.length}</Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.2}>训练记录</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{chartEntries.length}</Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.2}>训练天数</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{totalVolume.toLocaleString()}</Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.2}>总训练量</Text>
            </View>
          </View>
        )}

        {hasChart && (
          <View style={s.chartCard}>
            <Text style={s.sectionTitle}>同类趋势</Text>
            <InteractiveLineChart
              labels={chartEntries.map(([d]) => d.slice(5))}
              data={chartEntries.map(([, v]) => v)}
              width={W - 48}
              height={210}
              gradientId="category_grad"
              tooltipExtra={chartGymLabels}
            />
          </View>
        )}

        <View style={s.machinesCard}>
          <View style={s.machinesHeader}>
            <Text style={s.sectionTitle}>关联器械</Text>
            <TouchableOpacity style={s.addMachineBtn} onPress={() => { setPickerStep('gym'); setPickerGym(null); setAddModalVisible(true); }} accessibilityRole="button" accessibilityLabel="添加关联器械">
              <Text style={s.addMachineBtnText}>＋ 添加</Text>
            </TouchableOpacity>
          </View>

          {enrichedItems.length === 0 ? (
            <Text style={s.emptyText}>还没有关联器械{'\n'}点右上角「添加」来关联</Text>
          ) : (
            enrichedItems.map((item, idx) => (
              <Swipeable
                key={idx}
                renderRightActions={() => (
                  <TouchableOpacity style={s.deleteAction} onPress={() => removeItem(item)} accessibilityRole="button" accessibilityLabel={`移除${item.machineName}`}>
                    <Text style={s.deleteActionText}>删除</Text>
                  </TouchableOpacity>
                )}
              >
                <View style={s.machineRow}>
                  <View style={s.machineInfo}>
                    <Text style={s.machineName}>{item.machineName}</Text>
                    <Text style={s.gymName}>{item.gymName} · {item.count} 条记录</Text>
                    {item.best && (
                      <Text style={s.machineBest}>最佳 {item.best.volume} 千克·次</Text>
                    )}
                  </View>
                </View>
              </Swipeable>
            ))
          )}
        </View>

      </ScrollView>

      <Modal transparent visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setAddModalVisible(false)}>
          <View style={[s.modalSheet, { paddingBottom: Math.max(insets.bottom + 16, 32) }]} onStartShouldSetResponder={() => true}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              {pickerStep === 'machine' ? (
                <TouchableOpacity onPress={() => setPickerStep('gym')} style={s.backBtn} accessibilityRole="button" accessibilityLabel="返回健身房列表">
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="chevron-back" size={18} color={theme.accent} accessible={false} />
                    <Text style={s.backBtnText}>返回</Text>
                  </View>
                </TouchableOpacity>
              ) : <View style={{ width: 60 }} />}
              <Text style={s.modalTitle}>
                {pickerStep === 'gym' ? '选择健身房' : pickerGym?.name}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="关闭">
                <Text style={s.closeBtnText}>关闭</Text>
              </TouchableOpacity>
            </View>

            {pickerStep === 'gym' && (
              <FlatList
                data={gyms}
                keyExtractor={g => g.id}
                style={{ maxHeight: 400 }}
                renderItem={({ item: gym }) => (
                  <TouchableOpacity
                    style={s.pickOption}
                    onPress={() => { setPickerGym(gym); setPickerStep('machine'); }}
                  >
                    <Text style={s.pickMachine}>{gym.name}</Text>
                    <Text style={s.pickArrow}>›</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={s.emptyText}>还没有健身房</Text>}
              />
            )}

            {pickerStep === 'machine' && (
              <FlatList
                data={pickerGym?.machines || []}
                keyExtractor={m => m.id}
                style={{ maxHeight: 400 }}
                renderItem={({ item: machine }) => {
                  const inCategory = items.some(i => i.gymId === pickerGym.id && i.machineId === machine.id);
                  return (
                    <TouchableOpacity
                      style={[s.pickOption, inCategory && s.pickOptionDisabled]}
                      onPress={() => !inCategory && addItem(pickerGym.id, machine.id)}
                      disabled={inCategory}
                    >
                      <Text style={[s.pickMachine, inCategory && s.pickDisabledText]}>
                        {machine.name}
                      </Text>
                      {inCategory
                        ? <Text style={s.alreadyTag}>已关联</Text>
                        : <Text style={s.pickArrow}>＋</Text>
                      }
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={s.emptyText}>该健身房没有器械</Text>}
              />
            )}

          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  bestCard: {
    backgroundColor: t.goldBg, borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: t.goldBorder,
  },
  bestLabel: { fontSize: 13, color: t.gold, fontWeight: '600', marginBottom: 4 },
  bestVolume: { fontSize: 28, fontWeight: '800', color: t.textPrimary, marginBottom: 2 },
  bestDetail: { fontSize: 13, color: t.textMuted },
  bestSource: { fontSize: 12, color: t.gold, marginTop: 6, fontWeight: '500' },
  unitSuffix: { fontSize: 14, fontWeight: '400', color: t.textMuted },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: t.card, borderRadius: 12, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statNum: { fontSize: 17, fontWeight: '800', color: t.accent, marginBottom: 2 },
  statLabel: { fontSize: 12, color: t.textMuted },
  chartCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: t.textPrimary, marginBottom: 12 },
  machinesCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  machinesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addMachineBtn: {
    backgroundColor: t.accent, borderRadius: 8,
    paddingHorizontal: 14, minHeight: 44, justifyContent: 'center',
  },
  addMachineBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  machineRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderColor: t.border,
  },
  machineInfo: { flex: 1 },
  machineName: { fontSize: 15, fontWeight: '600', color: t.textPrimary, marginBottom: 2 },
  gymName: { fontSize: 12, color: t.textMuted, marginBottom: 2 },
  machineBest: { fontSize: 13, color: t.accent },
  deleteAction: {
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 72,
  },
  deleteActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { color: t.textFaint, fontSize: 14, textAlign: 'center', lineHeight: 22, paddingVertical: 20 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: t.border,
    alignSelf: 'center', marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: t.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: t.textPrimary },
  backBtn: { width: 60 },
  backBtnText: { fontSize: 16, color: t.accent, fontWeight: '600' },
  closeBtn: { width: 60, alignItems: 'flex-end' },
  closeBtnText: { fontSize: 15, color: t.textMuted },
  pickArrow: { fontSize: 18, color: t.textFaint },
  pickOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: t.border,
  },
  pickOptionDisabled: { backgroundColor: t.input },
  pickMachine: { fontSize: 15, fontWeight: '600', color: t.textPrimary, marginBottom: 2 },
  pickDisabledText: { color: t.textFaint },
  alreadyTag: { fontSize: 12, color: t.textFaint, fontStyle: 'italic' },
});
