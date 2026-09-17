# 开发与测试环境

记录本项目的签名配置、调试方式，以及已经踩过的环境坑。
最后更新：2026-09-17。

---

## 一、账号与签名

### 现状（唯一正确的配置）

```
Apple ID    zhangevelyn915@gmail.com
Team        Xiaobei Zhang / 6AF493998B      （付费开发者账号，Role: Admin）
证书        Apple Development: Xiaobei Zhang (7F8444JSJ6)
            OU=6AF493998B，有效期至 2027-09-07
Profile     iOS Team Provisioning Profile: com.frankwang.gymtracker
            已注册设备 1 台（F-iPhone），有效期至 2027-09-16
工程         DEVELOPMENT_TEAM = 6AF493998B
```

三处指向同一个 team，不再有歧义。随时可以这样验证：

```bash
security find-identity -v -p codesigning
```

应当**只有一条**结果。如果出现第二个 team 的证书，说明又混进来了，删掉。

### 历史（为什么曾经很乱）

| 阶段 | 账号 | 装机方式 |
|---|---|---|
| 早期 | `ww970854@hotmail.com`（免费，team `YDYVJ95N3J`） | 数据线 + Xcode |
| 上架前 | 购买付费账号 `zhangevelyn915@gmail.com` | 切换到 EAS 云端构建 |
| 上架后 | 同上 | TestFlight 下载 |

免费 team 的证书已于 2026-09-16 从钥匙串删除，Xcode 里的账号也已移除。**未来一律使用付费账号。**

付费之后一直走 TestFlight，云端签名，所以本机从未生成过 provisioning profile——这就是 2026-09-16 第一次尝试本机装真机时报
`Device "F-iPhone" isn't registered in your developer account` 的原因，不是配置坏了，是本来就没建过。

### 新增一台测试设备

1. 设备连上 Mac，解锁
2. Xcode 打开 `ios/GymTracker.xcworkspace`
3. 顶部工具栏选中该设备 → ⌘B
4. Xcode 自动注册设备并下载 profile
5. 验证：Settings → Apple Accounts → On Device Testing 的设备数 +1

---

## 二、改动需不需要重新构建？

一个 iOS App = **原生壳** + **JS 内容**。只有动了壳才需要重新编译安装。

**需要重新构建：**

- 增删原生依赖（`npx expo install` 装了带原生代码的包）
- 改 `app.json` 里影响原生的配置：权限声明、图标、名称、`plugins`、`infoPlist`
- 升级 Expo SDK / React Native

**不需要重新构建（改完存盘即生效）：**

- 所有 JS/TS 改动：业务逻辑、界面、样式、bug 修复
- 语言包 JSON（但见下方「已知的坑 5」，需要完整重启 App 而非 Fast Refresh）

日常工作里后者占 95% 以上。**不要养成"改完就重编"的惯性**，那会把几秒的事变成几分钟。

---

## 三、四种场景

### 1. 日常开发（最常用）

壳已经装在手机上，只改 JS：

```bash
npx expo start
```

手机和 Mac 保持同一 Wi-Fi，改完存盘即可。Metro 必须一直开着。

### 2. 动了原生部分，需要重装

本机构建是默认方式（比 EAS 快，签名已配好）。
**`npx expo run:ios` 在这台 Mac 上不可用**（原因见坑 1），用仓库里的脚本：

```bash
./scripts/run-device.sh
```

它做四件事：检查设备是否连着（否则 xcodebuild 会以一句很难懂的
`Unable to find a destination matching...` 失败）、编译、把 Metro 地址改成
mDNS 主机名、安装并启动。手机锁屏时会重试等待解锁。

如果改了 `app.json` 的原生配置，先跑这两条再执行脚本：

```bash
npx expo prebuild --platform ios
LANG=en_US.UTF-8 pod install --project-directory=ios
```

当前设备 UDID：`00008150-000202991146401C`（F-iPhone / iPhone 17）。
换设备用 `DEVICE_UDID=xxx ./scripts/run-device.sh`。

### 3. 发版前验证

EAS 云端构建 → TestFlight。用于最终验证，不用于日常调试。

### 4. 线上紧急修复

