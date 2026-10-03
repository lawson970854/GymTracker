// 单位常量与换算 —— 刻意不放进语言包。
//
// 已确认的决策：
//   1. 所有语言统一用通用英文单位。kg / lb 是通用符号，任何语言里都不翻译。
//   2. 训练量（重量 × 总次数）沿用行业惯例，也记作 kg / lb —— Strong / Hevy
//      都是这么显示的，语义由旁边的标签承担，不再用「千克·次」这种自造复合单位。
//      代价是训练量和重量共用一个单位符号，所以训练量出现的地方必须有标签或
//      排版区分，不能让两个 kg 挨着裸奔。
//   3. 数据库永远存 kg，磅只在显示层换算。数据里的 weight / volume 一律是 kg。
//   4. 单位有两个来源，各管各的：
//      - 器械单位：配重片上印的是什么。器械没单独设就跟所属健身房走（machineUnit）。
//        单条记录（重量选择、历史、某台器械的最佳和趋势）都用它，
//        这样 App 里看到的数字和站在器械前看到的一致。
//      - 偏好单位：用户在设置里选的（UnitContext）。跨器械的汇总（当天总量、
//        分类趋势、个人页统计、体重）用它 —— 不同单位的器械加在一起时，
//        只能统一换算成一种来显示。
//      偏好跟随用户的选择，不跟随界面语言（在东京的中国人可能要中文界面 + kg，
//      在美国的华人可能要中文界面 + lb）。
export const KG = 'kg';
export const LB = 'lb';
export const WEIGHT_UNITS = [KG, LB];
export const UNIT_HEIGHT = 'cm';

// 国际磅的定义值（1959 年起精确等于这个数），不是近似。
const KG_PER_LB = 0.45359237;

export function isWeightUnit(u) {
  return u === KG || u === LB;
}

// kg → 显示单位下的数值
export function toUnit(kg, unit) {
  const n = Number(kg) || 0;
  return unit === LB ? n / KG_PER_LB : n;
}

// 显示单位下的数值 → kg（写库前用）
export function fromUnit(value, unit) {
  const n = Number(value) || 0;
  return unit === LB ? n * KG_PER_LB : n;
}

// 器械单位：器械自己设了就用器械的，否则跟所属健身房，都没有就 kg。
export function machineUnit(gyms, gymId, machineId) {
  const gym = (gyms || []).find(g => g.id === gymId);
  const machine = gym?.machines?.find(m => m.id === machineId);
  return machine?.weightUnit || gym?.weightUnit || KG;
}

// 重量最多保留一位小数，末尾的 .0 去掉。
// 换算本身有浮点误差（100 lb 存成 kg 再换回来是 100.00000000000001），
// 显示前必须舍入，不能把误差露给用户。
export function weightNumber(kg, unit) {
  return Math.round(toUnit(kg, unit) * 10) / 10;
}

// 训练量取整：跨单位换算后必然带小数，而训练量的个位以下没有意义。
export function volumeNumber(kgVolume, unit) {
  return Math.round(toUnit(kgVolume, unit));
}

// 「52.5 kg」。标签里要带单位时（例如「重量（kg）」）直接插值单位，
// 不要把单位写进语言包。
export function formatWeight(kg, unit) {
  return `${weightNumber(kg, unit)} ${unit}`;
}

// 「52.5 kg × 12/12/10」—— 组数由斜杠列表本身体现，不再写「3组」「次」这类词。
// 这是 Strong / Hevy 的通行排法，也彻底避开了「组」「次」的翻译问题。
export function formatSetLine(kg, sets, unit, fallback = '-') {
  const reps = Array.isArray(sets) && sets.length ? sets.join('/') : fallback;
  return `${weightNumber(kg, unit)} ${unit} × ${reps}`;
}

// 训练量：「1,785 kg」。数字分组暂时沿用 toLocaleString()，
// 等确认 Hermes 的 Intl 支持面之后再统一换成显式传 locale 的 Intl.NumberFormat。
export function formatVolume(kgVolume, unit) {
  return `${volumeNumber(kgVolume, unit).toLocaleString()} ${unit}`;
}

// 重量选择器的选项（显示单位下的数值）。
// kg 按 1 递增；磅的配重片一般 5 lb 一档，按 5 递增。
const OPTIONS = {
  [KG]: Array.from({ length: 300 }, (_, i) => i + 1),
  [LB]: Array.from({ length: 120 }, (_, i) => (i + 1) * 5),
};

export function weightOptions(unit) {
  return OPTIONS[unit] || OPTIONS[KG];
}

// 把任意 kg 值换成该单位下最接近的选项。
// 器械换了单位、或旧记录的重量不在当前档位上时，选择器要有一个落点。
export function nearestOption(kg, unit) {
  const target = toUnit(kg, unit);
  return weightOptions(unit).reduce(
    (best, o) => (Math.abs(o - target) < Math.abs(best - target) ? o : best),
  );
}
