// 未登录（本地模式）下的数据层。
// App 的记录功能本身不依赖账号，所以未登录时所有数据都读写这台设备上的 AsyncStorage，
// 登录只是把本地数据搬到云端、换取多设备同步。接口与 storage.js 中对应的 Supabase
// 版本保持一致，storage.js 根据有没有登录会话决定走哪一套。
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DATA_KEY = '@gymtracker:localData';
const PROFILE_KEY = '@gymtracker:localProfile';
const EMPTY = { gyms: [], records: [], categories: [] };

const DEFAULT_PROFILE = {
  nickname: '', gender: '', birthDate: '', height: '', weight: '', city: '', avatarUrl: '',
};

function newId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function readLocalData() {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    return {
      gyms: parsed.gyms || [],
      records: parsed.records || [],
      categories: parsed.categories || [],
    };
  } catch {
    return { ...EMPTY };
  }
}

// 所有写操作都是「读—改—写」整块 JSON，必须串行，否则并发写会互相覆盖。
let writeChain = Promise.resolve();

function mutate(fn) {
  const run = writeChain.then(async () => {
    const data = await readLocalData();
    const result = fn(data);
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
    return result;
  });
  // 单次失败不能让后续写操作全部卡死
  writeChain = run.catch(() => {});
  return run;
}

export async function hasLocalData() {
  const { gyms, records, categories } = await readLocalData();
  if (gyms.length > 0 || records.length > 0 || categories.length > 0) return true;
  // 只填了个人资料也要算，否则登录后这些字段会被悄悄丢掉
  const profile = await loadProfile();
  return Object.values(profile).some(v => v);
}

// ── 健身房 ────────────────────────────────────────────
export function addGym(name) {
  return mutate(data => {
    const gym = { id: newId(), name, machines: [] };
    data.gyms.push(gym);
    return gym;
  });
}

export function deleteGym(gymId) {
  return mutate(data => {
    data.gyms = data.gyms.filter(g => g.id !== gymId);
    data.records = data.records.filter(r => r.gymId !== gymId);
    data.categories.forEach(c => {
      c.items = (c.items || []).filter(i => i.gymId !== gymId);
    });
  });
}

export function updateGymName(gymId, name) {
  return mutate(data => {
    const gym = data.gyms.find(g => g.id === gymId);
    if (gym) gym.name = name;
  });
}

// ── 器械 ──────────────────────────────────────────────
export function addMachine(gymId, name, categoryId) {
  return mutate(data => {
    const gym = data.gyms.find(g => g.id === gymId);
    if (!gym) throw new Error('健身房不存在');
    const machine = { id: newId(), name };
    gym.machines = [...(gym.machines || []), machine];
    if (categoryId) {
      const cat = data.categories.find(c => c.id === categoryId);
      if (cat) cat.items = [...(cat.items || []), { gymId, machineId: machine.id }];
    }
    return machine;
  });
}

export function deleteMachine(machineId) {
  return mutate(data => {
    data.gyms.forEach(g => {
      g.machines = (g.machines || []).filter(m => m.id !== machineId);
    });
    data.records = data.records.filter(r => r.machineId !== machineId);
    data.categories.forEach(c => {
      c.items = (c.items || []).filter(i => i.machineId !== machineId);
    });
  });
}

export function updateMachineName(machineId, name) {
  return mutate(data => {
    data.gyms.forEach(g => {
      const m = (g.machines || []).find(x => x.id === machineId);
      if (m) m.name = name;
    });
  });
}

// ── 记录 ──────────────────────────────────────────────
export function addRecord(record) {
  return mutate(data => {
    const saved = { ...record, id: newId() };
    data.records.push(saved);
    return saved;
  });
}

export function updateRecord(record) {
  return mutate(data => {
    const idx = data.records.findIndex(r => r.id === record.id);
    if (idx >= 0) data.records[idx] = { ...data.records[idx], ...record };
  });
}

export function deleteRecord(recordId) {
  return mutate(data => {
    data.records = data.records.filter(r => r.id !== recordId);
  });
}

// ── 分类 ──────────────────────────────────────────────
export function addCategory(name) {
  return mutate(data => {
    const cat = { id: newId(), name, items: [] };
    data.categories.push(cat);
    return cat;
  });
}

export function deleteCategory(categoryId) {
  return mutate(data => {
    data.categories = data.categories.filter(c => c.id !== categoryId);
  });
}

export function updateCategoryName(categoryId, name) {
  return mutate(data => {
    const cat = data.categories.find(c => c.id === categoryId);
    if (cat) cat.name = name;
  });
}

export function addCategoryItem(categoryId, gymId, machineId) {
  return mutate(data => {
    const cat = data.categories.find(c => c.id === categoryId);
    if (!cat) return;
    cat.items = cat.items || [];
    if (!cat.items.some(i => i.gymId === gymId && i.machineId === machineId)) {
      cat.items.push({ gymId, machineId });
    }
  });
}

export function removeCategoryItem(categoryId, gymId, machineId) {
  return mutate(data => {
    const cat = data.categories.find(c => c.id === categoryId);
    if (cat) {
      cat.items = (cat.items || []).filter(i => !(i.gymId === gymId && i.machineId === machineId));
    }
  });
}

// ── 个人资料 ──────────────────────────────────────────
export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PROFILE };
}

export async function saveProfile(profile) {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

// 本地模式没有云端存储桶，把选中的图片复制进 App 的文档目录，
// 这样即使系统清理缓存目录，头像也还在。
export async function saveAvatarLocally(localUri) {
  const ext = localUri.split('.').pop()?.toLowerCase().split('?')[0] || 'jpg';
  const dest = `${FileSystem.documentDirectory}avatar_${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: localUri, to: dest });
  return dest;
}

// ── 清除 ──────────────────────────────────────────────
export async function clearAllData() {
  await AsyncStorage.setItem(DATA_KEY, JSON.stringify(EMPTY));
}

export async function clearEverything() {
  await AsyncStorage.multiRemove([DATA_KEY, PROFILE_KEY]);
}
