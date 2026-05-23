import React, { useState, useRef } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, {
  Path, Line, Circle, Rect, G,
  Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg';

/**
 * InteractiveLineChart
 * Props:
 *   labels      string[]   x 轴标签（与 data 等长）
 *   data        number[]   y 值
 *   width       number     总宽度（含内边距）
 *   height      number     总高度（含内边距），默认 210
 *   color       string     主题色，默认 #1D9E75
 *   gradientId   string     SVG gradient id，多图共存时须唯一，默认 "ilc_grad"
 *   tooltipExtra   string[]   可选，每个数据点对应的附加文字（如健身房名），显示在气泡第三行
 *   highlightIndex number    可选，需要高亮显示的数据点 index（橙色大点）
 */
export default function InteractiveLineChart({
  labels,
  data,
  width,
  height = 210,
  color = '#1D9E75',
  gradientId = 'ilc_grad',
  tooltipExtra = null,
  highlightIndex = null,
}) {
  const [activeIdx, setActiveIdx] = useState(null);
  const activeIdxRef = useRef(null); // 避免闭包过时

  // 内边距
  const padL = 52, padR = 16, padT = 16, padB = 38;
  const cW = width - padL - padR;
  const cH = height - padT - padB;

  const n = data.length;
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const vRange = maxV - minV || 1;

  const xOf = (i) => (i / Math.max(n - 1, 1)) * cW;
  const yOf = (v) => cH - ((v - minV) / vRange) * cH;

  // ---- 路径 ----
  const linePts = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
  const linePath = linePts.join(' ');
  const areaPath = `${linePath} L${xOf(n - 1).toFixed(1)},${cH} L0,${cH} Z`;

  // ---- X 轴标签抽稀：最多显示 6 个 ----
  const maxXLabels = 6;
  const xStep = Math.max(1, Math.ceil(n / maxXLabels));
  const xLabelIdxs = [];
  for (let i = 0; i < n; i += xStep) xLabelIdxs.push(i);
  if (xLabelIdxs[xLabelIdxs.length - 1] !== n - 1) xLabelIdxs.push(n - 1);

  // ---- Y 轴参考线：3 条 ----
  const yTicks = [minV, minV + vRange / 2, maxV].map(v => Math.round(v));

  // ---- 格式化 Y 轴标签 ----
  const fmtY = (v) => v >= 10000 ? `${(v / 1000).toFixed(0)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

  // ---- PanResponder ----
  const handleTouch = (x) => {
    const relX = x - padL;
    const raw = (relX / cW) * (n - 1);
    const idx = Math.round(Math.max(0, Math.min(n - 1, raw)));
    if (activeIdxRef.current !== idx) {
      activeIdxRef.current = idx;
      setActiveIdx(idx);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => handleTouch(e.nativeEvent.locationX),
    onPanResponderMove: (e) => handleTouch(e.nativeEvent.locationX),
    onPanResponderRelease: () => { activeIdxRef.current = null; setActiveIdx(null); },
    onPanResponderTerminate: () => { activeIdxRef.current = null; setActiveIdx(null); },
  });

  // ---- Tooltip 位置 ----
  const extraText = activeIdx !== null && tooltipExtra ? (tooltipExtra[activeIdx] || '') : '';
  const hasExtra = !!extraText;
  const TW = 128, TH = hasExtra ? 60 : 44;
  let tBx = 0, tBy = 0;
  if (activeIdx !== null) {
    tBx = xOf(activeIdx) - TW / 2;
    if (tBx < 0) tBx = 0;
    if (tBx + TW > cW) tBx = cW - TW;
    const dotY = yOf(data[activeIdx]);
    tBy = dotY - TH - 12 < 0 ? dotY + 12 : dotY - TH - 12;
  }

  return (
    <View {...panResponder.panHandlers}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.28" />
            <Stop offset="1" stopColor={color} stopOpacity="0.01" />
          </LinearGradient>
        </Defs>

        <G x={padL} y={padT}>

          {/* Y 轴参考线 + 标签 */}
          {yTicks.map((v, i) => (
            <G key={i}>
              <Line
                x1={0} y1={yOf(v)} x2={cW} y2={yOf(v)}
                stroke="#EFEFEF" strokeWidth={1}
              />
              <SvgText
                x={-6} y={yOf(v) + 4}
                textAnchor="end" fontSize={10} fill="#C0C0C0"
              >
                {fmtY(v)}
              </SvgText>
            </G>
          ))}

          {/* 面积填充 */}
          <Path d={areaPath} fill={`url(#${gradientId})`} />

          {/* 折线 */}
          <Path d={linePath} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* 无交互时显示小圆点（高亮点用橙色大圆） */}
          {activeIdx === null && data.map((v, i) => (
            i === highlightIndex
              ? <Circle key={i} cx={xOf(i)} cy={yOf(v)} r={6} fill="#FF9500" stroke="#fff" strokeWidth={2} />
              : <Circle key={i} cx={xOf(i)} cy={yOf(v)} r={3.5} fill={color} />
          ))}

          {/* X 轴标签 */}
          {xLabelIdxs.map(i => (
            <SvgText
              key={i}
              x={xOf(i)} y={cH + 24}
              textAnchor="middle" fontSize={10} fill="#BBBBBB"
            >
              {labels[i]}
            </SvgText>
          ))}

          {/* 底部轴线 */}
          <Line x1={0} y1={cH} x2={cW} y2={cH} stroke="#EFEFEF" strokeWidth={1} />

          {/* 交互：竖线 + 大圆点 + Tooltip */}
          {activeIdx !== null && (
            <>
              <Line
                x1={xOf(activeIdx)} y1={0}
                x2={xOf(activeIdx)} y2={cH}
                stroke={color} strokeWidth={1.2}
                strokeDasharray="5,3" opacity={0.7}
              />
              <Circle
                cx={xOf(activeIdx)} cy={yOf(data[activeIdx])}
                r={7} fill={color} stroke="#fff" strokeWidth={2.5}
              />
              {/* Tooltip 气泡 */}
              <Rect
                x={tBx} y={tBy}
                width={TW} height={TH}
                rx={8} fill="#2C2C2C" opacity={0.88}
              />
              <SvgText
                x={tBx + 10} y={tBy + 15}
                textAnchor="start" fontSize={11} fill="#FFFFFF" opacity={0.85}
              >
                {labels[activeIdx]}
              </SvgText>
              <SvgText
                x={tBx + 10} y={tBy + (hasExtra ? 31 : 33)}
                textAnchor="start" fontSize={13} fill="#4DEBA5" fontWeight="bold"
              >
                {data[activeIdx].toLocaleString()} kg·次
              </SvgText>
              {hasExtra && (
                <SvgText
                  x={tBx + 10} y={tBy + 49}
                  textAnchor="start" fontSize={10} fill="#BBBBBB"
                >
                  {extraText}
                </SvgText>
              )}
            </>
          )}

        </G>
      </Svg>
    </View>
  );
}
