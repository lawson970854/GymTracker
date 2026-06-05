import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

const PROFILE_CACHE_KEY = '@gymtracker:profile';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ── 核心查询函数（TanStack Query 使用）────────────────
export async function fetchGymData() {
  const userId = await getUserId();
  if (!userId) return { gyms: [], records: [], categories: [] };

  const [gymsRes, machinesRes, recordsRes, categoriesRes, itemsRes] = await Promise.all([
    supabase.from('gyms').select('*').eq('user_id', userId),
    supabase.from('machines').select('*').eq('user_id', userId),
    supabase.from('records').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('category_items').select('*').eq('user_id', userId),
  ]);

  const gyms = (gymsRes.data || []).map(g => ({
    id: g.id,
    name: g.name,
    machines: (machinesRes.data || [])
      .filter(m => m.gym_id === g.id)
      .map(m => ({ id: m.id, name: m.name })),
  }));

  const records = (recordsRes.data || []).map(r => ({
    id: r.id,
    gymId: r.gym_id,
    machineId: r.machine_id,
    date: r.date,
    weight: r.weight,
    sets: r.sets,
    volume: r.volume,
  }));

  const categories = (categoriesRes.data || []).map(c => ({
    id: c.id,
    name: c.name,
    items: (itemsRes.data || [])
      .filter(i => i.category_id === c.id)
      .map(i => ({ gymId: i.gym_id, machineId: i.machine_id })),
  }));

  return { gyms, records, categories };
}

// ── 写操作（各屏幕 useMutation 使用）─────────────────
export async function addGym(name) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('gyms')
    .insert({ name, user_id: userId }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, machines: [] };
}

export async function deleteGym(gymId) {
  const { error } = await supabase.from('gyms').delete().eq('id', gymId);
  if (error) throw error;
}

export async function updateGymName(gymId, name) {
  const { error } = await supabase.from('gyms').update({ name }).eq('id', gymId);
  if (error) throw error;
}

export async function addMachine(gymId, name, categoryId) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('machines')
    .insert({ gym_id: gymId, name, user_id: userId }).select().single();
  if (error) throw error;
  // 如果指定了分类，自动关联到该分类
  if (categoryId) {
    await supabase.from('category_items').insert({
      category_id: categoryId, gym_id: gymId, machine_id: data.id, user_id: userId,
    });
  }
  return { id: data.id, name: data.name };
}

export async function deleteMachine(machineId) {
  const { error } = await supabase.from('machines').delete().eq('id', machineId);
  if (error) throw error;
}

export async function updateMachineName(machineId, name) {
  const { error } = await supabase.from('machines').update({ name }).eq('id', machineId);
  if (error) throw error;
}

export async function addRecord(record) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('records').insert({
    user_id: userId,
    gym_id: record.gymId,
    machine_id: record.machineId,
    date: record.date,
    weight: record.weight,
    sets: record.sets,
    volume: record.volume,
  }).select().single();
  if (error) throw error;
  return { ...record, id: data.id };
}

export async function updateRecord(record) {
  const { error } = await supabase.from('records').update({
    date: record.date,
    weight: record.weight,
    sets: record.sets,
    volume: record.volume,
  }).eq('id', record.id);
  if (error) throw error;
}

export async function deleteRecord(recordId) {
  const { error } = await supabase.from('records').delete().eq('id', recordId);
  if (error) throw error;
}

export async function addCategory(name) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('categories')
    .insert({ name, user_id: userId }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, items: [] };
}

export async function deleteCategory(categoryId) {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw error;
}

export async function updateCategoryName(categoryId, name) {
  const { error } = await supabase.from('categories').update({ name }).eq('id', categoryId);
  if (error) throw error;
}

export async function addCategoryItem(categoryId, gymId, machineId) {
  const userId = await getUserId();
  const { error } = await supabase.from('category_items').insert({
    category_id: categoryId, gym_id: gymId, machine_id: machineId, user_id: userId,
  });
  if (error) throw error;
}

