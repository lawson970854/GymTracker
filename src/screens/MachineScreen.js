import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Platform, Dimensions, Alert, Modal,
  KeyboardAvoidingView, ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGymData, addRecord as dbAddRecord, updateRecord as dbUpdateRecord, deleteRecord as dbDeleteRecord, calcVolume, getBestRecord, today } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import SetInput from '../components/SetInput';
import TrophyModal from '../components/TrophyModal';
import InteractiveLineChart from '../components/InteractiveLineChart';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';

const W = Dimensions.get('window').width;

const WEIGHT_OPTIONS = Array.from({ length: 300 }, (_, i) => i + 1);

function WeightPicker({ value, onChange }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);
  const numVal = parseInt(value) || 20;

  return (
    <>
      <TouchableOpacity
        style={s.weightBtn}
        onPress={() => setVisible(true)}
        accessibilityLabel={`当前重量 ${value} 千克，点击更改`}
        accessibilityRole="button"
      >
        <Text style={s.weightVal}>{value}</Text>
        <Text style={s.weightArrow} accessible={false}>▾</Text>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={s.wPickerRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setVisible(false)}
            accessibilityLabel="关闭"
          />
          <View style={s.wPickerBox}>
            <Text style={s.wPickerTitle}>选择重量（千克）</Text>
            <FlatList
              data={WEIGHT_OPTIONS}
              keyExtractor={n => String(n)}
              style={{ maxHeight: 300 }}
              initialScrollIndex={Math.max(0, numVal - 1)}
              getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.wOption, item === numVal && s.wOptionSelected]}
                  onPress={() => { onChange(String(item)); setVisible(false); }}
                  accessibilityLabel={`${item} 千克`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item === numVal }}
                >
                  <Text style={[s.wOptionText, item === numVal && s.wOptionTextSelected]}>
                    {item}
                  </Text>
                  {item === numVal && <Text style={s.wCheck} accessible={false}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

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
  const [weight, setWeight] = useState(() => bestRecord ? String(Math.round(bestRecord.weight)) : '20');
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
    setEditWeight(String(Math.round(rec.weight)));
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
          message: `${rec.weight} 千克 × ${rec.sets?.length}组（${rec.sets?.join('/')} 次）  |  ${rec.volume.toLocaleString()} 千克·次`,
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
        `${rec.weight} 千克 × ${rec.sets?.length}组（${rec.sets?.join('/')} 次）  |  ${rec.volume.toLocaleString()} 千克·次`,
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
            <View style={s.bestTop}>
              <View style={s.bestBadge}>
                <Ionicons name="trophy" size={16} color="#fff" />
              </View>
              <Text style={s.bestLabel} accessible={false}>历史最佳</Text>
            </View>
            <Text style={s.bestVolume}>{bestRecord.volume.toLocaleString()}<Text style={s.unitSuffix}> 千克·次</Text></Text>
            <Text style={s.bestDetail}>
              {bestRecord.weight} 千克 × {bestRecord.sets.length}组（{bestRecord.sets.join('/')} 次） · {bestRecord.date}
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

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>重量（千克）</Text>
          <WeightPicker value={weight} onChange={setWeight} />

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
            {records.slice(0, 20).map((r, i) => (
              <TouchableOpacity
                key={r.id}
                style={[s.histRow, i === 0 && { borderTopWidth: 0 }]}
                onPress={() => showActions(r)}
                accessibilityRole="button"
                accessibilityLabel={`${r.date}，${r.weight}千克，${r.sets?.join('/')}次，训练量${r.volume}千克·次，点击查看操作`}
              >
                <View style={s.histTop}>
                  <Text style={s.histDate} maxFontSizeMultiplier={1.2}>{r.date}</Text>
                  <Text style={s.histVol} maxFontSizeMultiplier={1.2}>{r.volume.toLocaleString()} 千克·次</Text>
                </View>
                <Text style={s.histDetail} maxFontSizeMultiplier={1.2}>
                  {r.weight} 千克 × {r.sets?.length}组（{r.sets?.join('/')} 次）
                </Text>
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

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>重量（千克）</Text>
            <WeightPicker value={editWeight} onChange={setEditWeight} />

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
  // 历史最佳：淡金渐变（用 backgroundColor 模拟，避免引入 LinearGradient 依赖）
  bestCard: {
    backgroundColor: t.goldBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: t.goldBorder,
    padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  bestTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bestBadge: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: t.gold, alignItems: 'center', justifyContent: 'center',
  },
  bestLabel: {
    fontSize: 11.5, color: t.gold, fontFamily: FONTS.uiBold,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
  bestVolume: {
    fontSize: 44, fontFamily: FONTS.numBold, color: t.textPrimary,
    letterSpacing: -1.5, lineHeight: 46,
    fontVariant: ['tabular-nums'],
  },
  bestDetail: {
    fontSize: 12.5, color: t.textMuted, marginTop: 8,
    fontVariant: ['tabular-nums'], fontFamily: FONTS.ui,
  },
  unitSuffix: { fontSize: 15, fontWeight: '500', color: t.textMuted, fontFamily: FONTS.ui },
  // 统计三宫格：统一字号 20
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: t.card,
    borderRadius: 18, borderWidth: 1, borderColor: t.border,
    padding: 15, paddingHorizontal: 10, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  statNum: {
    fontSize: 20, lineHeight: 22, fontFamily: FONTS.num,
    color: t.accent, letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11, color: t.textMuted, marginTop: 4,
    fontFamily: FONTS.ui, letterSpacing: 0.3,
  },
  formCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  sectionTitle: {
    fontSize: 11.5, fontFamily: FONTS.uiBold, color: t.textMuted,
    marginBottom: 14, letterSpacing: 1.6, textTransform: 'uppercase',
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 44,
  },
  fieldLabel: {
    fontSize: 12.5, color: t.textMuted, fontFamily: FONTS.ui,
    fontWeight: '600', letterSpacing: 0.3, marginBottom: 8,
  },
  weightBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: t.border, borderRadius: RADIUS.input,
    paddingHorizontal: 14, minHeight: 52, backgroundColor: t.card2,
  },
  weightVal: {
    fontSize: 24, fontFamily: FONTS.num, color: t.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  weightArrow: { fontSize: 14, color: t.textFaint },
  // Picker modal：纯色遮罩 rgba(10,9,8,0.5)
  wPickerRoot: {
    flex: 1, backgroundColor: 'rgba(10,9,8,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  wPickerBox: {
    backgroundColor: t.card,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: t.border,
    width: 260, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 }, elevation: 8,
  },
  wPickerTitle: {
    fontSize: 14, fontFamily: FONTS.uiBold, color: t.textPrimary,
    textAlign: 'center', paddingVertical: 15,
    borderBottomWidth: 1, borderColor: t.border,
  },
  wOption: {
    height: 48, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  wOptionSelected: { backgroundColor: t.accentBg },
  wOptionText: {
    fontSize: 17, color: t.textSecondary, fontFamily: FONTS.num,
    fontVariant: ['tabular-nums'],
  },
  wOptionTextSelected: { color: t.accentInk, fontFamily: FONTS.numBold },
  wCheck: { fontSize: 16, color: t.accent },
  preview: {
    fontSize: 12.5, color: t.accentInk, fontWeight: '600',
    marginTop: 12, textAlign: 'center', fontFamily: FONTS.ui,
    fontVariant: ['tabular-nums'],
  },
  saveBtn: {
    backgroundColor: t.accent, borderRadius: RADIUS.btn,
    paddingVertical: 16, alignItems: 'center', marginTop: 12,
  },
  saveBtnText: { color: t.onAccent, fontSize: 16, fontFamily: FONTS.uiBold },
  chartCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 18, paddingHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  historyCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  histRow: {
    paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: t.borderAlt,
  },
  histTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 4,
  },
  histDate: {
    fontSize: 12.5, color: t.textMuted,
    fontVariant: ['tabular-nums'], fontFamily: FONTS.ui,
  },
  histDetail: { fontSize: 13, color: t.textSecondary, fontFamily: FONTS.ui },
  histVol: {
    fontSize: 14.5, fontFamily: FONTS.num,
    color: t.accentInk, fontVariant: ['tabular-nums'],
  },
  editOverlay: {
    flex: 1, backgroundColor: 'rgba(10,9,8,0.5)', justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: t.card,
    borderTopLeftRadius: RADIUS.modal, borderTopRightRadius: RADIUS.modal,
    padding: 20,
  },
  editHandle: {
    width: 38, height: 5, borderRadius: 3, backgroundColor: t.border,
    alignSelf: 'center', marginBottom: 14,
  },
  editTitle: {
    fontSize: 17, fontFamily: FONTS.uiExtra, color: t.textPrimary,
    marginBottom: 14, textAlign: 'center',
  },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  editCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: RADIUS.btn,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  editCancelText: { fontSize: 15, color: t.textMuted, fontFamily: FONTS.uiBold },
  editSaveBtn: {
    flex: 2, backgroundColor: t.accent, borderRadius: RADIUS.btn,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  editSaveText: { fontSize: 15, color: t.onAccent, fontFamily: FONTS.uiBold },
});
