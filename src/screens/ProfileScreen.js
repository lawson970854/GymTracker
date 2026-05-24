import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetchGymData, loadProfile, saveProfile } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { supabase } from '../supabase';
import { useTheme } from '../ThemeContext';

const THEME_OPTIONS = [
  { value: 'light', label: '明亮' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
];

const PROFILE_FIELDS = [
  { key: 'nickname', label: '昵称' },
  { key: 'gender', label: '性别' },
  { key: 'birthDate', label: '出生日期' },
  { key: 'height', label: '身高', unit: 'cm' },
  { key: 'weight', label: '体重', unit: 'kg' },
  { key: 'city', label: '居住城市' },
];

const GENDERS = ['男', '女'];
const YEARS = Array.from({ length: 71 }, (_, i) => String(1940 + i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const HEIGHTS = Array.from({ length: 81 }, (_, i) => String(140 + i));
const WEIGHTS = Array.from({ length: 111 }, (_, i) => String(40 + i));

const ITEM_H = 44;

function WheelPicker({ items, value, onChange }) {
  const { theme } = useTheme();
  const ref = useRef(null);
  const idx = Math.max(0, items.indexOf(String(value)));

  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollTo({ y: idx * ITEM_H, animated: false });
    }, 80);
  }, []);

  const onMomentumEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    onChange(items[clamped]);
  };

  return (
    <View style={{ height: ITEM_H * 5, overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        style={[wp.highlight, { borderColor: theme.accent }]}
      />
      <ScrollView
        ref={ref}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        nestedScrollEnabled
        accessibilityLabel={`当前选中：${value}`}
      >
        {items.map((item) => (
          <View key={item} style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[
              { fontSize: 17, color: theme.textFaint },
              String(value) === item && { color: theme.accent, fontWeight: '700', fontSize: 18 },
            ]}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wp = StyleSheet.create({
  highlight: {
    position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H,
    borderTopWidth: 1, borderBottomWidth: 1, zIndex: 1,
  },
});

export default function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const { data: gymData } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const gyms = gymData?.gyms || [];
  const records = gymData?.records || [];
  const categories = gymData?.categories || [];

  const [profile, setProfile] = useState({ nickname: '', gender: '', birthDate: '', height: '', weight: '', city: '' });
  const [editVisible, setEditVisible] = useState(false);
  const [editData, setEditData] = useState({});

  React.useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  const totalMachines = gyms.reduce((sum, g) => sum + (g.machines?.length || 0), 0);
  const dailyMap = {};
  records.forEach(r => { dailyMap[r.date] = (dailyMap[r.date] || 0) + r.volume; });
  const dailyEntries = Object.entries(dailyMap);
  const totalVolume = records.reduce((sum, r) => sum + r.volume, 0);
  const trainDays = dailyEntries.length;
  const bestDay = dailyEntries.length
    ? dailyEntries.reduce((b, [d, v]) => v > b.vol ? { date: d, vol: v } : b, { date: '-', vol: 0 })
    : null;
  const gymStats = gyms.map(gym => {
    const gymRecs = records.filter(r => r.gymId === gym.id);
    const vol = gymRecs.reduce((sum, r) => sum + r.volume, 0);
    return { gym, vol, count: gymRecs.length };
  }).filter(g => g.count > 0).sort((a, b) => b.vol - a.vol);

  const openEdit = () => {
    const parts = (profile.birthDate || '').split('-');
    setEditData({
      ...profile,
      gender: profile.gender || '男',
      birthYear: parts[0] || '1990',
      birthMonth: parts[1] || '01',
      birthDay: parts[2] || '01',
      height: profile.height ? String(profile.height) : '170',
      weight: profile.weight ? String(profile.weight) : '70',
    });
    setEditVisible(true);
  };

  const saveEdit = async () => {
    const { birthYear, birthMonth, birthDay, ...rest } = editData;
    const data = {
      ...rest,
      birthDate: birthYear ? `${birthYear}-${birthMonth}-${birthDay}` : '',
    };
    await saveProfile(data);
    setProfile(data);
    setEditVisible(false);
  };

  const clearAllData = () => {
    Alert.alert('清除所有数据', '此操作将删除所有健身房、器械和训练记录，且无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '继续', style: 'destructive', onPress: () => {
          Alert.alert('再次确认', '数据清除后无法找回，确定要继续吗？', [
            { text: '取消', style: 'cancel' },
            { text: '确认清除', style: 'destructive', onPress: async () => {} },
          ]);
        },
      },
    ]);
  };

  const sheetPaddingBottom = Math.max(insets.bottom + 16, 32);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        <View style={s.avatarSection}>
          <Text style={s.avatar} accessible={false}>🏋️</Text>
          <Text style={s.appName}>GymTracker</Text>
          <Text style={s.version}>v1.0.0</Text>
        </View>

        {bestDay && (
          <View style={s.bestCard}>
            <View style={s.bestCardHeader}>
              <Text style={s.bestCardTag} accessible={false}>🔥 单日最佳</Text>
              <Text style={s.bestCardDate}>{bestDay.date}</Text>
            </View>
            <Text style={s.bestCardVol} maxFontSizeMultiplier={1.3}>{bestDay.vol.toLocaleString()}</Text>
            <Text style={s.bestCardUnit}>千克·次</Text>
          </View>
        )}

        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>个人信息</Text>
            <TouchableOpacity
              onPress={openEdit}
              style={s.editBtn}
              accessibilityRole="button"
              accessibilityLabel="编辑个人信息"
            >
              <Text style={s.editBtnText}>编辑</Text>
            </TouchableOpacity>
          </View>
          {PROFILE_FIELDS.map(({ key, label, unit }) => (
            <View key={key} style={s.infoRow}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoValue}>
                {profile[key] ? (unit ? `${profile[key]} ${unit}` : profile[key]) : '—'}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>数据概览</Text>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{gyms.length}</Text>
              <Text style={s.statLabel}>健身房</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{totalMachines}</Text>
              <Text style={s.statLabel}>器械</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{categories.length}</Text>
              <Text style={s.statLabel}>分类</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{records.length}</Text>
              <Text style={s.statLabel}>训练记录</Text>
            </View>
          </View>
        </View>

        {records.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>训练概况</Text>
            <View style={s.statsGrid}>
              <View style={s.statItem}>
                <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{trainDays}</Text>
                <Text style={s.statLabel}>训练天数</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statNum} maxFontSizeMultiplier={1.3}>{totalVolume.toLocaleString()}</Text>
                <Text style={s.statLabel}>总训练量</Text>
              </View>
            </View>
          </View>
        )}

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

        <View style={s.card}>
          <Text style={s.cardTitle}>外观</Text>
          <View style={s.themeRow}>
            {THEME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.themeBtn, mode === opt.value && s.themeBtnActive]}
                onPress={() => setMode(opt.value)}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityState={{ checked: mode === opt.value }}
              >
                <Text style={[s.themeBtnText, mode === opt.value && s.themeBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>关于</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>存储方式</Text>
            <Text style={s.infoValue}>云端同步</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>训练量单位</Text>
            <Text style={s.infoValue}>千克·次</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>最佳记录标准</Text>
            <Text style={s.infoValue}>重量 × 总次数</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.dangerBtn}
          onPress={clearAllData}
          accessibilityRole="button"
          accessibilityLabel="清除所有数据"
        >
          <Text style={s.dangerBtnText}>清除所有数据</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.logoutBtn}
          onPress={() => {
            Alert.alert('退出登录', '确认退出？', [
              { text: '取消', style: 'cancel' },
              { text: '退出', style: 'destructive', onPress: () => supabase.auth.signOut() },
            ]);
          }}
          accessibilityRole="button"
          accessibilityLabel="退出登录"
        >
          <Text style={s.logoutBtnText}>退出登录</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal transparent visible={editVisible} animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setEditVisible(false)}>
          <View style={[s.modalSheet, { paddingBottom: sheetPaddingBottom }]} onStartShouldSetResponder={() => true}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>编辑个人信息</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={s.fieldLabel}>昵称</Text>
              <TextInput
                style={s.fieldInput}
                value={editData.nickname || ''}
                onChangeText={v => setEditData(d => ({ ...d, nickname: v }))}
                placeholder="请输入昵称"
                placeholderTextColor={theme.textFaint}
                returnKeyType="done"
                autoCorrect={false}
                accessibilityLabel="昵称"
              />

              <Text style={s.fieldLabel}>性别</Text>
              <View style={s.pickerRow}>
                <WheelPicker
                  items={GENDERS}
                  value={editData.gender || '男'}
                  onChange={v => setEditData(d => ({ ...d, gender: v }))}
                />
              </View>

              <Text style={s.fieldLabel}>出生日期</Text>
              <View style={s.pickerRow}>
                <View style={{ flex: 3 }}>
                  <Text style={s.pickerColLabel}>年</Text>
                  <WheelPicker
                    items={YEARS}
                    value={editData.birthYear || '1990'}
                    onChange={v => setEditData(d => ({ ...d, birthYear: v }))}
                  />
                </View>
                <View style={s.pickerDivider} />
                <View style={{ flex: 2 }}>
                  <Text style={s.pickerColLabel}>月</Text>
                  <WheelPicker
                    items={MONTHS}
                    value={editData.birthMonth || '01'}
                    onChange={v => setEditData(d => ({ ...d, birthMonth: v }))}
                  />
                </View>
                <View style={s.pickerDivider} />
                <View style={{ flex: 2 }}>
                  <Text style={s.pickerColLabel}>日</Text>
                  <WheelPicker
                    items={DAYS}
                    value={editData.birthDay || '01'}
                    onChange={v => setEditData(d => ({ ...d, birthDay: v }))}
                  />
                </View>
              </View>

              <Text style={s.fieldLabel}>身高（cm）</Text>
              <View style={s.pickerRow}>
                <WheelPicker
                  items={HEIGHTS}
                  value={editData.height || '170'}
                  onChange={v => setEditData(d => ({ ...d, height: v }))}
                />
              </View>

              <Text style={s.fieldLabel}>体重（kg）</Text>
              <View style={s.pickerRow}>
                <WheelPicker
                  items={WEIGHTS}
                  value={editData.weight || '70'}
                  onChange={v => setEditData(d => ({ ...d, weight: v }))}
                />
              </View>

              <Text style={s.fieldLabel}>居住城市</Text>
              <TextInput
                style={s.fieldInput}
                value={editData.city || ''}
                onChangeText={v => setEditData(d => ({ ...d, city: v }))}
                placeholder="例：上海"
                placeholderTextColor={theme.textFaint}
                returnKeyType="done"
                autoCorrect={false}
                accessibilityLabel="居住城市"
              />

            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setEditVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="取消"
              >
                <Text style={s.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.saveBtn}
                onPress={saveEdit}
                accessibilityRole="button"
                accessibilityLabel="保存"
              >
                <Text style={s.saveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: { fontSize: 60, marginBottom: 10 },
  appName: { fontSize: 22, fontWeight: '800', color: t.accent, marginBottom: 4 },
  version: { fontSize: 13, color: t.textFaint },

  bestCard: {
    backgroundColor: t.card, borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  bestCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  bestCardTag: { fontSize: 12, color: t.orangeLabel, fontWeight: '600' },
  bestCardDate: { fontSize: 12, color: t.textFaint },
  bestCardVol: { fontSize: 40, fontWeight: '900', color: t.accent, textAlign: 'center', marginBottom: 4 },
  bestCardUnit: { fontSize: 14, color: t.textMuted, textAlign: 'center' },

  card: {
    backgroundColor: t.card, borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: t.textMuted, marginBottom: 14, letterSpacing: 0.6 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },

  editBtn: { backgroundColor: t.accentBg, borderRadius: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  editBtnText: { color: t.accent, fontSize: 13, fontWeight: '600' },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: t.border,
  },
  infoLabel: { fontSize: 15, color: t.textSecondary },
  infoValue: { fontSize: 15, color: t.textPrimary },

  statsGrid: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: t.accent, marginBottom: 4 },
  statLabel: { fontSize: 12, color: t.textMuted },

  gymRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: t.borderAlt,
  },
  gymRank: { fontSize: 13, fontWeight: '700', color: t.textFaint, width: 28 },
  gymInfo: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: '600', color: t.textPrimary, marginBottom: 2 },
  gymSub: { fontSize: 12, color: t.textMuted },
  gymVol: { fontSize: 14, fontWeight: '700', color: t.accent },

  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: {
    flex: 1, minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.input, borderWidth: 1.5, borderColor: 'transparent',
  },
  themeBtnActive: { borderColor: t.accent, backgroundColor: t.accentBg },
  themeBtnText: { fontSize: 14, fontWeight: '500', color: t.textMuted },
  themeBtnTextActive: { color: t.accent, fontWeight: '700' },

  dangerBtn: {
    borderWidth: 1, borderColor: '#FFB3B3', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  dangerBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    marginTop: 8, marginBottom: 32, padding: 16, borderRadius: 12,
    backgroundColor: t.card, alignItems: 'center',
    borderWidth: 1, borderColor: t.border,
  },
  logoutBtnText: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: t.card,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, maxHeight: '92%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: t.border,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: t.textPrimary, marginBottom: 20, textAlign: 'center' },

  fieldLabel: { fontSize: 13, color: t.textMuted, marginBottom: 6, marginTop: 14 },
  fieldInput: {
    backgroundColor: t.input, borderRadius: 10, padding: 12,
    fontSize: 15, color: t.textPrimary,
  },

  pickerRow: {
    flexDirection: 'row',
    backgroundColor: t.input,
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  pickerColLabel: {
    textAlign: 'center', fontSize: 12, color: t.textMuted,
    paddingTop: 6, paddingBottom: 2,
  },
  pickerDivider: { width: 1, backgroundColor: t.border, marginVertical: 10 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: t.input,
  },
  cancelBtnText: { fontSize: 15, color: t.textMuted, fontWeight: '600' },
  saveBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: t.accent,
  },
  saveBtnText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
});
