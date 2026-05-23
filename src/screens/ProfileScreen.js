import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadData, saveData } from '../storage';

export default function ProfileScreen() {
  const [stats, setStats] = useState({ gyms: 0, machines: 0, records: 0, categories: 0 });

  useFocusEffect(useCallback(() => {
    loadData().then(d => {
      const machines = d.gyms.reduce((s, g) => s + (g.machines?.length || 0), 0);
      setStats({
        gyms: d.gyms.length,
        machines,
        records: d.records.length,
        categories: d.categories.length,
      });
    });
  }, []));

  const clearAllData = () => {
    Alert.alert('清除所有数据', '此操作将删除所有健身房、器械和记录，无法恢复，确认吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认清除', style: 'destructive', onPress: async () => {
          await saveData({ gyms: [], records: [], categories: [] });
          setStats({ gyms: 0, machines: 0, records: 0, categories: 0 });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        <View style={s.avatarSection}>
          <Text style={s.avatar}>🏋️</Text>
          <Text style={s.appName}>GymTracker</Text>
          <Text style={s.version}>v1.0.0</Text>
        </View>

        <View style={s.statsCard}>
          <Text style={s.cardTitle}>数据统计</Text>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{stats.gyms}</Text>
              <Text style={s.statLabel}>健身房</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{stats.machines}</Text>
              <Text style={s.statLabel}>器械</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{stats.records}</Text>
              <Text style={s.statLabel}>训练记录</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{stats.categories}</Text>
              <Text style={s.statLabel}>分类</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
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
  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: { fontSize: 64, marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: '800', color: '#1D9E75', marginBottom: 4 },
  version: { fontSize: 14, color: '#BBB' },
  statsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 14, letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#1D9E75', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#999' },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
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
