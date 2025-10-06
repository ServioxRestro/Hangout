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
            refetchOnWindowFocus: true,
            // Automatically refetch data at regular intervals
            refetchInterval: 60000, // 60 seconds
            // Keep data fresh
            staleTime: 30000, // 30 seconds
            // Retry failed requests
            retry: 1,
            // Show cached data while refetching
            refetchOnMount: "always",
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
