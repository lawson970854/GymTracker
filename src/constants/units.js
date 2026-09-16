// 单位常量 —— 刻意不放进语言包。
//
// 已确认的决策：
//   1. 所有语言统一用通用英文单位。kg 是 SI 符号，任何语言里都不翻译。
//   2. 训练量（重量 × 总次数）沿用行业惯例，也记作 kg —— Strong / Hevy
//      都是这么显示的，语义由旁边的标签承担，不再用「千克·次」这种自造复合单位。
//      代价是训练量和重量共用一个单位符号，所以训练量出现的地方必须有标签或
//      排版区分，不能让两个 kg 挨着裸奔。
//   3. 数据库永远存 kg。将来支持磅只在显示层换算，并且做成用户设置项 ——
//      跟随用户的选择，不跟随界面语言（在东京的中国人可能要中文界面 + kg，
//      在美国的华人可能要中文界面 + lb）。
//
// 加磅制时只改这个文件和显示层，不动数据。
export const UNIT_WEIGHT = 'kg';
export const UNIT_VOLUME = 'kg';
export const UNIT_HEIGHT = 'cm';

// 「52.5 kg」。标签里要带单位时（例如「重量（kg）」）直接用 UNIT_WEIGHT 插值，
// 不要把单位写进语言包。
export function formatWeight(weight) {
  return `${weight} ${UNIT_WEIGHT}`;
}

// 「52.5 kg × 12/12/10」—— 组数由斜杠列表本身体现，不再写「3组」「次」这类词。
// 这是 Strong / Hevy 的通行排法，也彻底避开了「组」「次」的翻译问题。
// 排法集中在这里，将来要改磅制或换写法只动这一个函数。
export function formatSetLine(weight, sets, fallback = '-') {
  const reps = Array.isArray(sets) && sets.length ? sets.join('/') : fallback;
  return `${weight} ${UNIT_WEIGHT} × ${reps}`;
}

// 训练量：「1,785 kg」。数字分组暂时沿用 toLocaleString()，
// 等确认 Hermes 的 Intl 支持面之后再统一换成显式传 locale 的 Intl.NumberFormat。
export function formatVolume(volume) {
  return `${Number(volume || 0).toLocaleString()} ${UNIT_VOLUME}`;
}
