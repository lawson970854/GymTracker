# GymTracker

一个极简的健身训练记录 App，专为**经常出差、辗转不同健身房**的健身者设计。

## 为什么做这个

市面上的健身记录App功能都太多，对新手不友好；而且大多假设你长期固定在一家健身房，**不支持跨健身房的同类器械数据关联**。

GymTracker 只解决三件事：

1. **记录每次的训练数据**（重量、组数、次数）
2. **一眼看到该器械的历史最佳**，自动设为默认值，便于突破
3. **跨健身房关联同类器械**（比如不同店的"杠铃卧推"），看到自己在某个动作上的完整进步曲线

## 当前功能

- 健身房 / 器械 / 训练记录的增删改查（左滑编辑或删除）
- 训练量趋势图（单器械 / 单分类）
- 分类系统：把不同健身房里的同类器械归到一个分类，统一看进步
- 个人资料：昵称、性别、生日、身高、体重、所在城市、头像
- 日历视图：按日期查看训练历史
- 历史最佳奖杯弹窗
- 明亮 / 深色主题
- 邮箱注册登录 + 云端同步（Supabase）

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | [Expo](https://expo.dev) (React Native) |
| 导航 | React Navigation |
| 状态/数据 | TanStack Query |
| 后端 | [Supabase](https://supabase.com)（Postgres + Auth + Storage） |
| 主题 | 自建 ThemeContext + AsyncStorage 持久化 |
| 图表 | react-native-svg 自绘 |

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置 Supabase
# 编辑 src/supabase.js，填入你的 SUPABASE_URL 和 SUPABASE_ANON_KEY
# 数据库 schema 见 ./schema.sql（待补充）

# 3. iOS 模拟器调试
npx expo start
# 然后按 i 启动模拟器

# 4. 真机 Release 包（自己手机用）
npx expo run:ios --configuration Release --device
```

## 项目状态

- ✅ 自用阶段：作者个人在用，跨健身房记录、看趋势已能满足需求
- 🚧 未发布：还没上架 App Store
- 🎯 后续：先用 3-6 个月看产品稳定性，再考虑分享给朋友 / 公开发布

## 数据隐私

- 训练数据存在用户自己绑定的 Supabase 账户下
- Supabase 通过 Row Level Security (RLS) 保证用户数据隔离
- 不包含任何第三方分析 SDK 或广告
- 头像图片存 Supabase Storage（公开 bucket）

## License

[MIT](./LICENSE)
