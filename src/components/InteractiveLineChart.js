import React, { useState, useRef } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, {
  Path, Line, Circle, Rect, G,
  Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg';
import { useTheme } from '../ThemeContext';

/**
 * InteractiveLineChart
 * Props:
 *   labels      string[]   x 轴标签（与 data 等长）
 *   data        number[]   y 值
 *   width       number     总宽度（含内边距）
 *   height      number     总高度（含内边距），默认 210
 *   color       string     主题色，默认使用 theme.accent
 *   gradientId   string     SVG gradient id，多图共存时须唯一，默认 "ilc_grad"
 *   tooltipExtra   string[]   可选，每个数据点对应的附加文字（如健身房名），显示在气泡第三行
 *   highlightIndex number    可选，需要高亮显示的数据点 index（橙色大点）
 */
export default function InteractiveLineChart({
  labels,
  data,
  width,
  height = 210,
  color,
  gradientId = 'ilc_grad',
  tooltipExtra = null,
  highlightIndex = null,
}) {
  const { theme, isDark } = useTheme();
  const lineColor = color || theme.accent;

  const [activeIdx, setActiveIdx] = useState(null);
  const activeIdxRef = useRef(null);

  const padL = 52, padR = 16, padT = 16, padB = 38;
  const cW = width - padL - padR;
  const cH = height - padT - padB;

  const n = data.length;
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const vRange = maxV - minV || 1;

  const xOf = (i) => (i / Math.max(n - 1, 1)) * cW;
  const yOf = (v) => cH - ((v - minV) / vRange) * cH;

  const linePts = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
  const linePath = linePts.join(' ');
  const areaPath = `${linePath} L${xOf(n - 1).toFixed(1)},${cH} L0,${cH} Z`;

  const maxXLabels = 6;
  const xStep = Math.max(1, Math.ceil(n / maxXLabels));
  const xLabelIdxs = [];
  for (let i = 0; i < n; i += xStep) xLabelIdxs.push(i);
  if (xLabelIdxs[xLabelIdxs.length - 1] !== n - 1) xLabelIdxs.push(n - 1);

  const yTicks = [minV, minV + vRange / 2, maxV].map(v => Math.round(v));
  const fmtY = (v) => v >= 10000 ? `${(v / 1000).toFixed(0)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

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

  // Theme-aware colors
  const gridColor = isDark ? '#333333' : '#EFEFEF';
  const axisLabelColor = theme.textFaint;
  const tooltipBg = isDark ? '#3A3A3A' : '#2C2C2C';
  const highlightDotColor = theme.orangeLabel || '#FF9500';

  return (
    <View
      {...panResponder.panHandlers}
      accessibilityLabel="训练量趋势图，可滑动查看每日数据"
      accessibilityRole="image"
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.28" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0.01" />
          </LinearGradient>
        </Defs>

        <G x={padL} y={padT}>

          {yTicks.map((v, i) => (
            <G key={i}>
              <Line
                x1={0} y1={yOf(v)} x2={cW} y2={yOf(v)}
                stroke={gridColor} strokeWidth={1}
              />
              <SvgText
                x={-6} y={yOf(v) + 4}
                textAnchor="end" fontSize={10} fill={axisLabelColor}
              >
                {fmtY(v)}
              </SvgText>
            </G>
          ))}

          <Path d={areaPath} fill={`url(#${gradientId})`} />
          <Path d={linePath} stroke={lineColor} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {activeIdx === null && data.map((v, i) => (
            i === highlightIndex
              ? <Circle key={i} cx={xOf(i)} cy={yOf(v)} r={6} fill={highlightDotColor} stroke="#fff" strokeWidth={2} />
              : <Circle key={i} cx={xOf(i)} cy={yOf(v)} r={3.5} fill={lineColor} />
          ))}

          {xLabelIdxs.map(i => (
            <SvgText
              key={i}
              x={xOf(i)} y={cH + 24}
              textAnchor="middle" fontSize={10} fill={axisLabelColor}
            >
              {labels[i]}
            </SvgText>
          ))}

          <Line x1={0} y1={cH} x2={cW} y2={cH} stroke={gridColor} strokeWidth={1} />

          {activeIdx !== null && (
            <>
              <Line
                x1={xOf(activeIdx)} y1={0}
                x2={xOf(activeIdx)} y2={cH}
                stroke={lineColor} strokeWidth={1.2}
                strokeDasharray="5,3" opacity={0.7}
              />
              <Circle
                cx={xOf(activeIdx)} cy={yOf(data[activeIdx])}
                r={7} fill={lineColor} stroke="#fff" strokeWidth={2.5}
              />
              <Rect
                x={tBx} y={tBy}
                width={TW} height={TH}
                rx={8} fill={tooltipBg} opacity={0.88}
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
                {data[activeIdx].toLocaleString()} 千克·次
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
