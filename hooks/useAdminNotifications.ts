"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ToastNotification } from "@/types/notification.types";

interface UseAdminNotificationsOptions {
  enabled?: boolean;
  userId?: string;
  userRole?: string;
}

export function useAdminNotifications({
  enabled = true,
  userId,
  userRole,
}: UseAdminNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);

  const addNotification = useCallback((notification: Omit<ToastNotification, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [
      ...prev,
      {
        id,
        ...notification,
        duration: notification.duration ?? 8000, // Default 8 seconds
        sound: notification.sound ?? true, // Default play sound
      },
    ]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const newChannels: RealtimeChannel[] = [];

    // 1. Subscribe to new orders (both dine-in and takeaway)
    const ordersChannel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const order = payload.new as any;
          addNotification({
            type: "notification",
            title: "New Order Placed",
            message: `${order.order_type === "takeaway" ? "Takeaway" : "Dine-in"} order #${order.order_number || order.id.slice(0, 8)} received`,
            action: {
              label: "View Orders",
              onClick: () => {
                if (order.order_type === "takeaway") {
                  window.location.href = "/admin/takeaway/orders";
                } else {
                  window.location.href = "/admin/orders";
                }
              },
            },
          });
        }
      )
      .subscribe();

    newChannels.push(ordersChannel);

    // 2. Subscribe to order items status changes (KOT ready)
    const orderItemsChannel = supabase
      .channel("admin-order-items")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_items",
          filter: "status=eq.ready",
        },
        async (payload) => {
          const item = payload.new as any;
          const oldItem = payload.old as any;

          // Only notify when status changes TO ready (not when already ready)
          if (oldItem.status !== "ready" && item.status === "ready") {
            // Get KOT batch info
            const { data: kotItems } = await supabase
              .from("order_items")
              .select("id, menu_items(name)")
              .eq("kot_batch_id", item.kot_batch_id);

            const itemNames = kotItems
              ?.map((i: any) => i.menu_items?.name)
              .filter(Boolean)
              .join(", ");

            addNotification({
              type: "success",
              title: "KOT Ready to Serve",
              message: `KOT #${item.kot_number} is ready: ${itemNames || "Items"}`,
              action: {
                label: "View Kitchen",
                onClick: () => {
                  window.location.href = "/admin/kitchen";
                },
              },
            });
          }
        }
      )
      .subscribe();

    newChannels.push(orderItemsChannel);

    // 3. Subscribe to orders status changes (ready for billing)
    const orderStatusChannel = supabase
      .channel("admin-order-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "status=eq.served",
        },
        async (payload) => {
          const order = payload.new as any;
          const oldOrder = payload.old as any;

          // Only notify when status changes TO served (ready for billing)
          if (oldOrder.status !== "served" && order.status === "served") {
            // Get table info for dine-in
            let location = "";
            if (order.order_type === "dine-in" && order.table_id) {
              const { data: table } = await supabase
                .from("restaurant_tables")
                .select("table_number")
                .eq("id", order.table_id)
                .single();

              location = table ? `Table ${table.table_number}` : "";
            } else {
              location = "Takeaway";
            }

            addNotification({
              type: "warning",
              title: "Order Ready for Billing",
              message: `${location} - Order #${order.order_number || order.id.slice(0, 8)} is ready to bill`,
              action: {
                label: "Go to Billing",
                onClick: () => {
                  window.location.href = "/admin/billing";
                },
              },
              duration: 0, // Don't auto-dismiss billing notifications
            });
          }
        }
      )
      .subscribe();

    newChannels.push(orderStatusChannel);

    // 4. Subscribe to bills (pending confirmation)
    const billsChannel = supabase
      .channel("admin-bills")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bills",
          filter: "payment_status=eq.pending",
        },
        async (payload) => {
          const bill = payload.new as any;

          // Only notify managers (waiters create bills, managers confirm)
          if (userRole === "manager" || userRole === "super_admin") {
            // Get table info if available
            let location = "Takeaway";
            if (bill.table_session_id) {
              const { data: session } = await supabase
                .from("table_sessions")
                .select("restaurant_tables(table_number)")
                .eq("id", bill.table_session_id)
                .single();

              const table = session as any;
              if (table?.restaurant_tables?.table_number) {
                location = `Table ${table.restaurant_tables.table_number}`;
              }
            }

            addNotification({
              type: "info",
              title: "Bill Pending Confirmation",
              message: `${location} - Bill #${bill.bill_number} awaiting manager approval`,
              action: {
                label: "Confirm Bill",
                onClick: () => {
                  window.location.href = "/admin/billing";
                },
              },
              duration: 0, // Don't auto-dismiss bill confirmations
            });
          }
        }
      )
      .subscribe();

    newChannels.push(billsChannel);

    setChannels(newChannels);

    // Cleanup subscriptions
    return () => {
      newChannels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [enabled, addNotification, userRole]);

  return {
    notifications,
    addNotification,
    removeNotification,
  };
}
