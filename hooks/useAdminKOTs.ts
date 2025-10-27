"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { KOT, KOTItem } from "@/types/kot.types";
import { calculateKOTStatus } from "@/lib/utils/kot";

async function fetchKOTs(): Promise<KOT[]> {
  // OPTIMIZED: Only fetch active KOT items with minimal columns
  // Use !inner to ensure menu_items exists (skip orphaned items)
  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select(
      `
      id,
      quantity,
      status,
      created_at,
      kot_number,
      kot_batch_id,
      menu_items!inner (
        name,
        is_veg
      ),
      orders!inner (
        id,
        order_type,
        customer_name,
        restaurant_tables (
          table_number,
          veg_only
        ),
        takeaway_qr_codes (
          is_veg_only
        )
      )
    `
    )
    .not("kot_number", "is", null)
    .in("status", ["placed", "preparing", "ready"])
    .order("kot_number", { ascending: true });

  if (error) throw error;

  // Group items by KOT batch
  const kotMap = new Map<string, KOT>();

  orderItems?.forEach((item: any) => {
    const batchId = item.kot_batch_id;
    if (!batchId) return;

    if (!kotMap.has(batchId)) {
      kotMap.set(batchId, {
        kot_number: item.kot_number,
        kot_batch_id: batchId,
        table_number: item.orders?.restaurant_tables?.table_number || null,
        table_veg_only: item.orders?.restaurant_tables?.veg_only || false,
        customer_name: item.orders?.customer_name || null,
        takeaway_qr_is_veg_only:
          item.orders?.takeaway_qr_codes?.is_veg_only || false,
        order_id: item.orders?.id || "",
        order_type: item.orders?.order_type || "dine-in",
        kot_status: "placed",
        created_at: item.created_at,
        items: [],
      });
    }

    const kot = kotMap.get(batchId)!;
    kot.items.push({
      id: item.id,
      menu_item_name: item.menu_items?.name || "Unknown Item",
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      created_at: item.created_at,
      status: item.status,
      is_veg: item.menu_items?.is_veg || false,
    });
  });

  // Calculate KOT status from items
  const kots = Array.from(kotMap.values()).map((kot) => ({
    ...kot,
    kot_status: calculateKOTStatus(kot.items.map(i => i.status)),
  }));

  return kots;
}

export function useAdminKOTs(enabled: boolean = true) {
  return useQuery({
    queryKey: ["adminKOTs"],
    queryFn: fetchKOTs,
    enabled,

    // Aggressive refetching for kitchen (critical real-time data)
    refetchInterval: 5000, // Every 5 seconds (faster than guest)
    refetchOnWindowFocus: true, // When staff returns to kitchen screen
    refetchOnReconnect: true, // When WiFi reconnects

    // Keep showing old data while fetching (no flicker)
    placeholderData: (previousData) => previousData,
  });
}
