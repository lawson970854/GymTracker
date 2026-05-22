import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Platform, Dimensions, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { loadData, saveData, uid, calcVolume, getBestRecord, today } from '../storage';
import SetInput from '../components/SetInput';
import TrophyModal from '../components/TrophyModal';

const W = Dimensions.get('window').width;

function DatePicker({ value, onChange }) {
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
    <DateTimePicker
      value={new Date(value)}
      mode="date"
      display="compact"
      onChange={(_, d) => d && onChange(d.toISOString().slice(0, 10))}
      style={{ alignSelf: 'flex-start' }}
    />
  );
}

const dp = StyleSheet.create({
  webInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15,
  },
});

export default function MachineScreen({ route }) {
  const { gymId, machineId, machineName } = route.params;

  const [records, setRecords] = useState([]);
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState([10, 10, 10]);
  const [trophy, setTrophy] = useState(null); // 'gold' | 'silver' | null

  useFocusEffect(useCallback(() => {
    loadData().then(d => {
      const recs = d.records
        .filter(r => r.gymId === gymId && r.machineId === machineId)
        .sort((a, b) => b.date.localeCompare(a.date));
      setRecords(recs);
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

    setRecords(myRecs.sort((a, b) => b.date.localeCompare(a.date)));
    setWeight('');
    setSets([10, 10, 10]);
    setDate(today());
  };

  const chartData = () => {
    const byDate = {};
    records.forEach(r => {
      if (!byDate[r.date] || r.volume > byDate[r.date]) byDate[r.date] = r.volume;
    });
    const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-10);
    return {
      labels: entries.map(([d]) => d.slice(5)),
      data: entries.map(([, v]) => v),
    };
  };

  const { labels, data: chartValues } = chartData();
  const hasChart = chartValues.length >= 2;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

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
          <Text style={s.sectionTitle}>记录训练</Text>

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
            <Text style={s.sectionTitle}>训练量趋势（最近 10 次）</Text>
            <LineChart
              data={{ labels, datasets: [{ data: chartValues }] }}
              width={W - 48}
              height={180}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: () => '#1D9E75',
                labelColor: () => '#999',
                propsForDots: { r: '4', strokeWidth: '2', stroke: '#1D9E75' },
              }}
              bezier
              style={{ borderRadius: 8 }}
            />
          </View>
        )}

        {records.length > 0 && (
          <View style={s.historyCard}>
            <Text style={s.sectionTitle}>历史记录</Text>
            {records.slice(0, 20).map(r => (
              <View key={r.id} style={s.histRow}>
                <Text style={s.histDate}>{r.date}</Text>
                <Text style={s.histDetail}>
                  {r.weight}kg × {r.sets?.join('/')} 次
                </Text>
                <Text style={s.histVol}>{r.volume}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      <TrophyModal visible={!!trophy} type={trophy} onClose={() => setTrophy(null)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
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
    paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  histDate: { width: 90, fontSize: 13, color: '#999' },
  histDetail: { flex: 1, fontSize: 13, color: '#555' },
  histVol: { fontSize: 14, fontWeight: '700', color: '#1D9E75' },
});
