import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Platform, Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchGymData, today } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import InteractiveLineChart from '../components/InteractiveLineChart';
import { useTheme, RADIUS, FONTS } from '../ThemeContext';

const W = Dimensions.get('window').width;

function DatePicker({ value, onChange }) {
  const { theme, isDark } = useTheme();

  if (Platform.OS === 'web') {
    const { TextInput } = require('react-native');
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
      display="inline"
      themeVariant={isDark ? 'dark' : 'light'}
      onChange={(_, d) => d && onChange(d.toISOString().slice(0, 10))}
      style={{ width: '100%' }}
    />
  );
}

const dp = StyleSheet.create({
  webInput: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
    marginBottom: 16,
  },
});

export default function CalendarScreen() {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [selectedDate, setSelectedDate] = useState(today());
  const { data } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const gyms = data?.gyms || [];
  const records = data?.records || [];

  const dayRecords = records.filter(r => r.date === selectedDate);
  const totalVolume = dayRecords.reduce((s, r) => s + r.volume, 0);

  const gymGroups = {};
  dayRecords.forEach(rec => {
    const gym = gyms.find(g => g.id === rec.gymId);
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
  records.forEach(r => {
    allByDate[r.date] = (allByDate[r.date] || 0) + r.volume;
  });
  const trendEntries = Object.entries(allByDate).sort(([a], [b]) => a.localeCompare(b));
  const hasTrend = trendEntries.length >= 2;
  const highlightIdx = trendEntries.findIndex(([d]) => d === selectedDate);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} nestedScrollEnabled>

        <Text style={s.pageTitle}>日历</Text>

        <View style={s.pickerCard}>
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
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
                  <View
                    key={machineId}
                    style={[s.machineBlock, idx > 0 && s.machineBlockBorder]}
                  >
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
  safe: { flex: 1, backgroundColor: t.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  pageTitle: {
    fontSize: 30, fontFamily: FONTS.uiExtra, color: t.textPrimary,
    marginBottom: 16, letterSpacing: -0.6,
  },

  pickerCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
    overflow: 'hidden',
  },

  emptyCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 40, alignItems: 'center', marginBottom: 12,
  },
  emptyText: { color: t.textFaint, fontSize: 15, fontFamily: FONTS.ui },

  // Hero fill 当日总训练量
  summaryCard: {
    backgroundColor: t.accent,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 20, paddingVertical: 20,
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }, elevation: 3,
  },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: {
    fontSize: 12, fontFamily: FONTS.uiBold, color: t.onAccent,
    letterSpacing: 0.5, opacity: 0.9,
  },
  summaryUnit: { fontSize: 11, color: t.onAccent, opacity: 0.8 },
  summaryValue: {
    fontSize: 50, fontFamily: FONTS.numBold, color: t.onAccent,
    textAlign: 'center', marginBottom: 6, letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  summaryCount: { fontSize: 11.5, color: t.onAccent, opacity: 0.82, textAlign: 'right', fontFamily: FONTS.ui },
  unitSuffix: { fontSize: 14, color: t.onAccent, opacity: 0.7, fontFamily: FONTS.ui },

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

  machineBlock: { paddingTop: 10 },
  machineBlockBorder: { borderTopWidth: 1, borderColor: t.borderAlt, marginTop: 10 },
  machineName: { fontSize: 15, fontFamily: FONTS.uiBold, color: t.textPrimary, marginBottom: 8 },

  recRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10,
    paddingVertical: 5,
  },
  recDetail: { fontSize: 12.5, color: t.textSecondary, fontFamily: FONTS.ui, flexShrink: 1 },
  recVol: {
    fontSize: 13, fontFamily: FONTS.num, color: t.accentInk,
    fontVariant: ['tabular-nums'],
  },

  chartCard: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 18, paddingHorizontal: 16, marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  chartTitle: { fontSize: 14, fontFamily: FONTS.uiBold, color: t.textPrimary, marginBottom: 8 },
});
