"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Automatically refetch when window regains focus (critical for real-time)
            refetchOnWindowFocus: true,
            // Don't automatically refetch at intervals globally (pages control this)
            refetchInterval: false,
            // Data is stale immediately for real-time updates
            staleTime: 0,
            // Cache data for 5 minutes even if stale
            gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)
            // Retry failed requests twice
            retry: 2,
            // Always refetch on mount to ensure fresh data
            refetchOnMount: true,
            // Refetch when network reconnects
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools for development - automatically hidden in production */}
      <ReactQueryDevtools initialIsOpen={false} position="bottom" />
    </QueryClientProvider>
  );
}
