import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { fetchGymData, loadProfile, saveProfile, uploadAvatar, clearAllData } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { supabase } from '../supabase';
import { useTheme } from '../ThemeContext';
import { REGIONS, PROVINCE_NAMES, findProvinceByCity, getCitiesForProvince } from '../constants/regions';

const THEME_OPTIONS = [
  { value: 'light', label: '明亮' },
  { value: 'dark', label: '深色' },
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
      <View pointerEvents="none" style={[wp.highlight, { borderColor: theme.accent }]} />
      <ScrollView
        ref={ref}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        nestedScrollEnabled
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

  const qc = useQueryClient();
  const { data: gymData } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const gyms = gymData?.gyms || [];
  const records = gymData?.records || [];

  const [profile, setProfile] = useState({ nickname: '', gender: '', birthDate: '', height: '', weight: '', city: '', avatarUrl: '' });
  const [editVisible, setEditVisible] = useState(false);
  const [editData, setEditData] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
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

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请在系统设置中允许访问相册');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(uri);
      const updated = { ...profile, avatarUrl: url };
      await saveProfile(updated);
      setProfile(updated);
    } catch (e) {
      Alert.alert('上传失败', e.message || '请检查网络后重试');
    } finally {
      setAvatarUploading(false);
    }
  };

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

  const handleClearAllData = () => {
    Alert.alert('清除所有数据', '此操作将删除所有健身房、器械和训练记录，且无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '继续', style: 'destructive', onPress: () => {
          Alert.alert('再次确认', '数据清除后无法找回，确定要继续吗？', [
            { text: '取消', style: 'cancel' },
            { text: '确认清除', style: 'destructive', onPress: async () => {
              try {
                await clearAllData();
                // 清空缓存，让所有屏幕立即重新拉取空数据
                qc.setQueryData(GYM_DATA_KEY, { gyms: [], records: [], categories: [] });
                qc.invalidateQueries({ queryKey: GYM_DATA_KEY });
                Alert.alert('已清除', '所有训练数据已删除。');
              } catch (e) {
                Alert.alert('清除失败', e.message || '请检查网络后重试');
              }
            }},
          ]);
        },
      },
    ]);
  };

  const sheetPaddingBottom = Math.max(insets.bottom + 16, 32);
  const [activeField, setActiveField] = useState(null);

  const toggleField = (field) => setActiveField(prev => prev === field ? null : field);

  const birthDateValue = useMemo(() => {
    if (!editData.birthYear) return new Date(1990, 0, 1);
    return new Date(
      parseInt(editData.birthYear),
      parseInt(editData.birthMonth || '01') - 1,
      parseInt(editData.birthDay || '01'),
    );
  }, [editData.birthYear, editData.birthMonth, editData.birthDay]);

  const cityProvince = useMemo(
    () => findProvinceByCity(editData.city),
    [editData.city],
  );
  const cityList = useMemo(
    () => getCitiesForProvince(cityProvince),
    [cityProvince],
  );

  const firstDate = useMemo(() => {
    if (!records.length) return null;
    return records.reduce((min, r) => r.date < min ? r.date : min, records[0].date);
  }, [records]);

  const bestDayGymName = useMemo(() => {
    if (!bestDay) return null;
    const dayRecs = records.filter(r => r.date === bestDay.date);
    const gymVolMap = {};
    dayRecs.forEach(r => { gymVolMap[r.gymId] = (gymVolMap[r.gymId] || 0) + r.volume; });
    const topGymId = Object.entries(gymVolMap).sort((a, b) => b[1] - a[1])[0]?.[0];
    return gyms.find(g => g.id === topGymId)?.name || null;
  }, [records, gyms]);

  const avatarLetter = profile.nickname ? profile.nickname[0].toUpperCase() : null;
  const profileSub = [profile.gender, profile.city].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* ── 个人信息头部 ── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.avatarCircle}
            onPress={pickAvatar}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="更换头像"
          >
            {profile.avatarUrl
              ? <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
              : avatarLetter
                ? <Text style={s.avatarLetter}>{avatarLetter}</Text>
                : <Text style={s.avatarEmoji} accessible={false}>🏋️</Text>
            }
            {avatarUploading
              ? <View style={s.avatarOverlay}><ActivityIndicator color="#fff" /></View>
              : !profile.avatarUrl
                ? <View style={s.avatarCameraHint}><Ionicons name="camera" size={18} color="#fff" /></View>
                : null
            }
          </TouchableOpacity>
          <Text style={s.nickname}>{profile.nickname || 'GymTracker'}</Text>
          {profileSub ? <Text style={s.profileSub}>{profileSub}</Text> : null}
          <TouchableOpacity
            style={s.editBtn}
            onPress={openEdit}
            accessibilityRole="button"
            accessibilityLabel="编辑个人信息"
          >
            <Ionicons name="pencil-outline" size={13} color={theme.accent} />
            <Text style={s.editBtnText}>编辑资料</Text>
          </TouchableOpacity>
        </View>

        {/* ── 总训练量 + 单日最佳 ── */}
        {records.length > 0 && (
          <View style={s.highlightRow}>
            <View style={[s.hlCard, s.hlAccent]}>
              <View style={s.hlTopRow}>
                <Text style={s.hlLabel}>🏅 总训练量</Text>
                <Text style={s.hlUnit}>千克·次</Text>
              </View>
              <Text style={s.hlNum} maxFontSizeMultiplier={1.2}>{totalVolume.toLocaleString()}</Text>
              <Text style={s.hlSub}>{firstDate ? `自 ${firstDate} 起` : ''}</Text>
            </View>
            {bestDay && (
              <View style={[s.hlCard, s.hlAccent]}>
                <View style={s.hlTopRow}>
                  <Text style={s.hlLabel}>🏆 单日最佳</Text>
                  <Text style={s.hlUnit}>千克·次</Text>
                </View>
                <Text style={s.hlNum} maxFontSizeMultiplier={1.2}>{bestDay.vol.toLocaleString()}</Text>
                <Text style={s.hlSub}>{[bestDayGymName, bestDay.date].filter(Boolean).join(' · ')}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── 数据统计 2×2 ── */}
        <View style={s.statsCard}>
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{records.length}</Text>
              <Text style={s.statLabel}>训练记录</Text>
            </View>
            <View style={s.statDivV} />
            <View style={s.statCell}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{trainDays}</Text>
              <Text style={s.statLabel}>训练天数</Text>
            </View>
          </View>
          <View style={s.statDivH} />
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{gyms.length}</Text>
              <Text style={s.statLabel}>健身房</Text>
            </View>
            <View style={s.statDivV} />
            <View style={s.statCell}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{totalMachines}</Text>
              <Text style={s.statLabel}>器械</Text>
            </View>
          </View>
        </View>

        {/* ── 健身房排行 ── */}
        {gymStats.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>健身房排行</Text>
            {gymStats.map(({ gym, vol, count }, idx) => (
              <View key={gym.id} style={[s.gymRow, idx === gymStats.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.rankBadge, idx === 0 && s.rankBadgeGold]}>
                  <Text style={[s.rankNum, idx === 0 && s.rankNumGold]}>{idx + 1}</Text>
                </View>
                <View style={s.gymInfo}>
                  <Text style={s.gymName}>{gym.name}</Text>
                  <Text style={s.gymSub}>{count} 条记录</Text>
                </View>
                <Text style={s.gymVol}>{vol.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 外观 ── */}
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

        {/* ── 底部操作 ── */}
        <TouchableOpacity
          style={s.dangerBtn}
          onPress={handleClearAllData}
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

      {/* ── 编辑 Modal ── */}
      <Modal transparent visible={editVisible} animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setEditVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={[s.modalSheet, { paddingBottom: sheetPaddingBottom }]}>
              <View style={s.modalHandle} />

              <View style={s.modalTitleRow}>
                <View style={{ width: 44 }} />
                <Text style={s.modalTitle}>编辑个人信息</Text>
                <TouchableOpacity
                  style={s.modalCloseBtn}
                  onPress={() => setEditVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="关闭"
                >
                  <Ionicons name="close" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={s.fieldGroup}>

                  {/* 昵称 */}
                  <TouchableOpacity
                    style={s.fieldRow}
                    onPress={() => toggleField('nickname')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.fieldRowLabel}>昵称</Text>
                    <Text style={[s.fieldRowValue, !editData.nickname && s.fieldRowPlaceholder]}>
                      {editData.nickname || '未填写'}
                    </Text>
                  </TouchableOpacity>
                  {activeField === 'nickname' && (
                    <View style={s.fieldExpand}>
                      <TextInput
                        style={s.fieldInput}
                        value={editData.nickname || ''}
                        onChangeText={v => setEditData(d => ({ ...d, nickname: v }))}
                        placeholder="请输入昵称"
                        placeholderTextColor={theme.textFaint}
                        returnKeyType="done"
                        autoFocus
                        autoCorrect={false}
                      />
                    </View>
                  )}

                  <View style={s.fieldDivider} />

                  {/* 性别 */}
                  <TouchableOpacity
                    style={s.fieldRow}
                    onPress={() => toggleField('gender')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.fieldRowLabel}>性别</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={s.fieldRowValue}>{editData.gender || '男'}</Text>
                      <Ionicons name={activeField === 'gender' ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textFaint} />
                    </View>
                  </TouchableOpacity>
                  {activeField === 'gender' && (
                    <View style={s.fieldExpand}>
                      <WheelPicker
                        items={GENDERS}
                        value={editData.gender || '男'}
                        onChange={v => setEditData(d => ({ ...d, gender: v }))}
                      />
                    </View>
                  )}

                  <View style={s.fieldDivider} />

                  {/* 出生日期 */}
                  <TouchableOpacity
                    style={s.fieldRow}
                    onPress={() => toggleField('birthDate')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.fieldRowLabel}>出生日期</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={[s.fieldRowValue, !editData.birthYear && s.fieldRowPlaceholder]}>
                        {editData.birthYear ? `${editData.birthYear}-${editData.birthMonth}-${editData.birthDay}` : '未填写'}
                      </Text>
                      <Ionicons name={activeField === 'birthDate' ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textFaint} />
                    </View>
                  </TouchableOpacity>
                  {activeField === 'birthDate' && (
                    <View style={[s.fieldExpand, { paddingHorizontal: 0 }]}>
                      <DateTimePicker
                        value={birthDateValue}
                        mode="date"
                        display="spinner"
                        locale="zh-CN"
                        maximumDate={new Date()}
                        minimumDate={new Date(1940, 0, 1)}
                        onChange={(_, date) => {
                          if (date) setEditData(d => ({
                            ...d,
                            birthYear: String(date.getFullYear()),
                            birthMonth: String(date.getMonth() + 1).padStart(2, '0'),
                            birthDay: String(date.getDate()).padStart(2, '0'),
                          }));
                        }}
                        style={s.datePicker}
                        textColor={theme.textPrimary}
                      />
                    </View>
                  )}

                  <View style={s.fieldDivider} />

                  {/* 身高 */}
                  <TouchableOpacity
                    style={s.fieldRow}
                    onPress={() => toggleField('height')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.fieldRowLabel}>身高</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={s.fieldRowValue}>{editData.height || '170'} 厘米</Text>
                      <Ionicons name={activeField === 'height' ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textFaint} />
                    </View>
                  </TouchableOpacity>
                  {activeField === 'height' && (
                    <View style={s.fieldExpand}>
                      <WheelPicker
                        items={HEIGHTS}
                        value={editData.height || '170'}
                        onChange={v => setEditData(d => ({ ...d, height: v }))}
                      />
                    </View>
                  )}

                  <View style={s.fieldDivider} />

                  {/* 体重 */}
                  <TouchableOpacity
                    style={s.fieldRow}
                    onPress={() => toggleField('weight')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.fieldRowLabel}>体重</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={s.fieldRowValue}>{editData.weight || '70'} 千克</Text>
                      <Ionicons name={activeField === 'weight' ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textFaint} />
                    </View>
                  </TouchableOpacity>
                  {activeField === 'weight' && (
                    <View style={s.fieldExpand}>
                      <WheelPicker
                        items={WEIGHTS}
                        value={editData.weight || '70'}
                        onChange={v => setEditData(d => ({ ...d, weight: v }))}
                      />
                    </View>
                  )}

                  <View style={s.fieldDivider} />

                  {/* 居住城市 */}
                  <TouchableOpacity
                    style={s.fieldRow}
                    onPress={() => toggleField('city')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.fieldRowLabel}>居住城市</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={[s.fieldRowValue, !editData.city && s.fieldRowPlaceholder]}>
                        {editData.city || '未选择'}
                      </Text>
                      <Ionicons name={activeField === 'city' ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textFaint} />
                    </View>
                  </TouchableOpacity>
                  {activeField === 'city' && (
                    <View style={[s.fieldExpand, { flexDirection: 'row' }]}>
                      <View style={{ flex: 5 }}>
                        <Text style={s.pickerColLabel}>省份</Text>
                        <WheelPicker
                          items={PROVINCE_NAMES}
                          value={cityProvince}
                          onChange={prov => {
                            const cities = getCitiesForProvince(prov);
                            setEditData(d => ({ ...d, city: cities[0] }));
                          }}
                        />
                      </View>
                      <View style={s.pickerDivider} />
                      <View style={{ flex: 5 }}>
                        <Text style={s.pickerColLabel}>城市</Text>
                        <WheelPicker
                          items={cityList}
                          value={editData.city || cityList[0]}
                          onChange={v => setEditData(d => ({ ...d, city: v }))}
                        />
                      </View>
                    </View>
                  )}

                </View>
              </ScrollView>

              <TouchableOpacity
                style={s.saveBtn}
                onPress={saveEdit}
                accessibilityRole="button"
                accessibilityLabel="保存"
              >
                <Text style={s.saveBtnText}>保存</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setEditVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="取消"
              >
                <Text style={s.cancelBtnText}>取消</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },

  // Header
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 16 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, overflow: 'hidden',
    shadowColor: t.accent, shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarLetter: { fontSize: 34, fontWeight: '800', color: '#FFFFFF' },
  avatarEmoji: { fontSize: 36 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  avatarCameraHint: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 30,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center', justifyContent: 'center',
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  nickname: { fontSize: 22, fontWeight: '800', color: t.textPrimary, marginBottom: 4 },
  profileSub: { fontSize: 14, color: t.textMuted, marginBottom: 14 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: t.accentBg, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  editBtnText: { color: t.accent, fontSize: 13, fontWeight: '600' },

  // Highlights
  highlightRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, alignItems: 'stretch', gap: 8 },
  hlCard: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 18, flex: 1 },
  hlAccent: {
    backgroundColor: t.accent,
    shadowColor: t.accent, shadowOpacity: 0.25, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  hlTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  hlLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  hlNum: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
  hlUnit: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  hlSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },

  // Stats 2×2
  statsCard: {
    backgroundColor: t.card, borderRadius: 14, marginHorizontal: 16, marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statDivV: { width: StyleSheet.hairlineWidth, backgroundColor: t.border },
  statDivH: { height: StyleSheet.hairlineWidth, backgroundColor: t.border },
  statNum: { fontSize: 26, fontWeight: '800', color: t.accent, marginBottom: 4 },
  statLabel: { fontSize: 12, color: t.textMuted },

  // Card
  card: {
    backgroundColor: t.card, borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: t.textMuted, marginBottom: 14, letterSpacing: 0.6 },

  // Gym rankings
  gymRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.border,
  },
  rankBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: t.input, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rankBadgeGold: { backgroundColor: t.goldBg, borderWidth: 1, borderColor: t.goldBorder },
  rankNum: { fontSize: 12, fontWeight: '700', color: t.textFaint },
  rankNumGold: { color: t.gold },
  gymInfo: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: '600', color: t.textPrimary, marginBottom: 2 },
  gymSub: { fontSize: 12, color: t.textMuted },
  gymVol: { fontSize: 14, fontWeight: '700', color: t.accent },

  // Theme
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: {
    flex: 1, minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.input, borderWidth: 1.5, borderColor: 'transparent',
  },
  themeBtnActive: { borderColor: t.accent, backgroundColor: t.accentBg },
  themeBtnText: { fontSize: 14, fontWeight: '500', color: t.textMuted },
  themeBtnTextActive: { color: t.accent, fontWeight: '700' },

  // Bottom buttons
  dangerBtn: {
    borderWidth: 1, borderColor: '#FFB3B3', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    marginHorizontal: 16, marginTop: 8,
  },
  dangerBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 32,
    padding: 16, borderRadius: 12,
    backgroundColor: t.card, alignItems: 'center',
    borderWidth: 1, borderColor: t.border,
  },
  logoutBtnText: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: t.bg,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, maxHeight: '92%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: t.border,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: t.textPrimary, textAlign: 'center' },
  modalCloseBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: 22, backgroundColor: t.input,
  },
  fieldLabel: {
    fontSize: 13, fontWeight: '600', color: t.textMuted,
    marginTop: 20, marginBottom: 6, letterSpacing: 0.3,
  },
  fieldInput: {
    backgroundColor: t.card, borderRadius: 12, padding: 14,
    fontSize: 16, color: t.textPrimary,
  },
  pickerRow: {
    backgroundColor: t.card, borderRadius: 12, overflow: 'hidden', paddingHorizontal: 8,
  },
  datePickerWrap: { backgroundColor: t.card, borderRadius: 12, overflow: 'hidden' },
  datePicker: { height: 200 },

  // Accordion field group
  fieldGroup: {
    backgroundColor: t.card, borderRadius: 14, marginBottom: 4,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 52, paddingHorizontal: 16,
  },
  fieldRowLabel: { fontSize: 15, fontWeight: '600', color: t.textPrimary },
  fieldRowValue: { fontSize: 15, color: t.textSecondary },
  fieldRowPlaceholder: { color: t.textFaint },
  fieldRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldExpand: {
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: t.card,
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 16,
  },
  pickerColLabel: {
    textAlign: 'center', fontSize: 12, fontWeight: '600',
    color: t.textMuted, paddingVertical: 6,
  },
  pickerDivider: {
    width: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 8,
  },

  saveBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    backgroundColor: t.accent, marginTop: 24,
  },
  saveBtnText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  cancelBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: t.input, marginTop: 10,
  },
  cancelBtnText: { fontSize: 15, color: t.textSecondary, fontWeight: '600' },
});
