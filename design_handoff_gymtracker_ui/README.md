# 落地说明 · GymTracker「Precision Instrument」界面优化

## 这是什么

一次**纯视觉**的界面升级（结构、导航、数据流、文案表述**完全不变**）。目标是把现有的扁平灰白界面，升级成「精密仪器」质感：暖中性底色 + 发丝级描边 + 更大圆角 + 用 **Sora** 字体把数字当主角，并提供 **6 套用户可选配色**。

> ⚠️ 本包里的 `*.html / *.css / *.js` 是**设计参照（用 HTML 做的高保真原型）**，不是要直接搬进 App 的代码。你的任务是：在现有的 **Expo / React Native** 工程里，用它已有的模式（`ThemeContext` + 各屏 `makeStyles(theme)`）**还原这套视觉**。

**保真度：高保真（hifi）** —— 颜色、字体、圆角、间距均为最终值，按下文 token 精确落地即可。

---

## 落地总览（4 步）

这套升级 90% 来自 **token + 字体** 的替换，剩下是少量组件级调整。按顺序做：

1. **换字体**（Sora + Manrope）
2. **换 `ThemeContext.js`**（新调色板 + 6 套配色，token key 不变 → 多数屏幕自动换肤）
3. **调全局圆角 / 发丝描边**
4. **逐组件微调**（数字字体、统计数字对齐、左滑按钮、最佳卡片、明暗切换图标化、外观页加配色选择器）

---

## 1. 字体

用 Google Fonts 的 Expo 包：

```bash
npx expo install @expo-google-fonts/sora @expo-google-fonts/manrope expo-font
```

在 `App.js` 根部加载（沿用你现有的启动流程）：

```js
import { useFonts } from 'expo-font';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';

const [fontsLoaded] = useFonts({
  Sora_600SemiBold, Sora_700Bold,
  Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
});
if (!fontsLoaded) return null; // 或你现有的 splash
```

**用法约定**
- **数字 / 大指标**（训练量、最佳、统计数、重量、次数、图表轴）→ `FONTS.num` = `Sora_600SemiBold`（特大标题用 `Sora_700Bold`）
- **中文正文 / 标签 / 按钮** → `Manrope_*`（中文会自动回退到系统苹方，没问题）
- 凡是显示数字的 `Text`，加上 `fontVariant: ['tabular-nums']` 让数字等宽对齐。

---

## 2. ThemeContext.js（直接替换）

用本包内的 `ThemeContext.js` 覆盖你现有的同名文件。要点：

- **token key 完全沿用**（`bg / card / input / textPrimary / textSecondary / textMuted / textFaint / border / borderAlt / accent / accentBg / gold / goldBg / goldBorder …`），所以各屏的 `makeStyles(theme)` 大多**无需改动**即可换肤。
- 新增：`scheme`（配色）状态 + `setScheme()`，6 套：`emerald(默认) / blue / indigo / coral / pink / graphite`；持久化在你已有的 `app_settings_v1` 里（新增字段 `colorScheme`）。
- 新增 token：`card2`（更弱的卡片底）、`accentInk`（小字用的深一档强调色）、`onAccent`（强调色上的文字色）、`divider`。
- 导出 `RADIUS`、`FONTS`、`SCHEMES`、`SCHEME_LABELS` 供组件使用。

> 之前 `theme.divider` 是用 `||` 兜底的，现在 `ThemeContext` 正式提供了 `divider`，可以保留也可以去掉兜底。

---

## 3. 全局圆角 & 描边

把 `RADIUS` 提到现在的值，并给**所有卡片**统一加「发丝描边 + 更柔的阴影」。

```js
export const RADIUS = { card: 22, lg: 26, btn: 15, input: 13, pill: 999, modal: 24 };

// 卡片统一基样式（替换旧的 borderRadius:12 + 强阴影）：
card: {
  backgroundColor: t.card,
  borderRadius: RADIUS.card,
  borderWidth: 1, borderColor: t.border,           // ← 新增发丝描边
  shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 }, elevation: 2,
},
```

- 列表行、统计卡、表单卡、图表卡、历史卡：圆角 `12 → 22`，并加 `borderWidth:1, borderColor: t.border`。
- 主按钮：圆角 `12 → 15`，高度 `~54`，文字 `Manrope_700Bold`，`color: t.onAccent`。
- 深色模式下阴影几乎不可见，靠描边区分层级即可（已在 token 内调好）。

---

## 4. 逐组件微调

下面只列**与单纯换 token 不同**的地方。文件名对应你仓库 `src/`。

### 4.1 数字字体 & 对齐（全局）
- 所有「大数字」`Text` 改用 `fontFamily: FONTS.num` + `fontVariant:['tabular-nums']`。
- **MachineScreen 统计三宫格**（`statNum`）：三个数字**统一字号**（建议 `20`，`lineHeight:22`），不要给「总训练量」单独缩小字号——这是之前不对齐的原因。`38,200` 用 `toLocaleString()`，**不要**缩写成 `38.2k`。
- 图表纵轴标签同样用**完整数字**（`InteractiveLineChart.js` 里把 `fmtY` 的 `k` 缩写去掉，直接 `v.toLocaleString()`）。