export async function removeCategoryItem(categoryId, gymId, machineId) {
  const { error } = await supabase.from('category_items').delete()
    .eq('category_id', categoryId).eq('gym_id', gymId).eq('machine_id', machineId);
  if (error) throw error;
}

// ── Profile ───────────────────────────────────────────
const DEFAULT_PROFILE = {
  nickname: '', gender: '', birthDate: '', height: '', weight: '', city: '', avatarUrl: '',
};

function mapProfileData(data) {
  return {
    nickname: data.nickname || '',
    gender: data.gender || '',
    birthDate: data.birth_date || '',
    height: data.height != null ? String(data.height) : '',
    weight: data.weight != null ? String(data.weight) : '',
    city: data.city || '',
    avatarUrl: data.avatar_url || '',
  };
}

export async function loadProfile() {
  const userId = await getUserId();
  if (!userId) return { ...DEFAULT_PROFILE };

  // 优先读本地缓存（几毫秒，App 打开即可渲染）
  try {
    const cached = await AsyncStorage.getItem(`${PROFILE_CACHE_KEY}:${userId}`);
    if (cached) return JSON.parse(cached);
  } catch {}

  // 无缓存则从 Supabase 拉取，并写入缓存
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!data) return { ...DEFAULT_PROFILE };
  const profile = mapProfileData(data);
  try {
    await AsyncStorage.setItem(`${PROFILE_CACHE_KEY}:${userId}`, JSON.stringify(profile));
  } catch {}
  return profile;
}

export async function saveProfile(profile) {
  const userId = await getUserId();
  if (!userId) return;

  // 先更新本地缓存，保证下次打开立即可用
  try {
    await AsyncStorage.setItem(`${PROFILE_CACHE_KEY}:${userId}`, JSON.stringify(profile));
  } catch {}

  await supabase.from('profiles').upsert({
    id: userId,
    nickname: profile.nickname,
    gender: profile.gender,
    birth_date: profile.birthDate || null,
    height: profile.height ? parseFloat(profile.height) : null,
    weight: profile.weight ? parseFloat(profile.weight) : null,
    city: profile.city,
    avatar_url: profile.avatarUrl || null,
    updated_at: new Date().toISOString(),
  });
}

export async function uploadAvatar(localUri) {
  const userId = await getUserId();
  if (!userId) throw new Error('未登录');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('未登录');

  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const storagePath = `${userId}/avatar.jpg`;

  // 用 FileSystem.uploadAsync 直接打 Supabase Storage REST API，
  // 完全绕过 Supabase JS client 内部的 Blob 创建逻辑
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/avatars/${storagePath}`;
  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': mime,
      'x-upsert': 'true',
    },
  });

  if (result.status >= 400) {
    throw new Error(`上传失败 (${result.status}): ${result.body}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${storagePath}`;
  return `${publicUrl}?t=${Date.now()}`;
}

// ── 危险操作：一键清除所有训练数据 ─────────────────────
// 清除范围：records / category_items / machines / categories / gyms
// 不影响：profiles / 头像 / 账户本身
export async function clearAllData() {
  const userId = await getUserId();
  if (!userId) throw new Error('未登录');
  // 顺序很重要：先删依赖表，再删被依赖表，避免外键约束报错
  const tables = ['records', 'category_items', 'machines', 'categories', 'gyms'];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().eq('user_id', userId);
    if (error) throw error;
  }
}

// ── 工具函数 ──────────────────────────────────────────
export function calcVolume(weight, repsArr) {
  return repsArr.reduce((s, r) => s + weight * r, 0);
}

export function getBestRecord(records, gymId, machineId) {
  const recs = records.filter(r => r.gymId === gymId && r.machineId === machineId);
  if (!recs.length) return null;
  return recs.reduce((best, r) => r.volume > best.volume ? r : best, recs[0]);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
