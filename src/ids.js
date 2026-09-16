// 统一的 ID 生成。
//
// 为什么不用「先塞临时 ID、成功后再换成服务端 ID」那一套：
// 乐观更新插入的临时 ID 会被列表渲染出来，用户点进详情页时经由 route.params
// 带走。route.params 传进去就不再更新，所以哪怕几百毫秒后缓存里的 ID 已经换成
// 真 UUID，那个页面手里攥着的还是临时 ID，后续写入就会带着它发给服务端。
//
// 2026-09-15 的线上事故正是如此：Supabase 当时响应变慢（PostgREST 日志里有大量
// "Thread killed by timeout manager"），窗口被拉长到数秒，用户点进新建的器械
// 保存记录，Postgres 报
//   invalid input syntax for type uuid: "temp_1789483866800"
// PostgREST 返回 400，而 App 把错误吞掉显示成「请检查网络连接」。
//
// 现在改成客户端直接生成合法 UUID 并作为主键写入：乐观更新用的 ID 从一开始
// 就是最终 ID，不存在「换 ID」这个环节，这一类 bug 整体消失。
// 表的 id 默认值是 gen_random_uuid()，只在不传时生效，传了就用传入的；
// RLS 策略只校验 auth.uid() = user_id，不限制 id。
//
// 用 Math.random 而不是密码学随机源，是刻意的取舍：
//   - 这些 ID 不是密钥。RLS 按 user_id 隔离，猜中 ID 也读不到别人的数据，
//     不存在依赖「不可预测性」的安全边界。
//   - v4 有 122 位随机性，碰撞概率可忽略。
//   - 换取的是「纯 JS、无原生依赖」——这个修复因此可以走 OTA 直接推给现有
//     用户，不必等发版审核。对一个正在影响线上用户的 bug，这一点很重要。
// 如果将来这些 ID 变成了对外暴露的、需要不可枚举的标识，再换成 expo-crypto。

const HEX = [];
for (let i = 0; i < 256; i++) HEX.push((i + 0x100).toString(16).slice(1));

export function newId() {
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = (Math.random() * 256) | 0;
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10x
  return (
    HEX[b[0]] + HEX[b[1]] + HEX[b[2]] + HEX[b[3]] + '-' +
    HEX[b[4]] + HEX[b[5]] + '-' +
    HEX[b[6]] + HEX[b[7]] + '-' +
    HEX[b[8]] + HEX[b[9]] + '-' +
    HEX[b[10]] + HEX[b[11]] + HEX[b[12]] + HEX[b[13]] + HEX[b[14]] + HEX[b[15]]
  );
}
