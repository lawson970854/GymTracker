// 登录页的显示开关。
// App 默认直接进主界面（本地模式），只有用户在「我的」里主动点「登录 / 注册」时才弹出
// 登录页；登录成功或用户点「稍后再说」后关闭。状态只活在内存里，不需要持久化。
let visible = false;
const listeners = new Set();

export function isAuthVisible() {
  return visible;
}

export function showAuth() {
  visible = true;
  listeners.forEach(fn => fn(true));
}

export function hideAuth() {
  visible = false;
  listeners.forEach(fn => fn(false));
}

export function subscribeAuthVisible(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
