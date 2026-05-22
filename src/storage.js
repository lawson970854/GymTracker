import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gym_tracker_v1';

export async function loadData() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { gyms: [], records: [] };
  } catch {
    return { gyms: [], records: [] };
  }
}

export async function saveData(data) {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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
