// mutation 失败的统一处理。
//
// 三件事必须同时做到：回滚乐观更新、把真实错误留给开发者、给用户一句能看懂的话。
// 以前每个 mutation 各写一遍，且都只做了第一、三件，真实错误被完全丢弃。
//
// 2026-09-15 的线上事故就栽在这里：Postgres 返回的是一条非常明确的
//   invalid input syntax for type uuid: "temp_1789483866800"
// 但 App 把它显示成「请检查网络连接」，于是排查方向被引向网络，绕了一大圈才
// 靠翻 Supabase 服务端日志定位。错误可以不给用户看，但绝不能丢掉。
//
// 收敛成一个工厂函数，新增 mutation 时照抄一行即可，不会再出现「这个忘了记日志」。
import { Alert } from 'react-native';
import i18n from './i18n';

/**
 * @param {object} qc        QueryClient
 * @param {any}    queryKey  出错时要回滚的查询键
 * @param {string} scope     日志标识，用 mutation 的用途命名，如 'addGym'
 * @param {string} titleKey  弹窗标题的 i18n key，如 'common.addFailed'
 */
export function onMutationError(qc, queryKey, scope, titleKey) {
  return (err, vars, ctx) => {
    if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    // 这里直接用 i18n.t 而不是组件里的 t：弹窗在调用那一刻取值，
    // 不需要跟随语言切换重渲染，这样这个函数就不必是个 hook。
    console.error(`[${scope}]`, err);
    Alert.alert(i18n.t(titleKey), i18n.t('common.networkError'));
  };
}
