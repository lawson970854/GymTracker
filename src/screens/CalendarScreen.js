import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadData, today } from '../storage';

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

  const dayRecords = records.filter(r => r.date === selectedDate);

  const grouped = dayRecords.reduce((acc, rec) => {
    const gym = gyms.find(g => g.id === rec.gymId);
    const machine = gym?.machines?.find(m => m.id === rec.machineId);
    const key = `${rec.gymId}__${rec.machineId}`;
    if (!acc[key]) {
      acc[key] = {
        gymName: gym?.name || '未知健身房',
        machineName: machine?.name || '未知器械',
        records: [],
      };
    }
    acc[key].records.push(rec);
    return acc;
  }, {});

  const totalVolume = dayRecords.reduce((s, r) => s + r.volume, 0);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

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
              <Text style={s.summaryLabel}>当日总训练量</Text>
              <Text style={s.summaryValue}>{totalVolume} kg·次</Text>
              <Text style={s.summaryCount}>{dayRecords.length} 条记录</Text>
            </View>

            {Object.entries(grouped).map(([key, group]) => (
              <View key={key} style={s.groupCard}>
                <Text style={s.groupGym}>{group.gymName}</Text>
                <Text style={s.groupMachine}>{group.machineName}</Text>
                {group.records.map(r => (
                  <View key={r.id} style={s.recRow}>
                    <Text style={s.recDetail}>
                      {r.weight}kg × {r.sets?.length || '?'}组（{r.sets?.join('/') || '?'} 次）
                    </Text>
                    <Text style={s.recVol}>{r.volume} kg·次</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pickerCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 40,
    alignItems: 'center',
  },
  emptyText: { color: '#BBB', fontSize: 16 },
  summaryCard: {
    backgroundColor: '#1D9E75', borderRadius: 12, padding: 20,
    marginBottom: 12, alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  summaryValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 2 },
  summaryCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  groupCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  groupGym: { fontSize: 12, color: '#999', marginBottom: 2 },
  groupMachine: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 10 },
  recRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderTopWidth: 1, borderColor: '#F0F0F0',
  },
  recDetail: { fontSize: 14, color: '#555' },
  recVol: { fontSize: 14, fontWeight: '700', color: '#1D9E75' },
});
