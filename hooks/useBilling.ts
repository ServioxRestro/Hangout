import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface OrderWithDetails {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  table_session_id: string | null;
  order_type?: string;
  table_sessions: {
    id: string;
    status: string;
    session_started_at: string;
    customer_phone: string | null;
    restaurant_tables: {
      table_number: number;
    } | null;
  } | null;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    menu_items: {
      id: string;
      name: string;
      is_veg: boolean;
    } | null;
  }>;
}

export interface SessionGroup {
  sessionId: string;
  tableNumber: number;
  customerPhone: string | null;
  sessionStartedAt: string;
  orders: OrderWithDetails[];
  totalAmount: number;
  orderCount: number;
}

export function useBilling() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [takeawayOrders, setTakeawayOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taxSettings, setTaxSettings] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          table_sessions (
            id,
            status,
            session_started_at,
            customer_phone,
            restaurant_tables (
              table_number
            )
          ),
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            menu_items (
              id,
              name,
              is_veg
            )
          )
        `)
        .in("status", ["served"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ordersData = (data as OrderWithDetails[]) || [];
      setOrders(ordersData);

      // Group orders by session
      const sessionMap = new Map<string, SessionGroup>();
      const takeaway: OrderWithDetails[] = [];

      ordersData.forEach((order) => {
        if (order.table_sessions && order.table_session_id) {
          const sessionId = order.table_session_id;

          if (sessionMap.has(sessionId)) {
            const group = sessionMap.get(sessionId)!;
            group.orders.push(order);
            group.totalAmount += order.total_amount;
            group.orderCount++;
          } else {
            sessionMap.set(sessionId, {
              sessionId,
              tableNumber:
                order.table_sessions.restaurant_tables?.table_number || 0,
              customerPhone: order.table_sessions.customer_phone,
              sessionStartedAt: order.table_sessions.session_started_at,
              orders: [order],
              totalAmount: order.total_amount,
              orderCount: 1,
            });
          }
        } else {
          // Takeaway orders (no session)
          takeaway.push(order);
        }
      });

      // Sort sessions by table number
      const sessions = Array.from(sessionMap.values()).sort(
        (a, b) => a.tableNumber - b.tableNumber
      );

      setSessionGroups(sessions);
      setTakeawayOrders(takeaway);
      setError("");
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      setError(error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTaxSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tax_settings")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setTaxSettings(data || []);
    } catch (error) {
      console.error("Error fetching tax settings:", error);
    }
  }, []);

  return {
    orders,
    sessionGroups,
    takeawayOrders,
    loading,
    error,
    taxSettings,
    fetchOrders,
    fetchTaxSettings,
  };
}
