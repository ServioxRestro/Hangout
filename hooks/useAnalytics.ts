import { useQuery } from "@tanstack/react-query";

export type Period = "7d" | "30d" | "90d" | "1y" | "all";

export interface AnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
}

export interface RevenueMetrics {
  total: number;
  count: number;
  byPaymentMethod: Record<string, number>;
  trend: Array<{ date: string; amount: number }>;
}

export interface OrdersMetrics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  trend: Array<{ date: string; count: number }>;
  completed: number;
  cancelled: number;
}

export interface CustomersMetrics {
  total: number;
  new: number;
  returning: number;
  topCustomers: Array<{
    phone: string;
    totalSpent: number;
    totalOrders: number;
    visitCount: number;
  }>;
  trend: Array<{ date: string; count: number }>;
  averageSpend: number;
}

export interface MenuMetrics {
  totalItemsSold: number;
  totalRevenue: number;
  byCategory: Record<string, { quantity: number; revenue: number }>;
  vegNonVeg: {
    veg: { quantity: number; revenue: number };
    nonVeg: { quantity: number; revenue: number };
  };
  topItems: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface OffersMetrics {
  totalUsage: number;
  totalDiscount: number;
  activeOffers: number;
  totalOffers: number;
  byOffer: Array<{
    id: string;
    name: string;
    type: string;
    usageCount: number;
    totalDiscount: number;
    isActive: boolean;
  }>;
  topOffers?: Array<{
    id: string;
    name: string;
    type: string;
    usageCount: number;
    totalDiscount: number;
    isActive: boolean;
  }>;
}

export interface TablesMetrics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  averageSessionDuration: number;
  totalRevenue: number;
  byTable: Array<{
    tableNumber: number;
    sessions: number;
    revenue: number;
  }>;
  topTables?: Array<{
    tableNumber: number;
    tableCode: string;
    sessions: number;
    revenue: number;
    averageSessionDuration: number;
  }>;
}

export interface AnalyticsData {
  period: Period;
  startDate?: string;
  endDate?: string;
  overview: AnalyticsOverview;
  revenue: RevenueMetrics;
  orders: OrdersMetrics;
  customers: CustomersMetrics;
  menu: MenuMetrics;
  offers: OffersMetrics;
  tables: TablesMetrics;
}

// Query Keys
export const analyticsKeys = {
  all: ["analytics"] as const,
  byPeriod: (period: Period) => ["analytics", period] as const,
  byDateRange: (startDate: string, endDate: string) => 
    ["analytics", "custom", startDate, endDate] as const,
};

interface UseAnalyticsOptions {
  period?: Period;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

/**
 * Hook for fetching analytics data using React Query
 * @param options - Configuration options for the analytics query
 * @returns React Query result with analytics data
 * 
 * @example
 * // Fetch analytics for the last 30 days
 * const { data, isLoading, error } = useAnalytics({ period: "30d" });
 * 
 * @example
 * // Fetch analytics for a custom date range
 * const { data, isLoading, error } = useAnalytics({
 *   startDate: "2025-01-01",
 *   endDate: "2025-01-31"
 * });
 */
export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { period = "30d", startDate, endDate, enabled = true } = options;

  // Determine query key based on parameters
  const queryKey = startDate && endDate 
    ? analyticsKeys.byDateRange(startDate, endDate)
    : analyticsKeys.byPeriod(period);

  return useQuery<AnalyticsData, Error>({
    queryKey,
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      } else {
        params.append("period", period);
      }

      const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please log in as admin");
        }
        if (res.status === 403) {
          throw new Error("Insufficient permissions");
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch analytics");
      }

      return res.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false, // Don't refetch on window focus for analytics
  });
}

/**
 * Hook for fetching revenue analytics specifically
 */
export function useRevenueAnalytics(options: UseAnalyticsOptions = {}) {
  const query = useAnalytics(options);
  
  return {
    ...query,
    data: query.data ? {
      overview: query.data.overview,
      revenue: query.data.revenue,
    } : undefined,
  };
}

/**
 * Hook for fetching menu analytics specifically
 */
export function useMenuAnalytics(options: UseAnalyticsOptions = {}) {
  const query = useAnalytics(options);
  
  return {
    ...query,
    data: query.data ? {
      overview: query.data.overview,
      menu: query.data.menu,
    } : undefined,
  };
}

/**
 * Hook for fetching customer analytics specifically
 */
export function useCustomerAnalytics(options: UseAnalyticsOptions = {}) {
  const query = useAnalytics(options);
  
  return {
    ...query,
    data: query.data ? {
      overview: query.data.overview,
      customers: query.data.customers,
    } : undefined,
  };
}

/**
 * Hook for fetching orders analytics specifically
 */
export function useOrdersAnalytics(options: UseAnalyticsOptions = {}) {
  const query = useAnalytics(options);
  
  return {
    ...query,
    data: query.data ? {
      overview: query.data.overview,
      orders: query.data.orders,
    } : undefined,
  };
}

/**
 * Hook for fetching offers analytics specifically
 */
export function useOffersAnalytics(options: UseAnalyticsOptions = {}) {
  const query = useAnalytics(options);
  
  return {
    ...query,
    data: query.data ? {
      overview: query.data.overview,
      offers: query.data.offers,
    } : undefined,
  };
}

/**
 * Hook for fetching table analytics specifically
 */
export function useTablesAnalytics(options: UseAnalyticsOptions = {}) {
  const query = useAnalytics(options);
  
  return {
    ...query,
    data: query.data ? {
      overview: query.data.overview,
      tables: query.data.tables,
    } : undefined,
  };
}
