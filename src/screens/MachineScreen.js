import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Platform, Dimensions, Alert, Modal,
  KeyboardAvoidingView, ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGymData, addRecord as dbAddRecord, updateRecord as dbUpdateRecord, deleteRecord as dbDeleteRecord, calcVolume, getBestRecord, today } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import SetInput from '../components/SetInput';
import TrophyModal from '../components/TrophyModal';
import InteractiveLineChart from '../components/InteractiveLineChart';
import { useTheme } from '../ThemeContext';

const W = Dimensions.get('window').width;

function DatePicker({ value, onChange }) {
  const { theme, isDark } = useTheme();

  if (Platform.OS === 'web') {
    return (
      <TextInput
        style={[dp.webInput, { borderColor: theme.border, backgroundColor: theme.input, color: theme.textPrimary }]}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.textFaint}
      />
    );
  }

  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  return (
    <DateTimePicker
      value={new Date(value)}
      mode="date"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      themeVariant={isDark ? 'dark' : 'light'}
      onChange={(_, d) => { if (d) onChange(d.toISOString().slice(0, 10)); }}
    />
  );
}

const dp = StyleSheet.create({
  webInput: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15,
  },
});

export default function MachineScreen({ route }) {
  const { gymId, machineId } = route.params;
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: gymData } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });

  const allRecords = gymData?.records || [];
  const records = allRecords
    .filter(r => r.gymId === gymId && r.machineId === machineId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const bestRecord = getBestRecord(allRecords, gymId, machineId);
  const totalVolume = records.reduce((s, r) => s + r.volume, 0);
  const trainDays = new Set(records.map(r => r.date)).size;

  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState(() => bestRecord ? String(bestRecord.weight) : '');
  const [sets, setSets] = useState(() => bestRecord ? [...bestRecord.sets] : [10, 10, 10]);
  const [trophy, setTrophy] = useState(null);

  const [editRec, setEditRec] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editSets, setEditSets] = useState([]);

  const addMutation = useMutation({
    mutationFn: dbAddRecord,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      const tempId = 'temp_' + Date.now();
      const tempRec = { id: tempId, ...vars };
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        records: [...(old?.records || []), tempRec],
      }));
      return { prev, tempId };
    },
    onSuccess: (newRec, vars, ctx) => {
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        records: (old?.records || []).map(r => r.id === ctx.tempId ? newRec : r),
      }));
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('保存失败', '请检查网络连接');
    },
  });

  const updateMutation = useMutation({
    mutationFn: dbUpdateRecord,
    onMutate: async (updated) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        records: (old?.records || []).map(r => r.id === updated.id ? updated : r),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('保存失败', '请检查网络连接');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: dbDeleteRecord,
    onMutate: async (recId) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        records: (old?.records || []).filter(r => r.id !== recId),
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GYM_DATA_KEY, ctx.prev);
      Alert.alert('删除失败', '请检查网络连接');
    },
  });

  const save = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return Alert.alert('请输入有效重量');
    if (sets.some(r => r <= 0)) return Alert.alert('请输入有效次数');
    const volume = calcVolume(w, sets);
    const maxVol = records.length ? Math.max(...records.map(r => r.volume)) : 0;
    if (volume > maxVol) setTrophy('gold');
    setDate(today());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate({ gymId, machineId, date, weight: w, sets: [...sets], volume });
  };

  const openEdit = (rec) => {
    setEditRec(rec);
    setEditDate(rec.date);
    setEditWeight(String(rec.weight));
    setEditSets([...rec.sets]);
  };

  const saveEdit = () => {
    const w = parseFloat(editWeight);
    if (!w || w <= 0) return Alert.alert('请输入有效重量');
    if (editSets.some(r => r <= 0)) return Alert.alert('请输入有效次数');
    const volume = calcVolume(w, editSets);
    const updated = { ...editRec, date: editDate, weight: w, sets: [...editSets], volume };
    setEditRec(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMutation.mutate(updated);
  };

  const deleteRecord = (rec) => {
    Alert.alert('删除记录', `确认删除 ${rec.date} 的这条训练记录？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteMutation.mutate(rec.id);
        },
      },
    ]);
  };

  const showActions = (rec) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: rec.date,
          message: `${rec.weight}kg × ${rec.sets?.join('/')} 次  |  ${rec.volume} 千克·次`,
          options: ['取消', '编辑', '删除'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openEdit(rec);
          if (buttonIndex === 2) deleteRecord(rec);
        }
      );
    } else {
      Alert.alert(
        rec.date,
        `${rec.weight}kg × ${rec.sets?.join('/')} 次  |  ${rec.volume} 千克·次`,
        [
          { text: '编辑', onPress: () => openEdit(rec) },
          { text: '删除', style: 'destructive', onPress: () => deleteRecord(rec) },
          { text: '取消', style: 'cancel' },
        ]
      );
    }
  };

  const chartData = () => {
    const byDate = {};
    records.forEach(r => {
      if (!byDate[r.date] || r.volume > byDate[r.date]) byDate[r.date] = r.volume;
    });
    const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels: entries.map(([d]) => d.slice(5)),
      data: entries.map(([, v]) => v),
    };
  };

  const { labels, data: chartValues } = chartData();
  const hasChart = chartValues.length >= 2;
  const sheetPaddingBottom = Math.max(insets.bottom + 16, 32);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>

        {bestRecord && (
          <View style={s.bestCard}>
            <Text style={s.bestLabel} accessible={false}>🏆 历史最佳</Text>
            <Text style={s.bestVolume}>{bestRecord.volume} 千克·次</Text>
            <Text style={s.bestDetail}>
              {bestRecord.weight}kg × {bestRecord.sets.length}组（{bestRecord.sets.join('/')} 次） · {bestRecord.date}
            </Text>
          </View>
        )}

        {records.length > 0 && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{records.length}</Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.3}>训练记录</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{trainDays}</Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.3}>训练天数</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>
                {totalVolume.toLocaleString()}
              </Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.3}>总训练量</Text>
            </View>
          </View>
        )}

        <View style={s.formCard}>
          <Text style={s.sectionTitle}>训练记录</Text>

          <View style={s.dateRow}>
            <Text style={s.fieldLabel}>日期</Text>
            <DatePicker value={date} onChange={setDate} />
          </View>

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>重量（kg）</Text>
          <TextInput
            style={s.weightInput}
            placeholder="例如：80"
            placeholderTextColor={theme.textFaint}
            keyboardType="decimal-pad"
            returnKeyType="done"
            value={weight}
            onChangeText={setWeight}
            accessibilityLabel="重量，单位千克"
          />

          <View style={{ marginTop: 14 }}>
            <SetInput sets={sets} onChange={setSets} />
          </View>

          {weight ? (
            <Text style={s.preview}>
              预计训练量：{calcVolume(parseFloat(weight) || 0, sets)} 千克·次
            </Text>
          ) : null}

          <TouchableOpacity style={s.saveBtn} onPress={save} accessibilityRole="button" accessibilityLabel="保存记录">
            <Text style={s.saveBtnText}>保存记录</Text>
          </TouchableOpacity>
        </View>

        {hasChart && (
          <View style={s.chartCard}>
            <Text style={s.sectionTitle}>单项趋势</Text>
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
              <TouchableOpacity
                key={r.id}
                style={s.histRow}
                onPress={() => showActions(r)}
                accessibilityRole="button"
                accessibilityLabel={`${r.date}，${r.weight}千克，${r.sets?.join('/')}次，训练量${r.volume}千克次，点击查看操作`}
              >
                <Text style={s.histDate} maxFontSizeMultiplier={1.2}>{r.date}</Text>
                <Text style={s.histDetail} maxFontSizeMultiplier={1.2}>
                  {r.weight}kg × {r.sets?.join('/')} 次
                </Text>
                <Text style={s.histVol} maxFontSizeMultiplier={1.2}>{r.volume}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>

      <TrophyModal visible={!!trophy} type={trophy} onClose={() => setTrophy(null)} />

      <Modal visible={!!editRec} transparent animationType="slide" onRequestClose={() => setEditRec(null)}>
        <KeyboardAvoidingView style={s.editOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setEditRec(null)} />
          <View style={[s.editSheet, { paddingBottom: sheetPaddingBottom }]} onStartShouldSetResponder={() => true}>
            <View style={s.editHandle} />
            <Text style={s.editTitle}>编辑记录</Text>

            <View style={s.dateRow}>
              <Text style={s.fieldLabel}>日期</Text>
              <DatePicker value={editDate} onChange={setEditDate} />
            </View>

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>重量（kg）</Text>
            <TextInput
              style={s.weightInput}
              keyboardType="decimal-pad"
              returnKeyType="done"
              value={editWeight}
              onChangeText={setEditWeight}
              placeholderTextColor={theme.textFaint}
              accessibilityLabel="重量，单位千克"
            />

            <View style={{ marginTop: 14 }}>
              <SetInput sets={editSets} onChange={setEditSets} />
            </View>

            {editWeight ? (
              <Text style={s.preview}>
                训练量：{calcVolume(parseFloat(editWeight) || 0, editSets)} 千克·次
              </Text>
            ) : null}

            <View style={s.editActions}>
              <TouchableOpacity style={s.editCancelBtn} onPress={() => setEditRec(null)} accessibilityRole="button" accessibilityLabel="取消编辑">
                <Text style={s.editCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editSaveBtn} onPress={saveEdit} accessibilityRole="button" accessibilityLabel="保存编辑">
                <Text style={s.editSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 80 },
  bestCard: {
    backgroundColor: t.goldBg, borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: t.goldBorder,
  },
  bestLabel: { fontSize: 13, color: t.gold, fontWeight: '600', marginBottom: 4 },
  bestVolume: { fontSize: 28, fontWeight: '800', color: t.textPrimary, marginBottom: 2 },
  bestDetail: { fontSize: 13, color: t.textMuted },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: t.card, borderRadius: 12, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statNum: { fontSize: 17, fontWeight: '800', color: t.accent, marginBottom: 2 },
  statLabel: { fontSize: 12, color: t.textMuted },
  formCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: t.textPrimary, marginBottom: 12 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 44,
  },
  fieldLabel: { fontSize: 14, color: t.textSecondary, marginBottom: 6 },
  weightInput: {
    borderWidth: 1, borderColor: t.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 22, fontWeight: '700',
    textAlign: 'center', color: t.textPrimary, backgroundColor: t.input,
  },
  preview: { fontSize: 13, color: t.accent, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  saveBtn: {
    backgroundColor: t.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chartCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  historyCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  histRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18, paddingRight: 12,
    borderBottomWidth: 1, borderColor: t.border,
    backgroundColor: t.card,
  },
  histDate: { width: 90, fontSize: 13, color: t.textMuted },
  histDetail: { flex: 1, fontSize: 13, color: t.textSecondary },
  histVol: { fontSize: 14, fontWeight: '700', color: t.accent },
  editOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
  },
  editHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: t.border,
    alignSelf: 'center', marginBottom: 16,
  },
  editTitle: { fontSize: 17, fontWeight: '700', color: t.textPrimary, marginBottom: 16, textAlign: 'center' },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  editCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  editCancelText: { fontSize: 15, color: t.textMuted, fontWeight: '600' },
  editSaveBtn: {
    flex: 2, backgroundColor: t.accent, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  editSaveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
