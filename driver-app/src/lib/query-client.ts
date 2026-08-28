import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 2 minutes
      staleTime: 2 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 2 times with exponential backoff
      retry: (failureCount, error: unknown) => {
        // Do not retry on 4xx client errors
        const apiError = error as { statusCode?: number } | null;
        if (apiError?.statusCode && apiError.statusCode >= 400 && apiError.statusCode < 500) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      // Do not refetch on window focus in a mobile app
      refetchOnWindowFocus: false,
      // Do not refetch on reconnect automatically (handle manually)
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Do not retry mutations
      retry: false,
    },
  },
});
