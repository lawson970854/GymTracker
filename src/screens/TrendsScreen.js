import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { loadData } from '../storage';

const W = Dimensions.get('window').width;

export default function TrendsScreen() {
  const [gyms, setGyms] = useState([]);
  const [records, setRecords] = useState([]);

  useFocusEffect(useCallback(() => {
    loadData().then(d => {
      setGyms(d.gyms);
      setRecords(d.records);
    });
  }, []));

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

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{totalSessions}</Text>
            <Text style={s.statLabel}>总记录</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{totalVolume.toLocaleString()}</Text>
            <Text style={s.statLabel}>总训练量</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{entries.length}</Text>
            <Text style={s.statLabel}>训练天数</Text>
          </View>
        </View>

        {bestDay.vol > 0 && (
          <View style={s.bestDayCard}>
            <Text style={s.bestDayLabel}>🔥 单日最高训练量</Text>
            <Text style={s.bestDayVal}>{bestDay.vol.toLocaleString()} kg·次</Text>
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
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: () => '#1D9E75',
                labelColor: () => '#999',
                propsForDots: { r: '5', strokeWidth: '2', stroke: '#1D9E75' },
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1D9E75', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#999' },
  bestDayCard: {
    backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16,
    marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFB74D',
  },
  bestDayLabel: { fontSize: 13, color: '#E65100', fontWeight: '600', marginBottom: 4 },
  bestDayVal: { fontSize: 26, fontWeight: '800', color: '#333', marginBottom: 2 },
  bestDayDate: { fontSize: 13, color: '#999' },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  noDataCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    alignItems: 'center', marginBottom: 12,
  },
  noDataText: { color: '#BBB', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  gymSection: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 14 },
  gymCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  gymInfo: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 2 },
  gymSub: { fontSize: 12, color: '#999' },
  gymVol: { fontSize: 16, fontWeight: '700', color: '#1D9E75' },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 40, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  emptyText: { color: '#BBB', fontSize: 15, textAlign: 'center', lineHeight: 24 },
});
