import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2分钟内不重新请求
      gcTime: 1000 * 60 * 30,     // 30分钟后清理内存
      retry: 2,
    },
  },
});

export const GYM_DATA_KEY = ['gymData'];
