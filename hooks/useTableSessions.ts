import { useState, useCallback } from "react";
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

export function useTableSessions() {
  const [tablesData, setTablesData] = useState<TableWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTablesWithSessions = useCallback(async () => {
    try {
      // Fetch all tables
      const { data: tables, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("is_active", true)
        .order("table_number", { ascending: true });

      if (tablesError) throw tablesError;

      if (!tables) {
        setTablesData([]);
        return;
      }

      // Fetch all active sessions with related data
      const { data: sessions, error: sessionsError } = await supabase
        .from("table_sessions")
        .select(
          `
          *,
          guest_users (
            id,
            name,
            phone,
            visit_count,
            total_spent
          ),
          orders (
            id,
            status,
            total_amount,
            created_at,
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

      setTablesData(tablesWithSessions);
      setError("");
    } catch (error: any) {
      console.error("Error fetching tables:", error);
      setError(error.message || "Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, []);

  const markItemsAsServed = useCallback(async (orders: Order[]) => {
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
  }, []);

  return {
    tablesData,
    loading,
    error,
    fetchTablesWithSessions,
    markItemsAsServed,
  };
}
