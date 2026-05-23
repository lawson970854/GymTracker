import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Platform, Dimensions, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { loadData, saveData, uid, calcVolume, getBestRecord, today } from '../storage';
import SetInput from '../components/SetInput';
import TrophyModal from '../components/TrophyModal';
import InteractiveLineChart from '../components/InteractiveLineChart';

const W = Dimensions.get('window').width;

function DatePicker({ value, onChange }) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <TextInput
        style={dp.webInput}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
      />
    );
  }

  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  return (
    <>
      <TouchableOpacity style={dp.btn} onPress={() => setShow(true)}>
        <Text style={dp.btnText}>{value}</Text>
        <Text style={dp.btnIcon}>📅</Text>
      </TouchableOpacity>

      <Modal transparent visible={show} animationType="fade" onRequestClose={() => setShow(false)}>
        <TouchableOpacity style={dp.overlay} activeOpacity={1} onPress={() => setShow(false)}>
          <View style={dp.sheet} onStartShouldSetResponder={() => true}>
            <DateTimePicker
              value={new Date(value)}
              mode="date"
              display="inline"
              onChange={(_, d) => {
                if (d) {
                  onChange(d.toISOString().slice(0, 10));
                  setShow(false); // 选完自动关闭
                }
              }}
              style={{ width: '100%' }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const dp = StyleSheet.create({
  webInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FAFAFA',
  },
  btnText: { fontSize: 16, color: '#333', fontWeight: '500' },
  btnIcon: { fontSize: 16 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    margin: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
});

export default function MachineScreen({ route }) {
  const { gymId, machineId, machineName } = route.params;

  const [records, setRecords] = useState([]);
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState([10, 10, 10]);
  const [trophy, setTrophy] = useState(null); // 'gold' | 'silver' | null

  // 编辑状态
  const [editRec, setEditRec] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editSets, setEditSets] = useState([]);

  useFocusEffect(useCallback(() => {
    loadData().then(d => {
      const recs = d.records
        .filter(r => r.gymId === gymId && r.machineId === machineId)
        .sort((a, b) => b.date.localeCompare(a.date));
      setRecords(recs);

      // 用最佳记录填充默认值
      const best = getBestRecord(d.records, gymId, machineId);
      if (best) {
        setWeight(String(best.weight));
        setSets([...best.sets]);
      }
    });
  }, [gymId, machineId]));

  const bestRecord = getBestRecord(records, gymId, machineId);

  const save = async () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return Alert.alert('请输入有效重量');
    if (sets.some(r => r <= 0)) return Alert.alert('请输入有效次数');

    const volume = calcVolume(w, sets);
    const data = await loadData();

    const newRec = { id: uid(), gymId, machineId, date, weight: w, sets: [...sets], volume };
    data.records.push(newRec);
    await saveData(data);

    const myRecs = data.records.filter(r => r.gymId === gymId && r.machineId === machineId);
    const allBest = myRecs.reduce((b, r) => r.volume > b.volume ? r : b, myRecs[0]);
    const todayRecs = myRecs.filter(r => r.date === date && r.id !== newRec.id);
    const dayBest = todayRecs.length > 0 ? todayRecs.reduce((b, r) => r.volume > b.volume ? r : b, todayRecs[0]) : null;

    if (volume >= allBest.volume) {
      setTrophy('gold');
    } else if (!dayBest || volume > dayBest.volume) {
      setTrophy('silver');
    }

    const sorted = myRecs.sort((a, b) => b.date.localeCompare(a.date));
    setRecords(sorted);
    setDate(today());

    // 保存后自动以最新最高记录作为默认值
    const newBest = getBestRecord(data.records, gymId, machineId);
    if (newBest) {
      setWeight(String(newBest.weight));
      setSets([...newBest.sets]);
    } else {
      setWeight('');
      setSets([10, 10, 10]);
    }
  };

  const refreshRecords = (allRecords) => {
    const myRecs = allRecords
      .filter(r => r.gymId === gymId && r.machineId === machineId)
      .sort((a, b) => b.date.localeCompare(a.date));
    setRecords(myRecs);
    const newBest = getBestRecord(allRecords, gymId, machineId);
    if (newBest) {
      setWeight(String(newBest.weight));
      setSets([...newBest.sets]);
    }
  };

  const openEdit = (rec) => {
    setEditRec(rec);
    setEditDate(rec.date);
    setEditWeight(String(rec.weight));
    setEditSets([...rec.sets]);
  };

  const saveEdit = async () => {
    const w = parseFloat(editWeight);
    if (!w || w <= 0) return Alert.alert('请输入有效重量');
    if (editSets.some(r => r <= 0)) return Alert.alert('请输入有效次数');
    const volume = calcVolume(w, editSets);
    const data = await loadData();
    const idx = data.records.findIndex(r => r.id === editRec.id);
    if (idx !== -1) {
      data.records[idx] = { ...editRec, date: editDate, weight: w, sets: [...editSets], volume };
      await saveData(data);
      refreshRecords(data.records);
    }
    setEditRec(null);
  };

  const deleteRecord = (rec) => {
    Alert.alert('删除记录', `确认删除 ${rec.date} 的这条训练记录？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          const data = await loadData();
          data.records = data.records.filter(r => r.id !== rec.id);
          await saveData(data);
          refreshRecords(data.records);
        },
      },
    ]);
  };

  const showActions = (rec) => {
    Alert.alert(
      `${rec.date}`,
      `${rec.weight}kg × ${rec.sets?.join('/')} 次  |  ${rec.volume} kg·次`,
      [
        { text: '编辑', onPress: () => openEdit(rec) },
        { text: '删除', style: 'destructive', onPress: () => deleteRecord(rec) },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  const chartData = () => {
    const byDate = {};
    records.forEach(r => {
      if (!byDate[r.date] || r.volume > byDate[r.date]) byDate[r.date] = r.volume;
    });
    // 全部历史，按日期升序
    const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels: entries.map(([d]) => d.slice(5)),
      data: entries.map(([, v]) => v),
    };
  };

  const { labels, data: chartValues } = chartData();
  const hasChart = chartValues.length >= 2;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>

        {bestRecord && (
          <View style={s.bestCard}>
            <Text style={s.bestLabel}>🏆 历史最佳</Text>
            <Text style={s.bestVolume}>{bestRecord.volume} kg·次</Text>
            <Text style={s.bestDetail}>
              {bestRecord.weight}kg × {bestRecord.sets.length}组（{bestRecord.sets.join('/')} 次） · {bestRecord.date}
            </Text>
          </View>
        )}

        <View style={s.formCard}>
          <Text style={s.sectionTitle}>训练记录</Text>

          <Text style={s.fieldLabel}>日期</Text>
          <DatePicker value={date} onChange={setDate} />

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>重量（kg）</Text>
          <TextInput
            style={s.weightInput}
            placeholder="例如：80"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />

          <View style={{ marginTop: 14 }}>
            <SetInput sets={sets} onChange={setSets} />
          </View>

          {weight ? (
            <Text style={s.preview}>
              预计训练量：{calcVolume(parseFloat(weight) || 0, sets)} kg·次
            </Text>
          ) : null}

          <TouchableOpacity style={s.saveBtn} onPress={save}>
            <Text style={s.saveBtnText}>保存记录</Text>
          </TouchableOpacity>
        </View>

        {hasChart && (
          <View style={s.chartCard}>
            <Text style={s.sectionTitle}>单向趋势</Text>
            <InteractiveLineChart
              labels={labels}
              data={chartValues}
              width={W - 48}
              height={210}
              gradientId="machine_grad"
            />
          </View>
        )}

        {records.length > 0 && (
          <View style={s.historyCard}>
            <Text style={s.sectionTitle}>历史记录</Text>
            {records.slice(0, 20).map(r => (
              <Swipeable
                key={r.id}
                renderRightActions={() => (
                  <View style={s.swipeActions}>
                    <TouchableOpacity style={s.editAction} onPress={() => openEdit(r)}>
                      <Text style={s.swipeActionText}>编辑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteAction} onPress={() => deleteRecord(r)}>
                      <Text style={s.swipeActionText}>删除</Text>
                    </TouchableOpacity>
                  </View>
                )}
              >
                <View style={s.histRow}>
                  <Text style={s.histDate}>{r.date}</Text>
                  <Text style={s.histDetail}>
                    {r.weight}kg × {r.sets?.join('/')} 次
                  </Text>
                  <Text style={s.histVol}>{r.volume}</Text>
                </View>
              </Swipeable>
            ))}
          </View>
        )}

      </ScrollView>

      <TrophyModal visible={!!trophy} type={trophy} onClose={() => setTrophy(null)} />

      {/* 编辑记录 Modal */}
      <Modal visible={!!editRec} transparent animationType="slide" onRequestClose={() => setEditRec(null)}>
        <TouchableOpacity style={s.editOverlay} activeOpacity={1} onPress={() => setEditRec(null)}>
          <View style={s.editSheet} onStartShouldSetResponder={() => true}>
            <Text style={s.editTitle}>编辑记录</Text>

            <Text style={s.fieldLabel}>日期</Text>
            <DatePicker value={editDate} onChange={setEditDate} />

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>重量（kg）</Text>
            <TextInput
              style={s.weightInput}
              keyboardType="decimal-pad"
              value={editWeight}
              onChangeText={setEditWeight}
            />

            <View style={{ marginTop: 14 }}>
              <SetInput sets={editSets} onChange={setEditSets} />
            </View>

            {editWeight ? (
              <Text style={s.preview}>
                训练量：{calcVolume(parseFloat(editWeight) || 0, editSets)} kg·次
              </Text>
            ) : null}

            <View style={s.editActions}>
              <TouchableOpacity style={s.editCancelBtn} onPress={() => setEditRec(null)}>
                <Text style={s.editCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editSaveBtn} onPress={saveEdit}>
                <Text style={s.editSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 80 },
  bestCard: {
    backgroundColor: '#FFF9E6', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#FFD700',
  },
  bestLabel: { fontSize: 13, color: '#B8860B', fontWeight: '600', marginBottom: 4 },
  bestVolume: { fontSize: 28, fontWeight: '800', color: '#333', marginBottom: 2 },
  bestDetail: { fontSize: 13, color: '#888' },
  formCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  fieldLabel: { fontSize: 14, color: '#666', marginBottom: 6 },
  weightInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 22, fontWeight: '700',
    textAlign: 'center',
  },
  preview: { fontSize: 13, color: '#1D9E75', fontWeight: '600', marginTop: 10, textAlign: 'center' },
  saveBtn: {
    backgroundColor: '#1D9E75', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  histRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  histDate: { width: 90, fontSize: 13, color: '#999' },
  histDetail: { flex: 1, fontSize: 13, color: '#555' },
  histVol: { fontSize: 14, fontWeight: '700', color: '#1D9E75' },
  swipeActions: { flexDirection: 'row' },
  editAction: {
    backgroundColor: '#1D9E75', justifyContent: 'center', alignItems: 'center', width: 60,
  },
  deleteAction: {
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 60,
  },
  swipeActionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  editOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40,
  },
  editTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 16, textAlign: 'center' },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  editCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  editCancelText: { fontSize: 15, color: '#999', fontWeight: '600' },
  editSaveBtn: {
    flex: 2, backgroundColor: '#1D9E75', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  editSaveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
