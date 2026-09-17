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
import { fetchGymData, loadProfile, saveProfile, uploadAvatar, clearAllData, deleteAccount } from '../storage';
import { GYM_DATA_KEY } from '../queryClient';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { useTheme, RADIUS, FONTS, SCHEMES, SCHEME_LABEL_KEYS } from '../ThemeContext';
import { REGIONS, PROVINCE_NAMES, findProvinceByCity, getCitiesForProvince } from '../constants/regions';
import { useTranslation } from 'react-i18next';
import { UNIT_HEIGHT, UNIT_WEIGHT, UNIT_VOLUME } from '../constants/units';

// 配色 swatch 用色（与 ThemeContext 内 light 模式 accent 对齐）
const SCHEME_SWATCH = {
  emerald: '#0E9F6E',
  blue: '#1F77D6',
  indigo: '#5145D6',
  coral: '#E0552B',
  pink: '#D6418A',
  graphite: '#3A382F',
};

const THEME_OPTIONS = [
  { value: 'light', labelKey: 'profile.themeLight', icon: 'sunny-outline' },
  { value: 'dark', labelKey: 'profile.themeDark', icon: 'moon-outline' },
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
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme, mode, setMode, isDark } = useTheme();
  const s = useMemo(() => makeStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();

  const qc = useQueryClient();
  const { scheme, setScheme } = useTheme();
  const { data: gymData } = useQuery({ queryKey: GYM_DATA_KEY, queryFn: fetchGymData });
  const gyms = gymData?.gyms || [];
  const records = gymData?.records || [];

  const [profile, setProfile] = useState({ nickname: '', gender: '', birthDate: '', height: '', weight: '', city: '', avatarUrl: '' });
  const [editVisible, setEditVisible] = useState(false);
  const [editData, setEditData] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  // 未登录也能完整使用，这里只决定「账号」区块显示登录入口还是退出/删除账号
  const [account, setAccount] = useState(null);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAccount(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAccount(session?.user ?? null);
      // onAuthStateChange 回调里不能直接调 supabase.auth.*（loadProfile 内部会取会话），
      // 否则会和 supabase 内部的锁互等，推到下一轮事件循环再读
      setTimeout(() => loadProfile().then(setProfile).catch(() => {}), 0);
    });
    return () => subscription.unsubscribe();
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
      Alert.alert(t('profile.permissionTitle'), t('profile.permissionMessage'));
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
      Alert.alert(t('profile.uploadFailed'), e.message || t('profile.networkRetry'));
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
    Alert.alert(t('profile.clearTitle'), t('profile.clearMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.continueBtn'), style: 'destructive', onPress: () => {
          Alert.alert(t('profile.clearConfirmTitle'), t('profile.clearConfirmMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('profile.clearConfirmBtn'), style: 'destructive', onPress: async () => {
              try {
                await clearAllData();
                // 清空缓存，让所有屏幕立即重新拉取空数据
                qc.setQueryData(GYM_DATA_KEY, { gyms: [], records: [], categories: [] });
                qc.invalidateQueries({ queryKey: GYM_DATA_KEY });
                Alert.alert(t('profile.clearedTitle'), t('profile.clearedMessage'));
              } catch (e) {
                Alert.alert(t('profile.clearFailed'), e.message || t('profile.networkRetry'));
              }
            }},
          ]);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountTitle'),
      t('profile.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.continueBtn'), style: 'destructive', onPress: () => {
            Alert.alert(t('profile.deleteAccountConfirmTitle'), t('profile.deleteAccountConfirmMessage'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('profile.deleteAccountConfirmBtn'), style: 'destructive', onPress: async () => {
                try {
                  await deleteAccount();
                  // 账号已不存在，登出触发 App.js 清空缓存并回到登录页
                  await supabase.auth.signOut();
                } catch (e) {
                  Alert.alert(t('common.deleteFailed'), e.message || t('profile.networkRetry'));
                }
              }},
            ]);
          },
        },
      ],
    );
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
            accessibilityLabel={t('profile.changeAvatarA11y')}
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
          <Text style={s.nickname}>{profile.nickname || t('profile.defaultNickname')}</Text>
          {profileSub ? <Text style={s.profileSub}>{profileSub}</Text> : null}
          <TouchableOpacity
            style={s.editBtn}
            onPress={openEdit}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editProfileA11y')}
          >
            <Ionicons name="pencil-outline" size={13} color={theme.accent} />
            <Text style={s.editBtnText}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 总训练量 + 单日最佳 ── */}
        {records.length > 0 && (
          <View style={s.highlightRow}>
            <View style={[s.hlCard, s.hlAccent]}>
              <View style={s.hlTopRow}>
                <Text style={s.hlLabel}>{t('profile.totalVolume')}</Text>
                <Text style={s.hlUnit}>{UNIT_VOLUME}</Text>
              </View>
              <Text style={s.hlNum} maxFontSizeMultiplier={1.2}>{totalVolume.toLocaleString()}</Text>
              <Text style={s.hlSub}>{firstDate ? t('profile.since', { date: firstDate }) : ''}</Text>
            </View>
            {bestDay && (
              <View style={[s.hlCard, s.hlAccent]}>
                <View style={s.hlTopRow}>
                  <Text style={s.hlLabel}>{t('profile.bestDay')}</Text>
                  <Text style={s.hlUnit}>{UNIT_VOLUME}</Text>
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
              <Text style={s.statLabel}>{t('common.statRecords')}</Text>
            </View>
            <View style={s.statDivV} />
            <View style={s.statCell}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{trainDays}</Text>
              <Text style={s.statLabel}>{t('common.statDays')}</Text>
            </View>
          </View>
          <View style={s.statDivH} />
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{gyms.length}</Text>
              <Text style={s.statLabel}>{t('profile.statGyms')}</Text>
            </View>
            <View style={s.statDivV} />
            <View style={s.statCell}>
              <Text style={s.statNum} maxFontSizeMultiplier={1.2}>{totalMachines}</Text>
              <Text style={s.statLabel}>{t('profile.statMachines')}</Text>
            </View>
          </View>
        </View>

        {/* ── 健身房排行 ── */}
        {gymStats.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('profile.gymRanking')}</Text>
            {gymStats.map(({ gym, vol, count }, idx) => (
              <View key={gym.id} style={[s.gymRow, idx === gymStats.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.rankBadge, idx === 0 && s.rankBadgeGold]}>
                  <Text style={[s.rankNum, idx === 0 && s.rankNumGold]}>{idx + 1}</Text>
                </View>
                <View style={s.gymInfo}>
                  <Text style={s.gymName}>{gym.name}</Text>
                  <Text style={s.gymSub}>{t('common.recordCount', { count })}</Text>
                </View>
                <Text style={s.gymVol}>{vol.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 外观 ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('profile.appearance')}</Text>

          <Text style={s.subLabel}>{t('profile.themeLabel')}</Text>
          <View style={s.themeRow}>
            {THEME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.themeBtn, mode === opt.value && s.themeBtnActive]}
                onPress={() => setMode(opt.value)}
                accessibilityRole="radio"
                accessibilityLabel={t(opt.labelKey)}
                accessibilityState={{ checked: mode === opt.value }}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={mode === opt.value ? theme.textPrimary : theme.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.subLabel, { marginTop: 16 }]}>{t('profile.schemeLabel')}</Text>
          <View style={s.schemeRow}>
            {SCHEMES.map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => setScheme(key)}
                accessibilityRole="button"
                accessibilityLabel={t(SCHEME_LABEL_KEYS[key])}
                accessibilityState={{ selected: scheme === key }}
                style={[
                  s.schemeDot,
                  { backgroundColor: SCHEME_SWATCH[key] },
                  scheme === key && { borderColor: theme.textPrimary },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── 账号：未登录时是可选的云同步入口，不挡任何功能 ── */}
        <Text style={s.sectionLabel}>{t('profile.account')}</Text>
        {account ? (
          <>
            <View style={s.accountCard}>
              <Ionicons name="cloud-done-outline" size={20} color={theme.accent} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.accountTitle}>{t('profile.cloudOn')}</Text>
                <Text style={s.accountDesc} numberOfLines={1}>
                  {account.email || t('profile.signedIn')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.logoutBtn}
              onPress={() => {
                Alert.alert(t('profile.signOutTitle'), t('profile.signOutMessage'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('profile.signOut'), style: 'destructive', onPress: () => supabase.auth.signOut() },
                ]);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.signOutTitle')}
            >
              <Text style={s.logoutBtnText}>{t('profile.signOutTitle')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={s.accountCard}>
              <Ionicons name="phone-portrait-outline" size={20} color={theme.textMuted} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.accountTitle}>{t('profile.localMode')}</Text>
                <Text style={s.accountDesc}>
                  {t('profile.localModeDesc')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.loginBtn}
              onPress={() => navigation.navigate('Auth')}
              accessibilityRole="button"
              accessibilityLabel={t('profile.loginA11y')}
            >
              <Text style={s.loginBtnText}>{t('profile.loginBtn')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── 破坏性操作 ── */}
        <TouchableOpacity
          style={[s.dangerBtn, !account && s.dangerBtnLast]}
          onPress={handleClearAllData}
          accessibilityRole="button"
          accessibilityLabel={t('profile.clearTitle')}
        >
          <Text style={s.dangerBtnLabel}>{t('profile.clearTitle')}</Text>
          <Text style={s.dangerBtnDesc}>
            {account
              ? t('profile.clearDescSignedIn')
              : t('profile.clearDescLocal')}
          </Text>
        </TouchableOpacity>

        {account && (
          <TouchableOpacity
            style={[s.dangerBtn, s.dangerBtnLast]}
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel={t('profile.deleteAccountTitle')}
          >
            <Text style={s.dangerBtnLabel}>{t('profile.deleteAccountTitle')}</Text>
            <Text style={s.dangerBtnDesc}>{t('profile.deleteAccountDesc')}</Text>
          </TouchableOpacity>
        )}

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
                <Text style={s.modalTitle}>{t('profile.editModalTitle')}</Text>
                <TouchableOpacity
                  style={s.modalCloseBtn}
                  onPress={() => setEditVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
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
                    <Text style={s.fieldRowLabel}>{t('profile.fieldNickname')}</Text>
                    <Text style={[s.fieldRowValue, !editData.nickname && s.fieldRowPlaceholder]}>
                      {editData.nickname || t('profile.notFilled')}
                    </Text>
                  </TouchableOpacity>
                  {activeField === 'nickname' && (
                    <View style={s.fieldExpand}>
                      <TextInput
                        style={s.fieldInput}
                        value={editData.nickname || ''}
                        onChangeText={v => setEditData(d => ({ ...d, nickname: v }))}
                        placeholder={t('profile.nicknamePlaceholder')}
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
                    <Text style={s.fieldRowLabel}>{t('profile.fieldGender')}</Text>
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
                    <Text style={s.fieldRowLabel}>{t('profile.fieldBirthDate')}</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={[s.fieldRowValue, !editData.birthYear && s.fieldRowPlaceholder]}>
                        {editData.birthYear ? `${editData.birthYear}-${editData.birthMonth}-${editData.birthDay}` : t('profile.notFilled')}
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
                    <Text style={s.fieldRowLabel}>{t('profile.fieldHeight')}</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={s.fieldRowValue}>{editData.height || '170'} {UNIT_HEIGHT}</Text>
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
                    <Text style={s.fieldRowLabel}>{t('profile.fieldWeight')}</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={s.fieldRowValue}>{editData.weight || '70'} {UNIT_WEIGHT}</Text>
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
                    <Text style={s.fieldRowLabel}>{t('profile.fieldCity')}</Text>
                    <View style={s.fieldRowRight}>
                      <Text style={[s.fieldRowValue, !editData.city && s.fieldRowPlaceholder]}>
                        {editData.city || t('profile.notSelected')}
                      </Text>
                      <Ionicons name={activeField === 'city' ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textFaint} />
                    </View>
                  </TouchableOpacity>
                  {activeField === 'city' && (
                    <View style={[s.fieldExpand, { flexDirection: 'row' }]}>
                      <View style={{ flex: 5 }}>
                        <Text style={s.pickerColLabel}>{t('profile.provinceCol')}</Text>
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
                        <Text style={s.pickerColLabel}>{t('profile.cityCol')}</Text>
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
                accessibilityLabel={t('common.save')}
              >
                <Text style={s.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setEditVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Text style={s.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 危险色单独定义：主题色板里没有语义化的 danger，浅色深色各配一套，
// 保证深色模式下红字在近黑底上仍然可读。
const dangerPalette = (isDark) => isDark
  ? { fg: '#FF6369', border: '#3A2224' }
  : { fg: '#E5484D', border: '#F1D4D4' };

// 退出登录 / 清除数据 / 删除账号 三个按钮共用，保证高度完全一致
const ACTION_BTN_HEIGHT = 62;

const makeStyles = (t, isDark) => {
  const danger = dangerPalette(isDark);
  return StyleSheet.create({
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
  nickname: {
    fontSize: 23, fontFamily: FONTS.uiExtra, color: t.textPrimary,
    marginBottom: 4, letterSpacing: -0.4,
  },
  profileSub: { fontSize: 13.5, color: t.textMuted, marginBottom: 14, fontFamily: FONTS.ui },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: t.accentBg, borderRadius: RADIUS.pill,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  editBtnText: { color: t.accentInk, fontSize: 13, fontFamily: FONTS.ui, fontWeight: '600' },

  // Highlights
  highlightRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, alignItems: 'stretch', gap: 10 },
  hlCard: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 20, flex: 1 },
  hlAccent: {
    backgroundColor: t.accent,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  hlTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, opacity: 0.9 },
  hlLabel: { fontSize: 11, fontFamily: FONTS.uiBold, color: t.onAccent, letterSpacing: 0.3 },
  hlNum: {
    fontSize: 32, fontFamily: FONTS.numBold, color: t.onAccent,
    letterSpacing: -0.8, fontVariant: ['tabular-nums'],
  },
  hlUnit: { fontSize: 10, color: t.onAccent, opacity: 0.8 },
  hlSub: { fontSize: 10.5, color: t.onAccent, opacity: 0.82, textAlign: 'right', marginTop: 10, fontFamily: FONTS.ui },

  // Stats 2×2
  statsCard: {
    backgroundColor: t.card, borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: t.border,
    marginHorizontal: 16, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statDivV: { width: StyleSheet.hairlineWidth, backgroundColor: t.borderAlt },
  statDivH: { height: StyleSheet.hairlineWidth, backgroundColor: t.borderAlt },
  statNum: {
    fontSize: 26, fontFamily: FONTS.num, color: t.accent,
    marginBottom: 4, letterSpacing: -0.5, fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 11.5, color: t.textMuted, fontFamily: FONTS.ui },

  // Card
  card: {
    backgroundColor: t.card,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border,
    padding: 18,
    marginHorizontal: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  cardTitle: {
    fontSize: 11.5, fontFamily: FONTS.uiBold, color: t.textMuted,
    marginBottom: 14, letterSpacing: 1.6, textTransform: 'uppercase',
  },

  // Gym rankings
  gymRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingVertical: 11, borderTopWidth: 1, borderColor: t.borderAlt,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: t.card2, borderWidth: 1, borderColor: t.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeGold: { backgroundColor: t.goldBg, borderColor: t.goldBorder },
  rankNum: { fontSize: 13, fontFamily: FONTS.num, color: t.textMuted },
  rankNumGold: { color: t.gold },
  gymInfo: { flex: 1 },
  gymName: { fontSize: 14.5, fontFamily: FONTS.uiBold, color: t.textPrimary, marginBottom: 1 },
  gymSub: { fontSize: 11.5, color: t.textMuted, fontFamily: FONTS.ui },
  gymVol: {
    fontSize: 15, fontFamily: FONTS.num, color: t.accentInk,
    fontVariant: ['tabular-nums'],
  },

  // Theme
  subLabel: { fontSize: 12.5, color: t.textMuted, fontFamily: FONTS.ui, fontWeight: '600', marginBottom: 10 },
  themeRow: {
    flexDirection: 'row', gap: 6,
    backgroundColor: t.card2, padding: 4, borderRadius: 13,
    borderWidth: 1, borderColor: t.border,
  },
  themeBtn: {
    flex: 1, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  themeBtnActive: {
    backgroundColor: t.card,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  schemeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  schemeDot: {
    width: 34, height: 34, borderRadius: 11,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },

  // Bottom buttons
  // 三个底部操作共用同一形态：等高、等圆角、居中内容，只靠颜色区分危险程度
  sectionLabel: {
    fontSize: 11.5, fontFamily: FONTS.uiBold, color: t.textMuted,
    letterSpacing: 1.6, textTransform: 'uppercase',
    marginHorizontal: 16, marginTop: 28, marginBottom: 10,
  },
  accountCard: {
    marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: RADIUS.btn, backgroundColor: t.card,
    borderWidth: 1, borderColor: t.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  accountTitle: { fontSize: 15, fontFamily: FONTS.uiBold, color: t.textPrimary },
  accountDesc: { fontSize: 12.5, color: t.textMuted, fontFamily: FONTS.ui, marginTop: 2 },
  loginBtn: {
    marginHorizontal: 16, marginTop: 12,
    height: ACTION_BTN_HEIGHT, borderRadius: RADIUS.btn,
    backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
  },
  loginBtnText: { color: t.onAccent, fontSize: 15, fontFamily: FONTS.uiBold },
  logoutBtn: {
    marginHorizontal: 16, marginTop: 12,
    height: ACTION_BTN_HEIGHT, borderRadius: RADIUS.btn,
    backgroundColor: t.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: t.border,
  },
  logoutBtnText: { color: t.textPrimary, fontSize: 15, fontFamily: FONTS.uiBold },
  dangerBtn: {
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 16,
    height: ACTION_BTN_HEIGHT, borderRadius: RADIUS.btn,
    backgroundColor: t.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: danger.border,
  },
  dangerBtnLast: { marginBottom: 32 },
  dangerBtnLabel: { fontSize: 15, fontFamily: FONTS.uiBold, color: danger.fg, textAlign: 'center' },
  dangerBtnDesc: {
    fontSize: 12, color: t.textMuted, fontFamily: FONTS.ui,
    marginTop: 2, textAlign: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,9,8,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: t.bg,
    borderTopLeftRadius: RADIUS.modal, borderTopRightRadius: RADIUS.modal,
    padding: 20, maxHeight: '92%',
  },
  modalHandle: {
    width: 38, height: 5, borderRadius: 3, backgroundColor: t.border,
    alignSelf: 'center', marginBottom: 14,
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
};
