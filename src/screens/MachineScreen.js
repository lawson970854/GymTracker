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
import { fetchGymData, addRecord as dbAddRecord, updateRecord as dbUpdateRecord, deleteRecord as dbDeleteRecord, updateMachineUnit as dbUpdateMachineUnit, calcVolume, getBestRecord, today, formatLocalDate, parseLocalDate } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { onMutationError } from '../mutationError';
import SetInput from '../components/SetInput';
import TrophyModal from '../components/TrophyModal';
import InteractiveLineChart from '../components/InteractiveLineChart';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { newId } from '../ids';
import { WEIGHT_UNITS, machineUnit, fromUnit, weightNumber, volumeNumber, nearestOption, weightOptions, formatSetLine, formatVolume } from '../constants/units';

const W = Dimensions.get('window').width;

// value 是器械单位下的数值字符串，选项随单位变（kg 按 1、lb 按 5 递增）
function WeightPicker({ value, unit, onChange }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);
  const options = weightOptions(unit);
  const numVal = parseFloat(value) || options[0];
  // 当前值可能不在档位上（旧记录、器械改过单位），滚到最接近的那一档
  const nearestIdx = options.reduce(
    (best, o, i) => (Math.abs(o - numVal) < Math.abs(options[best] - numVal) ? i : best), 0,
  );

  return (
    <>
      <TouchableOpacity
        style={s.weightBtn}
        onPress={() => setVisible(true)}
        accessibilityLabel={t('machine.currentWeightA11y', { weight: `${value} ${unit}` })}
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
            accessibilityLabel={t('common.close')}
          />
          <View style={s.wPickerBox}>
            <Text style={s.wPickerTitle}>{t('machine.pickWeight', { unit })}</Text>
            <FlatList
              data={options}
              keyExtractor={n => String(n)}
              style={{ maxHeight: 300 }}
              initialScrollIndex={nearestIdx}
              getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.wOption, item === numVal && s.wOptionSelected]}
                  onPress={() => { onChange(String(item)); setVisible(false); }}
                  accessibilityLabel={`${item} ${unit}`}
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
      value={parseLocalDate(value)}
      mode="date"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      themeVariant={isDark ? 'dark' : 'light'}
      // 训练记录只能记已经发生的训练，未来的日期不该可选
      maximumDate={new Date()}
      onChange={(_, d) => { if (d) onChange(formatLocalDate(d)); }}
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
  const { t } = useTranslation();
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

  // 这台器械的单位：本页所有重量和训练量都按它显示，和配重片上印的一致
  const unit = machineUnit(gymData?.gyms, gymId, machineId);

  const bestRecord = getBestRecord(allRecords, gymId, machineId);
  const totalVolume = records.reduce((s, r) => s + r.volume, 0);
  const trainDays = new Set(records.map(r => r.date)).size;

  const [date, setDate] = useState(today());
  // weight / editWeight 是器械单位下的数值字符串，写库前再换成 kg
  const [weight, setWeight] = useState(() => String(nearestOption(bestRecord ? bestRecord.weight : 20, unit)));
  const [sets, setSets] = useState(() => bestRecord ? [...bestRecord.sets] : [10, 10, 10]);
  const [trophy, setTrophy] = useState(null);

  const [editRec, setEditRec] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editSets, setEditSets] = useState([]);

  const addMutation = useMutation({
    mutationFn: dbAddRecord,
    // vars.id 由调用方生成，乐观插入和服务端写入用的是同一个 ID，
    // 所以成功后不需要再做 ID 替换。
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        records: [...(old?.records || []), { ...vars }],
      }));
      return { prev };
    },
    onSuccess: (newRec) => {
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        records: (old?.records || []).map(r => r.id === newRec.id ? newRec : r),
      }));
    },
    onError: onMutationError(qc, GYM_DATA_KEY, 'addRecord', 'common.saveFailed'),
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
    onError: onMutationError(qc, GYM_DATA_KEY, 'updateRecord', 'common.saveFailed'),
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  const unitMutation = useMutation({
    mutationFn: (next) => dbUpdateMachineUnit(machineId, next),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: GYM_DATA_KEY });
      const prev = qc.getQueryData(GYM_DATA_KEY);
      qc.setQueryData(GYM_DATA_KEY, old => ({
        ...old,
        gyms: (old?.gyms || []).map(g =>
          g.id === gymId
            ? { ...g, machines: (g.machines || []).map(m => m.id === machineId ? { ...m, weightUnit: next } : m) }
            : g
        ),
      }));
      return { prev };
    },
    onError: onMutationError(qc, GYM_DATA_KEY, 'updateMachineUnit', 'common.saveFailed'),
    onSettled: () => qc.invalidateQueries({ queryKey: GYM_DATA_KEY }),
  });

  // 换单位只是换个说法：记录里存的 kg 不动，表单里正在选的重量换算到新单位最接近的一档
  const changeUnit = (next) => {
    if (next === unit) return;
    Haptics.selectionAsync();
    setWeight(w => String(nearestOption(fromUnit(parseFloat(w) || 0, unit), next)));
    unitMutation.mutate(next);
  };

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
    onError: onMutationError(qc, GYM_DATA_KEY, 'deleteRecord', 'common.deleteFailed'),
  });

  const save = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return Alert.alert(t('machine.invalidWeight'));
    if (sets.some(r => r <= 0)) return Alert.alert(t('machine.invalidReps'));
    const kg = fromUnit(w, unit);
    const volume = calcVolume(kg, sets);
    const maxVol = records.length ? Math.max(...records.map(r => r.volume)) : 0;
    if (volume > maxVol) setTrophy('gold');
    setDate(today());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate({ id: newId(), gymId, machineId, date, weight: kg, sets: [...sets], volume });
  };

  const openEdit = (rec) => {
    setEditRec(rec);
    setEditDate(rec.date);
    setEditWeight(String(weightNumber(rec.weight, unit)));
    setEditSets([...rec.sets]);
  };

  const saveEdit = () => {
    const w = parseFloat(editWeight);
    if (!w || w <= 0) return Alert.alert(t('machine.invalidWeight'));
    if (editSets.some(r => r <= 0)) return Alert.alert(t('machine.invalidReps'));
    // 没动重量就原样保留 kg 值。显示值是舍入过的，换算回去会和原值差一点点，
    // 只改了日期或次数时不能让重量跟着悄悄变。
    const kg = editWeight === String(weightNumber(editRec.weight, unit)) ? editRec.weight : fromUnit(w, unit);
    const volume = calcVolume(kg, editSets);
    const updated = { ...editRec, date: editDate, weight: kg, sets: [...editSets], volume };
    setEditRec(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMutation.mutate(updated);
  };

  const deleteRecord = (rec) => {
    Alert.alert(t('machine.deleteRecordTitle'), t('machine.deleteRecordMessage', { date: rec.date }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
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
          message: `${formatSetLine(rec.weight, rec.sets, unit, '?')}  |  ${formatVolume(rec.volume, unit)}`,
          options: [t('common.cancel'), t('common.edit'), t('common.delete')],
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
        `${formatSetLine(rec.weight, rec.sets, unit, '?')}  |  ${formatVolume(rec.volume, unit)}`,
        [
          { text: t('common.edit'), onPress: () => openEdit(rec) },
          { text: t('common.delete'), style: 'destructive', onPress: () => deleteRecord(rec) },
          { text: t('common.cancel'), style: 'cancel' },
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
      data: entries.map(([, v]) => volumeNumber(v, unit)),
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
              <Text style={s.bestLabel} accessible={false}>{t('machine.bestLabel')}</Text>
            </View>
            <Text style={s.bestVolume}>{volumeNumber(bestRecord.volume, unit).toLocaleString()}<Text style={s.unitSuffix}> {unit}</Text></Text>
            <Text style={s.bestDetail}>
              {formatSetLine(bestRecord.weight, bestRecord.sets, unit)} · {bestRecord.date}
            </Text>
          </View>
        )}

        {records.length > 0 && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{records.length}</Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.3}>{t('common.statRecords')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{trainDays}</Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.3}>{t('common.statDays')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>
                {volumeNumber(totalVolume, unit).toLocaleString()}
              </Text>
              <Text style={s.statLabel} maxFontSizeMultiplier={1.3}>{t('common.statVolume')}</Text>
            </View>
          </View>
        )}

        <View style={s.formCard}>
          <Text style={s.sectionTitle}>{t('machine.sectionRecords')}</Text>

          <View style={s.dateRow}>
            <Text style={s.fieldLabel}>{t('machine.dateLabel')}</Text>
            <DatePicker value={date} onChange={setDate} />
          </View>

          <View style={s.weightHead}>
            <Text style={[s.fieldLabel, { marginBottom: 0 }]}>{t('machine.weightTitle')}</Text>
            <View style={s.unitSeg} accessibilityRole="radiogroup" accessibilityLabel={t('machine.unitA11y')}>
              {WEIGHT_UNITS.map(u => (
                <TouchableOpacity
                  key={u}
                  style={[s.unitSegBtn, u === unit && s.unitSegBtnActive]}
                  onPress={() => changeUnit(u)}
                  accessibilityRole="radio"
                  accessibilityLabel={u}
                  accessibilityState={{ checked: u === unit }}
                >
                  <Text style={[s.unitSegText, u === unit && s.unitSegTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <WeightPicker value={weight} unit={unit} onChange={setWeight} />

          <View style={{ marginTop: 14 }}>
            <SetInput sets={sets} onChange={setSets} />
          </View>

          {weight ? (
            <Text style={s.preview}>
              {t('machine.estimatedVolume', { volume: formatVolume(calcVolume(fromUnit(parseFloat(weight) || 0, unit), sets), unit) })}
            </Text>
          ) : null}

          <TouchableOpacity style={s.saveBtn} onPress={save} accessibilityRole="button" accessibilityLabel={t('machine.saveRecord')}>
            <Text style={s.saveBtnText}>{t('machine.saveRecord')}</Text>
          </TouchableOpacity>
        </View>

        {hasChart && (
          <View style={s.chartCard}>
            <Text style={s.sectionTitle}>{t('machine.trendTitle')}</Text>
            <InteractiveLineChart
              labels={labels}
              data={chartValues}
              unit={unit}
              width={W - 48}
              height={210}
              gradientId="machine_grad"
            />
          </View>
        )}

        {records.length > 0 && (
          <View style={s.historyCard}>
            <Text style={s.sectionTitle}>{t('machine.historyTitle')}</Text>
            {records.slice(0, 20).map((r, i) => (
              <TouchableOpacity
                key={r.id}
                style={[s.histRow, i === 0 && { borderTopWidth: 0 }]}
                onPress={() => showActions(r)}
                accessibilityRole="button"
                accessibilityLabel={t('machine.recordA11y', { date: r.date, setLine: formatSetLine(r.weight, r.sets, unit, '?'), volume: formatVolume(r.volume, unit) })}
              >
                <View style={s.histTop}>
                  <Text style={s.histDate} maxFontSizeMultiplier={1.2}>{r.date}</Text>
                  <Text style={s.histVol} maxFontSizeMultiplier={1.2}>{formatVolume(r.volume, unit)}</Text>
                </View>
                <Text style={s.histDetail} maxFontSizeMultiplier={1.2}>
                  {formatSetLine(r.weight, r.sets, unit, '?')}
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
            <Text style={s.editTitle}>{t('machine.editTitle')}</Text>

            <View style={s.dateRow}>
              <Text style={s.fieldLabel}>{t('machine.dateLabel')}</Text>
              <DatePicker value={editDate} onChange={setEditDate} />
            </View>

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>{t('machine.weightLabel', { unit })}</Text>
            <WeightPicker value={editWeight} unit={unit} onChange={setEditWeight} />

            <View style={{ marginTop: 14 }}>
              <SetInput sets={editSets} onChange={setEditSets} />
            </View>

            {editWeight ? (
              <Text style={s.preview}>
                {t('machine.volumeLabel', { volume: formatVolume(calcVolume(fromUnit(parseFloat(editWeight) || 0, unit), editSets), unit) })}
              </Text>
            ) : null}

            <View style={s.editActions}>
              <TouchableOpacity style={s.editCancelBtn} onPress={() => setEditRec(null)} accessibilityRole="button" accessibilityLabel={t('machine.cancelEditA11y')}>
                <Text style={s.editCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editSaveBtn} onPress={saveEdit} accessibilityRole="button" accessibilityLabel={t('machine.saveEditA11y')}>
                <Text style={s.editSaveText}>{t('common.save')}</Text>
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
  weightHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, marginBottom: 8,
  },
  // kg / lb 分段切换，样式照个人页的主题切换
  unitSeg: {
    flexDirection: 'row', gap: 2,
    backgroundColor: t.card2, padding: 3, borderRadius: 10,
    borderWidth: 1, borderColor: t.border,
  },
  unitSegBtn: {
    minWidth: 44, height: 30, borderRadius: 8, paddingHorizontal: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  unitSegBtnActive: {
    backgroundColor: t.card,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  unitSegText: { fontSize: 13, fontFamily: FONTS.ui, fontWeight: '600', color: t.textMuted },
  unitSegTextActive: { color: t.textPrimary },
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