`eas update` 推 JS 补丁。**动手前先读第五节。**

---

## 四、关于 expo-dev-client

**不装。** 评估过，对当前情况没有价值：

它提供的是启动器界面——扫码连接不同 Metro、免数据线安装、多开发服务器切换。这些在「单人 + 一台 Mac + 一部 iPhone + 数据线在手边」的场景下用不上。而普通 Debug 包**已经具备 JS 实时加载能力**，这才是日常最需要的。

代价则是多一个原生依赖，而本项目对新增原生模块是敏感的（见坑 2）。

将来如果需要免数据线分发给别人测试，再重新评估。

---

## 五、OTA 更新纪律

`app.json` 里写死了频道：

```json
"updates": { "requestHeaders": { "expo-channel-name": "production" } }
```

含义是：**任何本地 Release 构建都会去拉 production 频道的更新**，可能覆盖掉你刚编译进去的代码。调试一律用 Debug 配置，原因就在这里。

更重要的是：**`eas update` 是一次面向全体用户的发布**，不是"推给我自己看看"。

推送前必须确认 `main` 上的全部内容都是可以发布的。当前 `main` 上叠着完整的 i18n 改造，其中包含可见的产品变更（训练量单位从「千克·次」改为 `kg`，组次排法改为 `52.5 kg × 12/12/10`）。**在这些变更经过完整验证之前，不要执行 `eas update`。**

如果只想推某个修复，从上线版本拉分支、只 cherry-pick 那个提交、再从该分支推送。

---

## 六、已知的环境坑

### 坑 1：`expo run:ios` 完全不可用

这台 Mac 上 **Simulator.app 不存在**——Xcode 27 的 bundle 里深搜不到，Spotlight 也搜不到，推测是被清理工具误删。

后果是 `expo run:ios` **即使加了 `--device` 也会失败**，因为它在开始构建前会先去查询 Simulator.app 的 bundle id：

```
CommandError: Can't determine id of Simulator app
```

报错里建议的 `sudo xcode-select -s /Applications/Xcode.app` **是无效的**，`xcode-select` 早就指对了。

底层完全正常（`simctl` 能列出并启动模拟器、iOS 运行时齐全），缺的只是 Apple 那个 GUI 外壳。彻底修复需要重装 Xcode；目前用第三节的 xcodebuild 方案绕过。

### 坑 2：Xcode 27 拒绝旧的部署目标

Xcode 27 把最低部署目标提到 iOS 15.0，并从警告升级为**硬错误**。而多个第三方 Pod 的 podspec 仍写着 12.x / 13.x：

| Pod | 声明 | 来源 |
|---|---|---|
| ReachabilitySwift | 12.0 | expo-updates 的传递依赖，不受 package.json 控制 |
| RNCAsyncStorage_resources | 13.4 | async-storage（最新的 3.1.1 是 13.0，依旧 <15） |
| RNSVG-RNSVGFilters | 12.4 | react-native-svg（最新的 15.15.5 也没改） |

**升级这些包解决不了**（已实际下载最新版核对过 podspec）。

已通过 config plugin [`plugins/withIosDeploymentTarget.js`](plugins/withIosDeploymentTarget.js) 解决——在 `post_install` 里把所有 Pod 目标统一抬到 16.4。写成插件而不是直接改 `ios/Podfile`，是因为 `ios/` 由 prebuild 生成且在 .gitignore 里，手改会被冲掉，EAS 云端更是每次从头生成。

### 坑 3：本地网络权限

iOS 14 起，App 访问局域网 IP 需要用户授权，而授权弹窗只在 Info.plist 声明了用途说明时才出现。缺声明的话**系统静默拒绝**。

症状是 App 红屏：

```
No script URL provided
unsanitizedScriptURLString = (null)
```

容易误判为网络不通——但用 Safari 访问 `http://<MAC_IP>:8081/status` 是通的（浏览器不受此限制）。

已在 `app.json` 的 `ios.infoPlist` 里加了 `NSLocalNetworkUsageDescription`。首次安装后打开 App 会弹窗询问，**必须点允许**。误点拒绝的话去 设置 → 隐私与安全性 → 本地网络 手动打开。

### 坑 4：手机状态导致的失败

