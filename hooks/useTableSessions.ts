"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  status: string;
  kot_number: number | null;
  menu_items: {
    id: string;
    name: string;
    is_veg: boolean;
  } | null;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  session_offer_id: string | null;
  session_offer?: Tables<"offers"> | null;
  order_items: OrderItem[];
};

export type TableWithSession = {
  table: Tables<"restaurant_tables">;
  session:
    | (Tables<"table_sessions"> & {
        guest_users?: Tables<"guest_users"> | null;
        orders?: Order[];
      })
    | null;
};

async function fetchTablesWithSessions(): Promise<TableWithSession[]> {
  // OPTIMIZED: Fetch only active tables with specific columns
  const { data: tables, error: tablesError } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("is_active", true)
    .order("table_number", { ascending: true });

  if (tablesError) throw tablesError;
  if (!tables) return [];

  // OPTIMIZED: Fetch active sessions with minimal necessary data
  const { data: sessions, error: sessionsError } = await supabase
    .from("table_sessions")
    .select(
      `
      id,
      table_id,
      customer_phone,
      guest_user_id,
      status,
      session_started_at,
      session_ended_at,
      total_orders,
      total_amount,
      created_at,
      updated_at,
      guest_users (
        id,
        name,
        phone,
        visit_count,
        total_spent
      ),
      orders!table_session_id (
        id,
        status,
        total_amount,
        created_at,
        session_offer_id,
        session_offer:offers!session_offer_id (
          id,
          name,
          offer_type,
          benefits,
          conditions
        ),
        order_items (
          id,
          quantity,
          unit_price,
          total_price,
          created_at,
          status,
          kot_number,
          menu_items (
            id,
            name,
            is_veg
          )
        )
      )
    `
    )
    .eq("status", "active");

  if (sessionsError) throw sessionsError;

  // Map tables with their sessions
  const tablesWithSessions: TableWithSession[] = tables.map((table) => {
    const session = sessions?.find((s) => s.table_id === table.id) || null;
    return {
      table,
      session: session as any,
    };
  });

  return tablesWithSessions;
}

export function useTableSessions(enabled: boolean = true) {
  return useQuery({
    queryKey: ["tableSessions"],
    queryFn: fetchTablesWithSessions,
    enabled,

    // Background refetching for tables page
    refetchInterval: 10000, // Every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // Keep showing old data while fetching
    placeholderData: (previousData) => previousData,
  });
}

export function useMarkItemsAsServed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orders: Order[]) => {
      const readyItems = orders
        .flatMap((order) => order.order_items)
        .filter((item) => item.status === "ready");

      if (readyItems.length === 0) {
        throw new Error("No items are ready to mark as served");
      }

      const itemIds = readyItems.map((item) => item.id);

      const { error } = await supabase
        .from("order_items")
        .update({ status: "served" } as any)
        .in("id", itemIds);

      if (error) throw error;
      return { itemIds };
    },
    onSuccess: () => {
      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["tableSessions"] });
      queryClient.invalidateQueries({ queryKey: ["adminKOTs"] });
    },
  });
}
