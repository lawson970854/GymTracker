import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, FlatList,
  StyleSheet, SafeAreaView, Dimensions, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { loadData, saveData, calcVolume } from '../storage';
import InteractiveLineChart from '../components/InteractiveLineChart';

const W = Dimensions.get('window').width;

export default function CategoryScreen({ route }) {
  const { categoryId, categoryName } = route.params;

  const [data, setData] = useState({ gyms: [], records: [], categories: [] });
  const [category, setCategory] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pickerStep, setPickerStep] = useState('gym'); // 'gym' | 'machine'
  const [pickerGym, setPickerGym] = useState(null);

  useFocusEffect(useCallback(() => {
    loadData().then(d => {
      setData(d);
      setCategory(d.categories.find(c => c.id === categoryId) || null);
    });
  }, [categoryId]));

  const items = category?.items || [];

  // 找到每个 item 对应的 gym 名和 machine 名
  const enrichedItems = items.map(item => {
    const gym = data.gyms.find(g => g.id === item.gymId);
    const machine = gym?.machines?.find(m => m.id === item.machineId);
    const recs = data.records.filter(r => r.gymId === item.gymId && r.machineId === item.machineId);
    const best = recs.length ? recs.reduce((b, r) => r.volume > b.volume ? r : b, recs[0]) : null;
    return { ...item, gymName: gym?.name || '?', machineName: machine?.name || '?', best, count: recs.length };
  });

  // 合并所有记录，按日期取最大训练量
  const allRecords = data.records.filter(r =>
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
        text: '移除', style: 'destructive', onPress: async () => {
          const d = await loadData();
          const cat = d.categories.find(c => c.id === categoryId);
          if (cat) {
            cat.items = cat.items.filter(i => !(i.gymId === item.gymId && i.machineId === item.machineId));
            await saveData(d);
            setData(d);
            setCategory({ ...cat });
          }
        },
      },
    ]);
  };

  const addItem = async (gymId, machineId) => {
    const d = await loadData();
    const cat = d.categories.find(c => c.id === categoryId);
    if (!cat) return;
    const already = cat.items.some(i => i.gymId === gymId && i.machineId === machineId);
    if (already) { setAddModalVisible(false); return; }
    cat.items.push({ gymId, machineId });
    await saveData(d);
    setData(d);
    setCategory({ ...cat });
    setAddModalVisible(false);
  };

  // 所有可以添加的器械（排除已在分类中的）
  const availableMachines = [];
  data.gyms.forEach(gym => {
    (gym.machines || []).forEach(machine => {
      const inCategory = items.some(i => i.gymId === gym.id && i.machineId === machine.id);
      availableMachines.push({ gym, machine, inCategory });
    });
  });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {overallBest && (
          <View style={s.bestCard}>
            <Text style={s.bestLabel}>🏆 同类历史最佳</Text>
            <Text style={s.bestVolume}>{overallBest.volume} kg·次</Text>
            <Text style={s.bestDetail}>
              {overallBest.weight}kg × {overallBest.sets?.length || 0}组（{overallBest.sets?.join('/') || '-'} 次）· {overallBest.date}
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
              <Text style={s.statNum}>{allRecords.length}</Text>
              <Text style={s.statLabel}>训练记录</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{chartEntries.length}</Text>
              <Text style={s.statLabel}>训练天数</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{totalVolume >= 10000 ? `${(totalVolume / 10000).toFixed(1)}万` : totalVolume.toLocaleString()}</Text>
              <Text style={s.statLabel}>总训练量</Text>
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
            <TouchableOpacity style={s.addMachineBtn} onPress={() => { setPickerStep('gym'); setPickerGym(null); setAddModalVisible(true); }}>
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
                  <TouchableOpacity style={s.deleteAction} onPress={() => removeItem(item)}>
                    <Text style={s.deleteActionText}>删除</Text>
                  </TouchableOpacity>
                )}
              >
                <View style={s.machineRow}>
                  <View style={s.machineInfo}>
                    <Text style={s.machineName}>{item.machineName}</Text>
                    <Text style={s.gymName}>{item.gymName} · {item.count} 条记录</Text>
                    {item.best && (
                      <Text style={s.machineBest}>最佳 {item.best.volume} kg·次</Text>
                    )}
                  </View>
                </View>
              </Swipeable>
            ))
          )}
        </View>

      </ScrollView>

      {/* 添加器械 Modal — 逐级选择：健身房 → 器械 */}
      <Modal transparent visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setAddModalVisible(false)}>
          <View style={s.modalSheet} onStartShouldSetResponder={() => true}>

            {/* 标题栏 */}
            <View style={s.modalHeader}>
              {pickerStep === 'machine' ? (
                <TouchableOpacity onPress={() => setPickerStep('gym')} style={s.backBtn}>
                  <Text style={s.backBtnText}>‹ 返回</Text>
                </TouchableOpacity>
              ) : <View style={{ width: 60 }} />}
              <Text style={s.modalTitle}>
                {pickerStep === 'gym' ? '选择健身房' : pickerGym?.name}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={s.closeBtn}>
                <Text style={s.closeBtnText}>关闭</Text>
              </TouchableOpacity>
            </View>

            {/* 第一步：选健身房 */}
            {pickerStep === 'gym' && (
              <FlatList
                data={data.gyms}
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

            {/* 第二步：选器械 */}
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  bestCard: {
    backgroundColor: '#FFF9E6', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#FFD700',
  },
  bestLabel: { fontSize: 13, color: '#B8860B', fontWeight: '600', marginBottom: 4 },
  bestVolume: { fontSize: 28, fontWeight: '800', color: '#333', marginBottom: 2 },
  bestDetail: { fontSize: 13, color: '#888' },
  bestSource: { fontSize: 12, color: '#B8860B', marginTop: 6, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statNum: { fontSize: 20, fontWeight: '800', color: '#1D9E75', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#999' },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  machinesCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  machinesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addMachineBtn: {
    backgroundColor: '#1D9E75', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  addMachineBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  machineRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderColor: '#F0F0F0',
  },
  machineInfo: { flex: 1 },
  machineName: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 2 },
  gymName: { fontSize: 12, color: '#999', marginBottom: 2 },
  machineBest: { fontSize: 13, color: '#1D9E75' },
  deleteAction: {
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
    width: 72, borderTopRightRadius: 0, borderBottomRightRadius: 0,
  },
  deleteActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { color: '#BBB', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingVertical: 20 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  backBtn: { width: 60 },
  backBtnText: { fontSize: 16, color: '#1D9E75', fontWeight: '600' },
  closeBtn: { width: 60, alignItems: 'flex-end' },
  closeBtnText: { fontSize: 15, color: '#999' },
  pickArrow: { fontSize: 18, color: '#CCC' },
  pickOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  pickOptionDisabled: { backgroundColor: '#FAFAFA' },
  pickMachine: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 2 },
  pickGym: { fontSize: 12, color: '#999' },
  pickDisabledText: { color: '#BBB' },
  alreadyTag: { fontSize: 12, color: '#BBB', fontStyle: 'italic' },
});