### 4.2 历史最佳卡片（`MachineScreen` / `CategoryScreen` 的 bestCard）
- 背景改为淡金渐变：`goldBg → card`；`borderColor: t.goldBorder`；圆角 `RADIUS.lg`。
- 顶部加一个 `30×30` 圆角金色小徽标（奖杯图标，`color:#fff`）+ `历史最佳`（金色、字间距 1.4、大写感）。
- 数值用 `Sora_700Bold`、`~46`、`letterSpacing:-1.5`，单位「千克·次」用小一号灰字。

### 4.3 列表行（`HomeScreen` / `GymScreen` / `CategoryListScreen`）
- 左侧加 `44×44`、圆角 `14`、`accentBg` 底的图标格（定位/哑铃/标签 线性图标）。
- 副标题里的「最佳 … 千克·次」「X 个器械」用 `accentInk`、`fontWeight:600`，并加 `numberOfLines={1}`（避免「千克·次」换行）。

### 4.4 左滑操作按钮（统一圆角）⭐ 之前的问题
旧版「编辑」直角、「删除」圆角，不一致。改为：两个操作都是**同样圆角的独立按钮**（图标在上、文字在下），按钮间留 `~9px` 间距。

```js
swipeAct: { width: 64, borderRadius: 18, alignItems:'center', justifyContent:'center', gap:5 },
// 编辑：backgroundColor 浅蓝 (#5B8DEF)；删除：红 (#E5484D)
// renderRightActions 里把两个 action 包进一个 gap:9 的 row，各自 borderRadius:18
```

### 4.5 底部 Tab（保持 4 个）
- 仍是 **记录 / 分类 / 日历 / 我的**（第一个是「记录」），不增不减、文案不变。
- 视觉：毛玻璃底（`card` 86% + blur）、发丝顶边；选中项用 `accent` 着色。
- 图标用线性风格（24px，stroke 2）。

### 4.6 明暗切换（`ProfileScreen` 外观）⭐ 改为图标
- 只保留**明亮 / 深色**两项；按钮**去掉文字，只用符号**：
  - 明亮 = ☀ 太阳线性图标；深色 = ☾ 月牙线性图标。
  - 选中态：白底（深色模式下 `#2a2a26`）+ 轻阴影；用 `accessibilityLabel` 保留「明亮 / 深色」无障碍文案。

### 4.7 外观页新增「配色方案」选择器 ⭐ 新功能
在 `ProfileScreen` 的「外观」卡片里，主题下方加一行配色色块：

```jsx
import { SCHEMES, SCHEME_LABELS } from '../ThemeContext';
const { scheme, setScheme } = useTheme();

<View style={{ flexDirection:'row', gap:12, flexWrap:'wrap' }}>
  {SCHEMES.map(key => (
    <TouchableOpacity key={key} onPress={() => setScheme(key)}
      accessibilityLabel={SCHEME_LABELS[key]} accessibilityRole="button"
      style={{
        width:34, height:34, borderRadius:11,
        backgroundColor: ACCENT_SWATCH[key],          // 见下方色值表
        borderWidth:2, borderColor: scheme===key ? theme.textPrimary : 'transparent',
      }} />
  ))}
</View>
```

`setScheme` 已自动持久化，全 App 通过 `useTheme()` 实时换肤。

### 4.8 弹窗（Trophy / 选择器 / 编辑弹层 / 分类添加）
- 遮罩：纯色 `rgba(10,9,8,0.5)`（**不要**用模糊，性能与一致性更好）。
- 卡片/弹层圆角：居中卡 `RADIUS.lg`，底部弹层顶部圆角 `24`，顶部加 `38×5` 灰色把手。
- 奖杯弹窗：`84` 金色圆形图标 + `突破个人记录！`。
- 编辑底部弹层：日期 chip + 重量 stepper + 每组次数 + 取消/保存（保存按钮 `flex:2`）。

---

## 配色色值表（swatch 用 / 浅色模式 accent）

| scheme | 中文 | accent(浅) | accent(深) |
|---|---|---|---|
| emerald（默认） | 翠绿 | `#0E9F6E` | `#2BD79A` |
| blue | 海蓝 | `#1F77D6` | `#5AB0FF` |
| indigo | 靛蓝 | `#5145D6` | `#8A7DFF` |
| coral | 珊瑚 | `#E0552B` | `#FF7A4D` |
| pink | 玫粉 | `#D6418A` | `#FF80BC` |
| graphite | 石墨 | `#26251F` | `#EDEBE3` |

（`accentBg` / `accentInk` 见 `ThemeContext.js` 内 `ACCENTS`。）

---

## 设计参照文件（本包内）

- `GymTracker 界面优化.html` —— 8 个界面 + 4 个交互态的高保真原型；顶部可切换配色 / 明暗 / 数字字体
- `gymtracker.css` —— 全部设计 token 与组件样式（CSS 变量命名与本文 token 一一对应，可直接对照取值）
- `screens.js` —— 各界面与组件的结构标记
- `ThemeContext.js` —— **可直接落地**的 RN 主题文件（覆盖你 `src/ThemeContext.js`）

## 实现顺序建议
先做 1（字体）+ 2（ThemeContext）+ 3（圆角描边）跑通整体换肤 → 再按 4.1～4.8 逐项打磨 → 最后核对 6 套配色在明/暗下的对比度。
