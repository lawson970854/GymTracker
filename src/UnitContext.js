// UnitContext — 偏好单位（跨器械汇总用哪种单位显示），形状照着 LocaleContext 来。
//
// 偏好存在 profiles.weight_unit（未登录时存本机），见 storage.js 的 loadWeightUnit。
// 用户没选过时按手机的度量衡设置给默认值：美制（'us'）用 lb，其余用 kg。
// 默认值只在显示时算，不写回去 —— 这样用户换了手机区域，没选过的人会跟着变。
//
// 器械单位不归这里管，见 constants/units.js 的 machineUnit。

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getLocales } from 'expo-localization';
import { supabase } from './supabase';
import { loadWeightUnit, loadCachedWeightUnit, saveWeightUnit } from './storage';
import { KG, LB, isWeightUnit } from './constants/units';

function deviceDefaultUnit() {
  try {
    return getLocales()[0]?.measurementSystem === 'us' ? LB : KG;
  } catch {
    return KG;
  }
}

const UnitContext = createContext({ unit: KG, setUnit: () => {} });

export function UnitProvider({ children }) {
  const [stored, setStored] = useState(null);
  const storedRef = useRef(null);
  // 每次读取和每次用户手动设置都递增；读到一半用户改了，旧的读取结果直接丢掉
  const seqRef = useRef(0);

  const apply = useCallback((u) => {
    storedRef.current = u;
    setStored(u);
  }, []);

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    const cached = await loadCachedWeightUnit().catch(() => null);
    if (seq !== seqRef.current) return;
    if (isWeightUnit(cached)) apply(cached);

    let remote;
    try {
      remote = await loadWeightUnit();
    } catch {
      return; // 离线就先用缓存
    }
    if (seq !== seqRef.current) return;
    if (isWeightUnit(remote)) {
      apply(remote);
    } else if (storedRef.current) {
      // 刚登录、账号上还没选过：沿用登录前在本机选的，并写到账号上
      saveWeightUnit(storedRef.current).catch(() => {});
    }
  }, [apply]);

  useEffect(() => {
    refresh();
    // 登录、退出、换账号都要重读。回调里不能直接调 supabase.auth.*（storage 内部会取会话），
    // 否则会和 supabase 内部的锁互等，推到下一轮事件循环
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setTimeout(refresh, 0);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const setUnit = useCallback((u) => {
    if (!isWeightUnit(u)) return;
    seqRef.current++;
    apply(u);
    saveWeightUnit(u).catch(() => {});
  }, [apply]);

  const value = useMemo(
    () => ({ unit: stored || deviceDefaultUnit(), setUnit }),
    [stored, setUnit],
  );

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export const useWeightUnit = () => useContext(UnitContext);
