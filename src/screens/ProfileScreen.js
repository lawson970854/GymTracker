import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadData, saveData } from '../storage';

export default function ProfileScreen({ navigation }) {
  const [gyms, setGyms] = useState([]);
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);

  useFocusEffect(useCallback(() => {
    loadData().then(d => {
      setGyms(d.gyms);
      setRecords(d.records);
      setCategories(d.categories);
    });
  }, []));

  // 基本统计
  const totalMachines = gyms.reduce((s, g) => s + (g.machines?.length || 0), 0);

  // 训练量指标
  const dailyMap = {};
  records.forEach(r => { dailyMap[r.date] = (dailyMap[r.date] || 0) + r.volume; });
  const dailyEntries = Object.entries(dailyMap);
  const totalVolume = records.reduce((s, r) => s + r.volume, 0);
  const trainDays = dailyEntries.length;
  const bestDay = dailyEntries.length
    ? dailyEntries.reduce((b, [d, v]) => v > b.vol ? { date: d, vol: v } : b, { date: '-', vol: 0 })
    : null;

  // 各健身房排行
  const gymStats = gyms.map(gym => {
    const gymRecs = records.filter(r => r.gymId === gym.id);
    const vol = gymRecs.reduce((s, r) => s + r.volume, 0);
    return { gym, vol, count: gymRecs.length };
  }).filter(g => g.count > 0).sort((a, b) => b.vol - a.vol);

  const clearAllData = () => {
    Alert.alert('清除所有数据', '此操作将删除所有健身房、器械和记录，无法恢复，确认吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认清除', style: 'destructive', onPress: async () => {
          await saveData({ gyms: [], records: [], categories: [] });
          setGyms([]);
          setRecords([]);
          setCategories([]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* App 标识 */}
        <View style={s.avatarSection}>
          <Text style={s.avatar}>🏋️</Text>
          <Text style={s.appName}>GymTracker</Text>
          <Text style={s.version}>v1.0.0</Text>
        </View>

        {/* 数据概览 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>数据概览</Text>
          <View style={s.statsGrid}>
            <TouchableOpacity style={s.statItem} onPress={() => navigation.navigate('GymTab')}>
              <Text style={s.statNum}>{gyms.length}</Text>
              <Text style={s.statLabel}>健身房</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.statItem} onPress={() => navigation.navigate('GymTab')}>
              <Text style={s.statNum}>{totalMachines}</Text>
              <Text style={s.statLabel}>器械</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.statItem} onPress={() => navigation.navigate('CalendarTab')}>
              <Text style={s.statNum}>{records.length}</Text>
              <Text style={s.statLabel}>训练记录</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.statItem} onPress={() => navigation.navigate('CategoryTab')}>
              <Text style={s.statNum}>{categories.length}</Text>
              <Text style={s.statLabel}>分类</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 训练概况 */}
        {records.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>训练概况</Text>
            <View style={s.statsGrid}>
              <View style={s.statItem}>
                <Text style={s.statNum}>{trainDays}</Text>
                <Text style={s.statLabel}>训练天数</Text>
              </View>
              <View style={s.statItem}>
                <Text style={[s.statNum, s.statNumSm]}>{totalVolume.toLocaleString()}</Text>
                <Text style={s.statLabel}>总训练量</Text>
              </View>
            </View>
            {bestDay && (
              <View style={s.bestDayRow}>
                <Text style={s.bestDayLabel}>🔥 单日最高</Text>
                <View style={s.bestDayRight}>
                  <Text style={s.bestDayVol}>{bestDay.vol.toLocaleString()} kg·次</Text>
                  <Text style={s.bestDayDate}>{bestDay.date}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 各健身房排行 */}
        {gymStats.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>健身房排行</Text>
            {gymStats.map(({ gym, vol, count }, idx) => (
              <View key={gym.id} style={s.gymRow}>
                <Text style={s.gymRank}>#{idx + 1}</Text>
                <View style={s.gymInfo}>
                  <Text style={s.gymName}>{gym.name}</Text>
                  <Text style={s.gymSub}>{count} 条记录</Text>
                </View>
                <Text style={s.gymVol}>{vol.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 关于 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>关于</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>存储方式</Text>
            <Text style={s.infoValue}>本地存储</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>训练量单位</Text>
            <Text style={s.infoValue}>kg·次</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>最佳记录标准</Text>
            <Text style={s.infoValue}>重量 × 总次数</Text>
          </View>
        </View>

        <TouchableOpacity style={s.dangerBtn} onPress={clearAllData}>
          <Text style={s.dangerBtnText}>清除所有数据</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: { fontSize: 60, marginBottom: 10 },
  appName: { fontSize: 22, fontWeight: '800', color: '#1D9E75', marginBottom: 4 },
  version: { fontSize: 13, color: '#BBB' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#999', marginBottom: 14, letterSpacing: 0.6 },

  statsGrid: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#1D9E75', marginBottom: 4 },
  statNumSm: { fontSize: 18 },
  statLabel: { fontSize: 12, color: '#999' },

  bestDayRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: '#F0F0F0',
  },
  bestDayLabel: { fontSize: 13, color: '#E65100', fontWeight: '600' },
  bestDayRight: { alignItems: 'flex-end' },
  bestDayVol: { fontSize: 15, fontWeight: '700', color: '#333' },
  bestDayDate: { fontSize: 12, color: '#999', marginTop: 2 },

  gymRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F5F5F5',
  },
  gymRank: { fontSize: 13, fontWeight: '700', color: '#CCC', width: 28 },
  gymInfo: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 2 },
  gymSub: { fontSize: 12, color: '#999' },
  gymVol: { fontSize: 14, fontWeight: '700', color: '#1D9E75' },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F5F5F5',
  },
  infoLabel: { fontSize: 15, color: '#555' },
  infoValue: { fontSize: 15, color: '#999' },

  dangerBtn: {
    borderWidth: 1, borderColor: '#FFB3B3', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  dangerBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },
});
