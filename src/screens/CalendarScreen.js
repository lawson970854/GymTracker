import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Platform, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadData, today } from '../storage';
import InteractiveLineChart from '../components/InteractiveLineChart';

const W = Dimensions.get('window').width;

function DatePicker({ value, onChange }) {
  if (Platform.OS === 'web') {
    const { TextInput } = require('react-native');
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
    <DateTimePicker
      value={new Date(value)}
      mode="date"
      display="inline"
      onChange={(_, d) => d && onChange(d.toISOString().slice(0, 10))}
      style={{ width: '100%' }}
    />
  );
}

const dp = StyleSheet.create({
  webInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
    marginBottom: 16,
  },
});

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [gyms, setGyms] = useState([]);
  const [records, setRecords] = useState([]);

  useFocusEffect(useCallback(() => {
    loadData().then(d => {
      setGyms(d.gyms);
      setRecords(d.records);
    });
  }, []));

  // 当日记录
  const dayRecords = records.filter(r => r.date === selectedDate);
  const totalVolume = dayRecords.reduce((s, r) => s + r.volume, 0);

  // 按健身房 → 器械 两级分组
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

  // 所有日期总训练量（用于底部趋势图）
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

        {/* 日历选择器 */}
        <View style={s.pickerCard}>
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
        </View>

        {dayRecords.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>该日期没有训练记录</Text>
          </View>
        ) : (
          <>
            {/* 当日总览 */}
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>当日总训练量</Text>
              <Text style={s.summaryValue}>{totalVolume.toLocaleString()} kg·次</Text>
              <Text style={s.summaryCount}>{dayRecords.length} 条记录</Text>
            </View>

            {/* 按健身房分组 */}
            {Object.entries(gymGroups).map(([gymId, gymGroup]) => (
              <View key={gymId} style={s.gymCard}>
                {/* 健身房标题 */}
                <Text style={s.gymTitle}>{gymGroup.gymName}</Text>

                {/* 该健身房下的各器械 */}
                {Object.entries(gymGroup.machines).map(([machineId, mg], idx) => (
                  <View
                    key={machineId}
                    style={[s.machineBlock, idx > 0 && s.machineBlockBorder]}
                  >
                    <Text style={s.machineName}>{mg.machineName}</Text>
                    {mg.records.map(r => (
                      <View key={r.id} style={s.recRow}>
                        <Text style={s.recDetail}>
                          {r.weight}kg × {r.sets?.length || '?'}组（{r.sets?.join('/') || '?'} 次）
                        </Text>
                        <Text style={s.recVol}>{r.volume.toLocaleString()} kg·次</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* 底部趋势图 */}
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  pickerCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 40, alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: { color: '#BBB', fontSize: 16 },

  summaryCard: {
    backgroundColor: '#1D9E75', borderRadius: 12, padding: 20,
    marginBottom: 12, alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  summaryValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 2 },
  summaryCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  gymCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  gymTitle: {
    fontSize: 12, fontWeight: '700', color: '#1D9E75',
    letterSpacing: 0.4, marginBottom: 10, textTransform: 'uppercase',
  },

  machineBlock: { paddingTop: 10 },
  machineBlockBorder: { borderTopWidth: 1, borderColor: '#F0F0F0', marginTop: 10 },
  machineName: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 8 },

  recRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5, borderTopWidth: 1, borderColor: '#F5F5F5',
  },
  recDetail: { fontSize: 13, color: '#555' },
  recVol: { fontSize: 13, fontWeight: '700', color: '#1D9E75' },

  chartCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginTop: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 8 },
});
