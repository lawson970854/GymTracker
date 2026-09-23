// 长按拖拽排序的列表。健身房 / 器械 / 分类三个列表共用。
//
// 为什么不用 react-native-draggable-flatlist：它依赖 useAnimatedGestureHandler，
// 这个 API 在 Reanimated 4 里已经移除了。
//
// 为什么不是 FlatList：拖拽要求所有行同时可被绝对定位和位移，虚拟化会卸载屏幕外的行，
// 被拖走的那一行一滚出视野就没了。这三个列表最多几十行，全量渲染没有压力。
//
// 行高假设：同一列表内所有行等高（卡片结构相同、标题都是 numberOfLines={1}），
// 所以只量第一行，其余按这个高度推算。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler,
  useAnimatedStyle, useFrameCallback, useSharedValue, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const SPRING = { damping: 20, stiffness: 220, mass: 0.6 };
const LONG_PRESS = 300;  // 按住多久进入拖拽。短于此的横滑仍然归左滑菜单
const EDGE = 80;         // 拖到距可视区上下边缘多少像素时开始自动滚动
const MAX_STEP = 12;     // 自动滚动每帧最多走多少像素

const liftHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
const swapHaptic = () => Haptics.selectionAsync();

function clamp(v, lo, hi) {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

// 把当前手指位置换算成目标槽位，并让被挤开的行整体平移一格。
// 手指不动但页面在自动滚动时也要重算，所以抽成 worklet 给手势和帧回调共用。
function applyDrag(ctx) {
  'worklet';
  const id = ctx.activeId.value;
  const h = ctx.itemHeight.value;
  if (id === null || !h) return;

  ctx.dragY.value =
    ctx.dragFrom.value + ctx.translation.value + (ctx.scrollY.value - ctx.dragScrollFrom.value);

  const from = ctx.positions.value[id];
  if (from === undefined) return;
  const to = clamp(Math.round(ctx.dragY.value / h), 0, ctx.count.value - 1);
  if (to === from) return;

  // 整体平移而不是两两交换：快速拖动时一帧可能跨过好几格，
  // 交换会把中间那些行留在错位的槽里。
  const next = { ...ctx.positions.value };
  for (const key in next) {
    if (key === id) continue;
    const p = next[key];
    if (from < to && p > from && p <= to) next[key] = p - 1;
    else if (from > to && p >= to && p < from) next[key] = p + 1;
  }
  next[id] = to;
  ctx.positions.value = next;
  runOnJS(swapHaptic)();
}

function Row({ id, index, ctx, measured, onMeasure, children }) {
  const pan = useMemo(
    () => Gesture.Pan()
      .maxPointers(1)
      .activateAfterLongPress(LONG_PRESS)
      .onStart(() => {
        if (ctx.count.value < 2 || !ctx.itemHeight.value) return;
        ctx.activeId.value = id;
        ctx.dragFrom.value = (ctx.positions.value[id] ?? 0) * ctx.itemHeight.value;
        ctx.dragScrollFrom.value = ctx.scrollY.value;
        ctx.scrollTarget.value = ctx.scrollY.value;
        ctx.translation.value = 0;
        ctx.dragY.value = ctx.dragFrom.value;
        runOnJS(liftHaptic)();
        // 展开着的左滑菜单要收起来：它是绑在行上的，不收的话会跟着行一路拖到新位置。
        runOnJS(ctx.notifyDragStart)();
      })
      .onUpdate((e) => {
        if (ctx.activeId.value !== id) return;
        ctx.translation.value = e.translationY;
        applyDrag(ctx);
      })
      .onFinalize(() => {
        if (ctx.activeId.value !== id) return;
        const map = ctx.positions.value;
        // 先弹回最终槽位，落位后才交还 activeId。否则样式会在半空中切回
        // 「非拖拽」分支，卡片直接闪到目标位置。
        ctx.dragY.value = withSpring(map[id] * ctx.itemHeight.value, SPRING, (done) => {
          if (done && ctx.activeId.value === id) ctx.activeId.value = null;
        });
        const ordered = Object.keys(map).sort((a, b) => map[a] - map[b]);
        runOnJS(ctx.commit)(ordered);
      }),
    [id],
  );

  const style = useAnimatedStyle(() => {
    const h = ctx.itemHeight.value;
    const active = ctx.activeId.value === id;
    const slot = ctx.positions.value[id] ?? 0;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      zIndex: active ? 20 : 0,
      transform: [
        { translateY: active ? ctx.dragY.value : withSpring(slot * h, SPRING) },
        { scale: withSpring(active ? 1.03 : 1, SPRING) },
      ],
      shadowColor: '#000',
      shadowOpacity: withSpring(active ? 0.25 : 0, SPRING),
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: active ? 12 : 0,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={measured ? style : undefined}
        onLayout={index === 0 ? (e) => onMeasure(e.nativeEvent.layout.height) : undefined}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

export default function DraggableList({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  onDragStart,
  ListEmptyComponent,
  emptyContainerStyle,
}) {
  const [rowHeight, setRowHeight] = useState(0);
  // 拖拽期间必须关掉 ScrollView 的滚动，否则纵向手指移动会被它当成滚动抢走，
  // 行就跟不住手指了。自动翻页走的是 scrollTo，不受 scrollEnabled 影响。
  const [dragging, setDragging] = useState(false);
  const scrollRef = useAnimatedRef();

  const positions = useSharedValue({});
  const activeId = useSharedValue(null);
  const itemHeight = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragFrom = useSharedValue(0);
  const dragScrollFrom = useSharedValue(0);
  const translation = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const scrollTarget = useSharedValue(0);
  const viewportH = useSharedValue(0);
  const contentH = useSharedValue(0);
  const count = useSharedValue(0);

  const ids = data.map(keyExtractor);
  const idsKey = ids.join('|');

  // 手势 worklet 捕获的是 ctx 的一份拷贝，捕获时机是行首次渲染。
  // 所以 ctx 里只能放 shared value（被代理，始终读到最新值）和身份稳定的函数，
  // 每次渲染都换身份的 props 放进来会读到旧值。
  const latest = useRef({});
  latest.current = { ids, onReorder, onDragStart };

  const ctx = useMemo(() => ({
    positions, activeId, itemHeight, dragY, dragFrom, dragScrollFrom,
    translation, scrollY, scrollTarget, viewportH, contentH, count,
    notifyDragStart: () => latest.current.onDragStart?.(),
    commit: (ordered) => {
      const { ids: cur, onReorder: fn } = latest.current;
      if (ordered.length === cur.length && ordered.every((id, i) => id === cur[i])) return;
      fn(ordered);
    },
  }), []);

  // 数据变了（新增、删除、服务端刷新）就重建槽位表。
  // 依赖 idsKey 而不是 ids 数组：keyExtractor 在各屏幕里是内联箭头函数，
  // 拿数组身份当依赖会每渲染一次重置一次槽位，拖到一半就被打断。
  useEffect(() => {
    const map = {};
    ids.forEach((id, i) => { map[id] = i; });
    positions.value = map;
    count.value = ids.length;
  }, [idsKey]);

  useEffect(() => {
    itemHeight.value = rowHeight;
    contentH.value = rowHeight * data.length;
  }, [rowHeight, data.length]);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    if (activeId.value === null) scrollTarget.value = e.contentOffset.y;
  });

  // 拖到边缘时自动翻页，否则超过一屏的列表只能在可见范围内调顺序。
  const frame = useFrameCallback(() => {
    const h = itemHeight.value;
    if (activeId.value === null || !h || !viewportH.value) return;

    const onScreen = dragY.value - scrollY.value;
    let delta = 0;
    if (onScreen < EDGE) delta = -Math.min(MAX_STEP, (EDGE - onScreen) / 5);
    else if (onScreen + h > viewportH.value - EDGE) {
      delta = Math.min(MAX_STEP, (onScreen + h - viewportH.value + EDGE) / 5);
    }
    if (delta === 0) return;

    // 以自己的 scrollTarget 为基准，不读 scrollY —— onScroll 回来有一帧延迟，
    // 拿它累加会一边加速一边抖。
    const max = Math.max(0, contentH.value - viewportH.value);
    const next = clamp(scrollTarget.value + delta, 0, max);
    if (next === scrollTarget.value) return;
    scrollTarget.value = next;
    scrollTo(scrollRef, 0, next, false);
    applyDrag(ctx);
  }, false);

  const onDragStateChange = (isDragging) => {
    frame.setActive(isDragging);
    setDragging(isDragging);
  };

  useAnimatedReaction(
    () => activeId.value !== null,
    (isDragging, prev) => {
      if (isDragging !== prev) runOnJS(onDragStateChange)(isDragging);
    },
  );

  if (data.length === 0) {
    return <View style={emptyContainerStyle}>{ListEmptyComponent}</View>;
  }

  return (
    <Animated.ScrollView
      ref={scrollRef}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      scrollEnabled={!dragging}
      onLayout={(e) => { viewportH.value = e.nativeEvent.layout.height; }}
      showsVerticalScrollIndicator={false}
    >
      {/* 行全是绝对定位，容器撑不起来，高度得自己算 */}
      <View style={rowHeight ? { height: rowHeight * data.length } : null}>
        {data.map((item, i) => (
          <Row
            key={keyExtractor(item)}
            id={keyExtractor(item)}
            index={i}
            ctx={ctx}
            measured={rowHeight > 0}
            // 容差不能省：onLayout 回的是浮点高度，直接用 !== 比较，
            // 末位抖动一下就会 setState → 重新布局 → 再抖，死循环。
            onMeasure={(h) => { if (h > 0 && Math.abs(h - rowHeight) > 0.5) setRowHeight(h); }}
          >
            {renderItem(item, i)}
          </Row>
        ))}
      </View>
    </Animated.ScrollView>
  );
}