- **锁屏** → 安装报 `The device is not able to fulfill the requested usage assertion requirements`，或启动报 `BSErrorCodeDescription = Locked`。建议调试期间把 设置 → 显示与亮度 → 自动锁定 设为「永不」
- **掉 Wi-Fi** → 红屏，报错和坑 3 一模一样。**先看状态栏有没有 Wi-Fi 图标**，掉到蜂窝网络就连不上 Metro
- **拔线** → `devicectl` 显示 `unavailable`，`run-device.sh` 会直接告诉你

### 坑 5：改语言包必须完整重启 App

Fast Refresh 会重新渲染组件（新的 `t('xxx')` 调用会生效），但**不会重新执行 i18next 的初始化**，所以运行中的实例里还是旧的语言包。表现为界面上直接显示 key 名。

改了 `src/i18n/locales/*.json` 之后，杀掉 App 重开，不要只存盘。

### 坑 6：命令行跑 `pod install` 要带 LANG

否则 Ruby 按 ASCII 处理路径，CocoaPods 直接崩：

```
Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)
```

加 `LANG=en_US.UTF-8` 即可。（交互式终端通常自带，脚本里要显式给。）

### 坑 7：Metro 地址是编译时烘进包里的

RN 的构建脚本 `node_modules/react-native/scripts/react-native-xcode.sh`
遍历 `en0`~`en8` 取第一个有 IP 的网卡，写进包内的 `ip.txt`，App 靠它找 Metro。

**它完全不读 `REACT_NATIVE_PACKAGER_HOSTNAME`**——传这个环境变量没有任何作用
（曾经误以为有用，因为传的值恰好等于当时的 IP，看不出区别）。

后果是 Mac 的 IP 一变，手机就红屏报 `No script URL provided`，而 Metro
其实好好跑着。2026-09-16 到 17 日之间因为这个折腾了两次。

`run-device.sh` 的解法：构建完之后把 `ip.txt` 改写成 mDNS 主机名
（`F-Mac.local`），IP 怎么变都能解析到。`ip.txt` 是纯文本资源、不参与签名校验，
构建后再改是安全的，已实测通过。主机名解析不了时脚本自动退回 IP。

---

## 七、排查线上问题

2026-09-15 的事故（保存记录失败）花了很久，因为错误被 App 吞掉了。现在有两条路径拿到真实错误：

**1. 客户端日志**

所有 mutation 的错误已统一经过 [`src/mutationError.js`](src/mutationError.js)，会打进 console：

```
[addRecord] {code: "22P02", message: "invalid input syntax for type uuid: ..."}
```

**2. Supabase 服务端日志（可回溯）**

这是最有力的手段——**它能查历史**，不需要复现。项目 ref：`imffuhuysgxbnvehwrpj`（东京区 ap-northeast-1）。

在 Supabase Dashboard 的 Logs 里按时间窗查：

- `edge_logs` — 每个 API 请求的方法、路径、状态码。**没有记录 = 请求根本没到达 = 网络问题**
- `postgres_logs` — 数据库的真实报错（那次的 `invalid input syntax for type uuid` 就在这里）
- `postgrest_logs` — 服务端超时等（那次有大量 `Thread killed by timeout manager`，正是它把竞态窗口拉大到用户能踩中）

日志窗口上限 24 小时，超过就查不到了。**线上出问题当天就要查。**

---

## 八、待办

- **`regions.js` / `GENDERS` 存的是标签而非代码**，换语言后同一账号读不出来。需要改成存代码 + 渲染时查表，**阻塞点是要给 Supabase `profiles` 表加 `country` 列**，需要先确认迁移策略
- **日历周首日写死了周一**，应改为跟随系统区域（`getCalendars()[0].firstWeekday`）。Hermes 的 `Intl.DateTimeFormat` / `NumberFormat` 已实测可用，不需要引入 date-fns
- **12 个 Expo 包版本偏旧**（`expo` 是 56.0.3，SDK 56 期望 56.0.21）。建议找个独立时间跑 `npx expo install --fix` 统一升级并完整回归，不要和别的改动混在一起
- **线上 App Store 版本仍带着临时 ID 的 bug**，见第五节关于如何安全推送的说明
