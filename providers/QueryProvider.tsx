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
            // Automatically refetch data when window regains focus
            refetchOnWindowFocus: false,
            // Don't automatically refetch at intervals (let pages control this)
            refetchInterval: false,
            // Keep data fresh for 5 minutes
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Retry failed requests twice
            retry: 2,
            // Only refetch on mount if data is stale
            refetchOnMount: true,
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
