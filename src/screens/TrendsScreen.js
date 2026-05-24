import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useQuery } from '@tanstack/react-query';
import { fetchGymData } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { useTheme } from '../ThemeContext';

const W = Dimensions.get('window').width;

export default function TrendsScreen() {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { data } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const gyms = data?.gyms || [];
  const records = data?.records || [];

  const dailyVolume = () => {
    const map = {};
    records.forEach(r => {
      map[r.date] = (map[r.date] || 0) + r.volume;
    });
    const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    return entries;
  };

  const entries = dailyVolume();
  const last14 = entries.slice(-14);
  const hasChart = last14.length >= 2;

  const totalVolume = records.reduce((s, r) => s + r.volume, 0);
  const totalSessions = records.length;
  const bestDay = entries.reduce((best, [d, v]) => v > best.vol ? { date: d, vol: v } : best, { date: '-', vol: 0 });

  const gymStats = gyms.map(gym => {
    const gymRecs = records.filter(r => r.gymId === gym.id);
    const vol = gymRecs.reduce((s, r) => s + r.volume, 0);
    const machines = gym.machines?.length || 0;
    return { gym, vol, count: gymRecs.length, machines };
  }).sort((a, b) => b.vol - a.vol);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        <Text style={s.pageTitle}>趋势</Text>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{totalSessions}</Text>
            <Text style={s.statLabel} maxFontSizeMultiplier={1.2}>总记录</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{totalVolume.toLocaleString()}</Text>
            <Text style={s.statLabel} maxFontSizeMultiplier={1.2}>总训练量</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{entries.length}</Text>
            <Text style={s.statLabel} maxFontSizeMultiplier={1.2}>训练天数</Text>
          </View>
        </View>

        {bestDay.vol > 0 && (
          <View style={s.bestDayCard}>
            <Text style={s.bestDayLabel}>🔥 单日最高训练量</Text>
            <Text style={s.bestDayVal}>{bestDay.vol.toLocaleString()} 千克·次</Text>
            <Text style={s.bestDayDate}>{bestDay.date}</Text>
          </View>
        )}

        {hasChart ? (
          <View style={s.chartCard}>
            <Text style={s.sectionTitle}>每日总训练量（最近 14 天）</Text>
            <LineChart
              data={{
                labels: last14.map(([d]) => d.slice(5)),
                datasets: [{ data: last14.map(([, v]) => v) }],
              }}
              width={W - 48}
              height={200}
              chartConfig={{
                backgroundColor: theme.card,
                backgroundGradientFrom: theme.card,
                backgroundGradientTo: theme.card,
                decimalPlaces: 0,
                color: () => theme.accent,
                labelColor: () => theme.textMuted,
                propsForDots: { r: '5', strokeWidth: '2', stroke: theme.accent },
              }}
              bezier
              style={{ borderRadius: 8 }}
            />
          </View>
        ) : (
          <View style={s.noDataCard}>
            <Text style={s.noDataText}>至少需要 2 个不同日期的记录才能显示趋势图</Text>
          </View>
        )}

        {gymStats.length > 0 && (
          <View style={s.gymSection}>
            <Text style={s.sectionTitle}>各健身房统计</Text>
            {gymStats.map(({ gym, vol, count, machines }) => (
              <View key={gym.id} style={s.gymCard}>
                <View style={s.gymInfo}>
                  <Text style={s.gymName}>{gym.name}</Text>
                  <Text style={s.gymSub}>{machines} 个器械 · {count} 条记录</Text>
                </View>
                <Text style={s.gymVol}>{vol.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {records.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>还没有任何训练记录{'\n'}开始记录后这里会显示趋势</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: t.textPrimary, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: t.card, borderRadius: 12, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: t.accent, marginBottom: 2 },
  statLabel: { fontSize: 12, color: t.textMuted },
  bestDayCard: {
    backgroundColor: t.orangeBg, borderRadius: 12, padding: 16,
    marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: t.orangeBorder,
  },
  bestDayLabel: { fontSize: 13, color: t.orangeLabel, fontWeight: '600', marginBottom: 4 },
  bestDayVal: { fontSize: 26, fontWeight: '800', color: t.textPrimary, marginBottom: 2 },
  bestDayDate: { fontSize: 13, color: t.textMuted },
  chartCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  noDataCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 24,
    alignItems: 'center', marginBottom: 12,
  },
  noDataText: { color: t.textFaint, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  gymSection: {
    backgroundColor: t.card, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: t.textPrimary, marginBottom: 14 },
  gymCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: t.border,
  },
  gymInfo: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: '600', color: t.textPrimary, marginBottom: 2 },
  gymSub: { fontSize: 12, color: t.textMuted },
  gymVol: { fontSize: 16, fontWeight: '700', color: t.accent },
  emptyCard: {
    backgroundColor: t.card, borderRadius: 12, padding: 40, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  emptyText: { color: t.textFaint, fontSize: 15, textAlign: 'center', lineHeight: 24 },
});
