import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

// Query Keys
export const queryKeys = {
  orders: {
    all: ["orders"] as const,
    active: ["orders", "active"] as const,
    byId: (id: string) => ["orders", id] as const,
  },
  bills: {
    all: ["bills"] as const,
    unpaid: ["bills", "unpaid"] as const,
    byId: (id: string) => ["bills", id] as const,
  },
  dashboard: {
    stats: ["dashboard", "stats"] as const,
  },
  tables: {
    all: ["tables"] as const,
    sessions: ["tables", "sessions"] as const,
  },
  menu: {
    items: ["menu", "items"] as const,
    categories: ["menu", "categories"] as const,
  },
};

// Dashboard Stats Query
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async () => {
      // Fetch active orders
      const { data: activeOrders, error: activeError } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          total_amount,
          customer_phone,
          customer_email,
          notes,
          created_at,
          guest_users (
            id,
            visit_count,
            total_orders
          ),
          restaurant_tables!inner (
            id,
            table_number,
            table_code,
            is_active,
            qr_code_url,
            created_at,
            updated_at
          ),
          order_items!inner (
            id,
            quantity,
            unit_price,
            total_price,
            menu_items!inner (
              id,
              name,
              price,
              is_veg,
              subcategory
            )
          )
        `)
        .in("status", ["placed", "preparing", "served"])
        .order("created_at", { ascending: true });

      if (activeError) throw activeError;

      // Fetch all orders for stats
      const { data: allOrders, error: statsError } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at");

      if (statsError) throw statsError;

      // Fetch all bills for revenue stats
      const { data: allBills, error: billsError } = await supabase
        .from("bills")
        .select("id, final_amount, payment_status, paid_at");

      if (billsError) throw billsError;

      // Process stats
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const todayOrders =
        allOrders?.filter(
          (order) => new Date(order.created_at || "") >= todayStart
        ) || [];

      const pendingOrders =
        allOrders?.filter((order) =>
          ["placed", "preparing"].includes(order.status || "")
        ) || [];

      const completedOrders =
        allOrders?.filter((order) =>
          ["completed", "paid"].includes(order.status || "")
        ) || [];

      const paidBills =
        allBills?.filter((bill) => bill.payment_status === "paid") || [];
      const todayBills = paidBills.filter(
        (bill) => new Date(bill.paid_at || "") >= todayStart
      );

      const totalRevenue = paidBills.reduce(
        (sum, bill) => sum + (bill.final_amount || 0),
        0
      );
      const todayRevenue = todayBills.reduce(
        (sum, bill) => sum + (bill.final_amount || 0),
        0
      );

      return {
        stats: {
          total: allOrders?.length || 0,
          today: todayOrders.length,
          pending: pendingOrders.length,
          completed: completedOrders.length,
          totalRevenue,
          todayRevenue,
          activeOrders: activeOrders?.length || 0,
          totalBills: paidBills.length,
          todayBills: todayBills.length,
        },
        activeOrders: activeOrders || [],
      };
    },
    refetchInterval: 60000, // Refetch every 60 seconds for dashboard
  });
}

// Active Orders Query
export function useActiveOrders() {
  return useQuery({
    queryKey: queryKeys.orders.active,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables (
            id,
            table_number,
            table_code
          ),
          order_items (
            *,
            menu_items (
              id,
              name,
              price,
              is_veg,
              subcategory
            )
          )
        `)
        .in("status", ["placed", "preparing", "served"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for active orders
  });
}

// Unpaid Bills Query
export function useUnpaidBills() {
  return useQuery({
    queryKey: queryKeys.bills.unpaid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables (
            id,
            table_number,
            table_code
          ),
          table_sessions (
            id,
            customer_phone,
            session_started_at,
            restaurant_tables (
              id,
              table_number
            )
          ),
          order_items (
            *,
            menu_items (
              id,
              name,
              price,
              is_veg
            )
          )
        `)
        .in("status", ["served", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

// Menu Items Query
export function useMenuItems() {
  return useQuery({
    queryKey: queryKeys.menu.items,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("display_order");

      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Menu items don't change often, 1 minute stale time
  });
}

// Menu Categories Query
export function useMenuCategories() {
  return useQuery({
    queryKey: queryKeys.menu.categories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Categories don't change often
  });
}

// Update Order Status Mutation
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch all order-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.active });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
}

// Process Bill Mutation
export function useProcessBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billData: any) => {
      // Your bill processing logic here
      const { data, error } = await supabase
        .from("bills")
        .insert(billData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.unpaid });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.active });
    },
  });
}
