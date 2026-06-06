import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchGymData, today } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import InteractiveLineChart from '../components/InteractiveLineChart';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';

const W = Dimensions.get('window').width;
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

// ─── 自定义日历网格 ───────────────────────────────────────────────
function CalendarGrid({ selectedDate, onSelect, recordDates }) {
  const { theme: t } = useTheme();
  const s = useMemo(() => makeCalStyles(t), [t]);
  const todayStr = today();

  // 初始视图月份跟着 selectedDate
  const initYM = useMemo(() => {
    const parts = selectedDate.split('-');
    return { y: Number(parts[0]), m: Number(parts[1]) };
  }, []);
  const [viewYear, setViewYear] = useState(initYM.y);
  const [viewMonth, setViewMonth] = useState(initYM.m);

  // 当外部（比如从图表点击）改变 selectedDate 时，同步视图月份
  useEffect(() => {
    const parts = selectedDate.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    setViewYear(y);
    setViewMonth(m);
  }, [selectedDate]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  // 生成当月所有日期格（Monday-first，空格 = null）
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // 0=Mon … 6=Sun
    const arr = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(
        `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }
    return arr;
  }, [viewYear, viewMonth]);

  return (
    <View>
      {/* 月份导航 */}
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={t.accentInk} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{viewYear} 年 {viewMonth} 月</Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={t.accentInk} />
        </TouchableOpacity>
      </View>

      {/* 星期头 */}
      <View style={s.weekRow}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={s.weekLabel}>{d}</Text>
        ))}
      </View>

      {/* 日期格 */}
      <View style={s.grid}>
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <View key={`empty-${idx}`} style={s.cell} />;

          const isSelected = dateStr === selectedDate;
          const isToday    = dateStr === todayStr;
          const hasRecord  = recordDates.has(dateStr);

          return (
            <TouchableOpacity
              key={dateStr}
              style={s.cell}
              onPress={() => onSelect(dateStr)}
              activeOpacity={0.75}
            >
              <View style={[s.circle, isSelected && { backgroundColor: t.accent }]}>
                <Text style={[
                  s.dayNum,
                  isToday && !isSelected && { color: t.accent },
                  isSelected && { color: t.onAccent },
                ]}>
                  {parseInt(dateStr.slice(8), 10)}
                </Text>
              </View>
              {/* 训练标记点 */}
              {hasRecord
                ? <View style={[s.dot, isSelected && { backgroundColor: t.onAccent }]} />
                : <View style={s.dotPlaceholder} />
              }
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeCalStyles = (t) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontFamily: FONTS.uiBold, color: t.textPrimary },

  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: {
    flex: 1, textAlign: 'center',
    fontSize: 11, fontFamily: FONTS.uiBold,
    color: t.textMuted, letterSpacing: 0.5,
    paddingBottom: 6,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.2857%', // 100/7
    alignItems: 'center', paddingVertical: 4,
  },
  circle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNum: { fontSize: 14, fontFamily: FONTS.num, color: t.textPrimary },
  dot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: t.accent, marginTop: 2,
  },
  dotPlaceholder: { width: 5, height: 5, marginTop: 2 }, // 占位，保持高度一致
});

// ─── 主屏 ─────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [selectedDate, setSelectedDate] = useState(today());
  const { data } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const gyms    = data?.gyms    || [];
  const records = data?.records || [];

  // 有训练记录的日期集合
  const recordDates = useMemo(() => new Set(records.map(r => r.date)), [records]);

  const dayRecords = records.filter(r => r.date === selectedDate);
  const totalVolume = dayRecords.reduce((sum, r) => sum + r.volume, 0);

  const gymGroups = {};
  dayRecords.forEach(rec => {
    const gym     = gyms.find(g => g.id === rec.gymId);
    const machine = gym?.machines?.find(m => m.id === rec.machineId);
    if (!gymGroups[rec.gymId]) {
      gymGroups[rec.gymId] = { gymName: gym?.name || '未知健身房', machines: {} };
    }
    if (!gymGroups[rec.gymId].machines[rec.machineId]) {
      gymGroups[rec.gymId].machines[rec.machineId] = {
        machineName: machine?.name || '未知器械',
        records: [],
      };
    }
    gymGroups[rec.gymId].machines[rec.machineId].records.push(rec);
  });

  const allByDate = {};
  records.forEach(r => { allByDate[r.date] = (allByDate[r.date] || 0) + r.volume; });
  const trendEntries = Object.entries(allByDate).sort(([a], [b]) => a.localeCompare(b));
  const hasTrend     = trendEntries.length >= 2;
  const highlightIdx = trendEntries.findIndex(([d]) => d === selectedDate);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} nestedScrollEnabled>

        <Text style={s.pageTitle}>日历</Text>

        {/* 自定义日历网格 */}
        <View style={s.pickerCard}>
          <CalendarGrid
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            recordDates={recordDates}
          />
        </View>

        {dayRecords.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>该日期没有训练记录</Text>
          </View>
        ) : (
          <>
            <View style={s.summaryCard}>
              <View style={s.summaryTopRow}>
                <Text style={s.summaryLabel}>当日总训练量</Text>
                <Text style={s.summaryUnit}>千克·次</Text>
              </View>
              <Text style={s.summaryValue}>{totalVolume.toLocaleString()}</Text>
              <Text style={s.summaryCount}>{dayRecords.length} 条记录</Text>
            </View>

            {Object.entries(gymGroups).map(([gymId, gymGroup]) => (
              <View key={gymId} style={s.gymCard}>
                <Text style={s.gymTitle}>{gymGroup.gymName}</Text>
                {Object.entries(gymGroup.machines).map(([machineId, mg], idx) => (
                  <View key={machineId} style={[s.machineBlock, idx > 0 && s.machineBlockBorder]}>
                    <Text style={s.machineName}>{mg.machineName}</Text>
                    {mg.records.map(r => (
                      <View key={r.id} style={s.recRow}>
                        <Text style={s.recDetail}>
                          {r.weight} 千克 × {r.sets?.length || '?'}组（{r.sets?.join('/') || '?'} 次）
                        </Text>
                        <Text style={s.recVol}>{r.volume.toLocaleString()} 千克·次</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {hasTrend && (
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>每日训练量趋势</Text>
            <InteractiveLineChart
              labels={trendEntries.map(([d]) => d.slice(5))}
              data={trendEntries.map(([, v]) => v)}
              width={W - 48}
              height={210}
              gradientId="calendar_grad"
              highlightIndex={highlightIdx >= 0 ? highlightIdx : null}
            />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: t.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  pageTitle: {
    fontSize: 30, fontFamily: FONTS.uiExtra, color: t.textPrimary,
    marginBottom: 16, letterSpacing: -0.6,
  },

  pickerCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },

  emptyCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 40, alignItems: 'center', marginBottom: 12,
  },
  emptyText: { color: t.textFaint, fontSize: 15, fontFamily: FONTS.ui },

  summaryCard: {
    backgroundColor: t.accent,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 20, paddingVertical: 20,
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }, elevation: 3,
  },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel:  { fontSize: 12, fontFamily: FONTS.uiBold, color: t.onAccent, letterSpacing: 0.5, opacity: 0.9 },
  summaryUnit:   { fontSize: 11, color: t.onAccent, opacity: 0.8 },
  summaryValue:  {
    fontSize: 50, fontFamily: FONTS.numBold, color: t.onAccent,
    textAlign: 'center', marginBottom: 6, letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  summaryCount:  { fontSize: 11.5, color: t.onAccent, opacity: 0.82, textAlign: 'right', fontFamily: FONTS.ui },

  gymCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 18, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  gymTitle: {
    fontSize: 12, fontFamily: FONTS.uiBold, color: t.accentInk,
    letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase',
  },

  machineBlock:       { paddingTop: 10 },
  machineBlockBorder: { borderTopWidth: 1, borderColor: t.borderAlt, marginTop: 10 },
  machineName:        { fontSize: 15, fontFamily: FONTS.uiBold, color: t.textPrimary, marginBottom: 8 },

  recRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10,
    paddingVertical: 5,
  },
  recDetail: { fontSize: 12.5, color: t.textSecondary, fontFamily: FONTS.ui, flexShrink: 1 },
  recVol:    { fontSize: 13, fontFamily: FONTS.num, color: t.accentInk, fontVariant: ['tabular-nums'] },

  chartCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 18, paddingHorizontal: 16, marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  chartTitle: { fontSize: 14, fontFamily: FONTS.uiBold, color: t.textPrimary, marginBottom: 8 },
});
