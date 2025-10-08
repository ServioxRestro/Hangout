// KOT Service - Data fetching and mutations for KOT system

import { supabase } from "@/lib/supabase/client";
import { KOT, KOTItem, KOTStatus } from "@/types/kot.types";
import { calculateKOTStatus } from "@/lib/utils/kot";

/**
 * Fetch all KOTs for given statuses
 */
export async function fetchKOTsByStatus(statuses: KOTStatus[]): Promise<KOT[]> {
  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select(`
      id,
      quantity,
      unit_price,
      total_price,
      created_at,
      status,
      kot_number,
      kot_batch_id,
      menu_items (
        name,
        is_veg
      ),
      orders (
        id,
        order_type,
        table_id,
        restaurant_tables (
          table_number
        )
      )
    `)
    .not("kot_number", "is", null)
    .in("status", statuses)
    .order("kot_number", { ascending: true });

  if (error) throw error;

  return groupItemsIntoKOTs(orderItems || []);
}

/**
 * Fetch KOTs for a specific order
 */
export async function fetchKOTsByOrderId(orderId: string): Promise<KOT[]> {
  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select(`
      id,
      quantity,
      unit_price,
      total_price,
      created_at,
      status,
      kot_number,
      kot_batch_id,
      menu_items (
        name,
        is_veg
      ),
      orders (
        id,
        order_type,
        table_id,
        restaurant_tables (
          table_number
        )
      )
    `)
    .eq("order_id", orderId)
    .not("kot_number", "is", null)
    .order("kot_number", { ascending: true });

  if (error) throw error;

  return groupItemsIntoKOTs(orderItems || []);
}

/**
 * Update KOT status (updates all items in the KOT batch)
 */
export async function updateKOTStatus(kotBatchId: string, newStatus: KOTStatus): Promise<void> {
  const { error } = await supabase
    .from("order_items")
    .update({ status: newStatus })
    .eq("kot_batch_id", kotBatchId);

  if (error) throw error;
}

/**
 * Helper: Group order items into KOTs
 */
function groupItemsIntoKOTs(orderItems: any[]): KOT[] {
  const kotMap = new Map<string, KOT>();

  orderItems.forEach((item: any) => {
    const batchId = item.kot_batch_id;
    if (!batchId) return;

    if (!kotMap.has(batchId)) {
      kotMap.set(batchId, {
        kot_number: item.kot_number,
        kot_batch_id: batchId,
        table_number: item.orders?.restaurant_tables?.table_number || null,
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
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      created_at: item.created_at,
      status: item.status,
      menu_item_name: item.menu_items?.name || "Unknown",
      is_veg: item.menu_items?.is_veg || false,
    });
  });

  // Calculate KOT status from items
  kotMap.forEach((kot) => {
    const itemStatuses = kot.items.map((i) => i.status);
    kot.kot_status = calculateKOTStatus(itemStatuses);
  });

  // Convert to array and sort by KOT number
  return Array.from(kotMap.values()).sort((a, b) => a.kot_number - b.kot_number);
}
