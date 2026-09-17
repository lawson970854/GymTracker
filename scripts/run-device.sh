#!/bin/bash
# 构建 Debug 包并装到真机。
#
# 为什么不用 `npx expo run:ios --device`：
# 这台 Mac 上 Simulator.app 不存在（被误删），而 expo run:ios 即使指定了
# --device，也会在开始构建前先去查询 Simulator.app 的 bundle id，于是直接失败：
#   CommandError: Can't determine id of Simulator app
# 报错里建议的 `sudo xcode-select -s /Applications/Xcode.app` 是无效的，
# xcode-select 本来就指对了。详见 DEVELOPMENT.md 的「坑 1」。
#
# 为什么要覆盖 ip.txt：
# RN 的构建脚本（node_modules/react-native/scripts/react-native-xcode.sh）
# 自己遍历 en0~en8 取第一个有 IP 的网卡写进 ip.txt，**完全不读**
# REACT_NATIVE_PACKAGER_HOSTNAME 这个环境变量。所以 Mac 的 IP 一变，
# 包里烘的地址就失效，手机红屏报 "No script URL provided"。
# 改写成 mDNS 主机名（XXX.local）之后，IP 怎么变都能解析到。
# ip.txt 是纯文本资源，不参与签名校验，构建完再改是安全的。
# 已实测通过；主机名解析不了时自动退回 IP。
set -e

DEVICE_UDID="${DEVICE_UDID:-00008150-000202991146401C}"   # F-iPhone
BUNDLE_ID="com.frankwang.gymtracker"
DERIVED="${DERIVED:-/tmp/gymtracker-dd}"
cd "$(dirname "$0")/.."

# ── 1) 先确认设备可用，否则 xcodebuild 会以一句很难懂的
#       "Unable to find a destination matching..." 失败 ──
# 按 "(UDID)" 标记定位状态字段，不能按固定列数 —— 型号名的词数不固定
# （"iPhone 17" 是两个词，"iPad Air 11-inch (M3)" 更多），会取错。
STATE=$(xcrun devicectl list devices 2>/dev/null | awk -v u="$DEVICE_UDID" \
  '$0 ~ u { for (i=1; i<=NF; i++) if ($i == "(UDID)") { print $(i+1); exit } }')
# connected = 有线连接；available = 已配对可达。两者都能装，其余状态
# （unavailable / 未找到）才是真的没连上。
case "$STATE" in
  connected|available) ;;
  *)
    echo "❌ 设备不可用（当前状态：${STATE:-未找到}）"
    echo "   请插好数据线并解锁手机，然后重试。"
    exit 1 ;;
esac

# ── 2) 构建 ──
echo "▶ 构建中…"
LANG=en_US.UTF-8 xcodebuild \
  -workspace ios/GymTracker.xcworkspace -scheme GymTracker \
  -configuration Debug -destination "id=$DEVICE_UDID" \
  -derivedDataPath "$DERIVED" -allowProvisioningUpdates build \
  > /tmp/gymtracker-build.log 2>&1 || {
    echo "❌ 构建失败，错误如下："
    grep -E "error:" /tmp/gymtracker-build.log | grep -v "func \|_ error:" | sort -u | head -10
    echo "   完整日志：/tmp/gymtracker-build.log"
    exit 1
  }
echo "✅ 构建成功"

APP="$DERIVED/Build/Products/Debug-iphoneos/app.app"

# ── 3) 把 Metro 地址换成主机名（解析不了就保留脚本写的 IP）──
HOST="$(scutil --get LocalHostName).local"
if ping -c 1 -W 2000 "$HOST" >/dev/null 2>&1; then
  echo "$HOST" > "$APP/ip.txt"
  echo "✅ Metro 地址：$HOST（IP 变化不影响）"
else
  echo "⚠️  $HOST 解析不了，沿用 IP：$(cat "$APP/ip.txt")（IP 变了要重新构建）"
fi

# ── 4) 安装。手机锁屏时会失败，重试等待解锁 ──
echo "▶ 安装中…（手机需解锁）"
for i in $(seq 1 12); do
  OUT=$(xcrun devicectl device install app --device "$DEVICE_UDID" "$APP" 2>&1)
  if echo "$OUT" | grep -q "bundleID"; then
    echo "✅ 安装成功"
    xcrun devicectl device process launch --device "$DEVICE_UDID" "$BUNDLE_ID" >/dev/null 2>&1 \
      && echo "✅ 已启动" \
      || echo "⚠️  启动失败（多半是锁屏），手机上点开 App 即可"
    exit 0
  fi
  sleep 5
done
echo "❌ 安装失败，最后一次输出："
echo "$OUT" | head -6
exit 1
