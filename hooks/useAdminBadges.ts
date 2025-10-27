"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface BadgeCounts {
  activeOrders: number;
  kitchenKOTs: number;
  pendingBills: number;
  takeawayOrders: number;
}

interface UseAdminBadgesOptions {
  enabled?: boolean;
  userRole?: string;
}

async function fetchBadgeCounts(userRole?: string): Promise<BadgeCounts> {
  try {
    // Fetch all counts in parallel for better performance
    const [ordersResult, kitchenItemsResult, billsResult, takeawayResult] = await Promise.all([
      // 1. Active Orders (placed, preparing, ready, served - not paid/cancelled)
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("order_type", "dine-in")
        .in("status", ["placed", "preparing", "ready", "served"]),

      // 2. Kitchen KOTs (placed, preparing, ready - not served yet)
      // Include "ready" status as KOTs stay visible until marked "served"
      supabase
        .from("order_items")
        .select("kot_batch_id, status")
        .not("kot_number", "is", null)
        .in("status", ["placed", "preparing", "ready"]),

      // 3. Pending Bills (bills awaiting payment confirmation)
      // Count bills with payment_status = 'pending' that need manager confirmation
      userRole === "manager" || userRole === "super_admin"
        ? supabase
            .from("bills")
            .select("*", { count: "exact", head: true })
            .eq("payment_status", "pending")
        : Promise.resolve({ count: 0 }),

      // 4. Takeaway Orders (active - not served/paid/cancelled)
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("order_type", "takeaway")
        .in("status", ["placed", "preparing", "ready"]),
    ]);

    // Count unique KOT batches for kitchen
    const uniqueKOTs = new Set(
      kitchenItemsResult.data
        ?.filter((item) => item.kot_batch_id)
        .map((item) => item.kot_batch_id) || []
    );

    return {
      activeOrders: ordersResult.count || 0,
      kitchenKOTs: uniqueKOTs.size,
      pendingBills: billsResult.count || 0,
      takeawayOrders: takeawayResult.count || 0,
    };
  } catch (error) {
    console.error("Error fetching badge counts:", error);
    return {
      activeOrders: 0,
      kitchenKOTs: 0,
      pendingBills: 0,
      takeawayOrders: 0,
    };
  }
}

export function useAdminBadges({
  enabled = true,
  userRole,
}: UseAdminBadgesOptions = {}) {
  const { data: badges } = useQuery({
    queryKey: ["adminBadges", userRole],
    queryFn: () => fetchBadgeCounts(userRole),
    enabled,

    // Aggressive refresh for critical admin data
    refetchInterval: 10000, // Every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // Keep showing old data while fetching (no flicker)
    placeholderData: (previousData) => previousData,

    // Initial data to avoid flash of 0s
    initialData: {
      activeOrders: 0,
      kitchenKOTs: 0,
      pendingBills: 0,
      takeawayOrders: 0,
    },
  });

  return badges || {
    activeOrders: 0,
    kitchenKOTs: 0,
    pendingBills: 0,
    takeawayOrders: 0,
  };
}
