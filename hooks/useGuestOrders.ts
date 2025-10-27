"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Order = Tables<"orders"> & {
  order_items: Array<
    Tables<"order_items"> & {
      menu_items: Tables<"menu_items"> | null;
    }
  >;
};

interface SessionOffer {
  name: string;
  discount: number;
}

interface UseGuestOrdersOptions {
  tableCode: string;
  userPhone: string;
  enabled?: boolean;
}

async function fetchGuestOrders(
  tableCode: string,
  userPhone: string
): Promise<{ orders: Order[]; sessionOffer: SessionOffer | null }> {
  // Normalize phone once
  const normalizedPhone = userPhone.replace(/\D/g, "");
  const phoneWithoutCode =
    normalizedPhone.length === 12 && normalizedPhone.startsWith("91")
      ? normalizedPhone.substring(2)
      : normalizedPhone;
  const phoneWithCode =
    normalizedPhone.length === 10 ? `91${normalizedPhone}` : normalizedPhone;

  // OPTIMIZED: Single query with JOIN - gets table + session + orders in ONE call
  const { data: sessionData } = await supabase
    .from("table_sessions")
    .select(
      `
      id,
      restaurant_tables!inner (
        id,
        table_code
      )
    `
    )
    .eq("restaurant_tables.table_code", tableCode)
    .in("customer_phone", [phoneWithoutCode, phoneWithCode])
    .eq("status", "active")
    .maybeSingle();

  let orders: Order[] = [];
  let sessionOffer: SessionOffer | null = null;

  if (sessionData) {
    // OPTIMIZED: Only fetch ACTIVE orders (not completed/paid/cancelled)
    // Only select columns we actually use
    const { data: sessionOrders, error: sessionOrdersError } = await supabase
      .from("orders")
      .select(
        `
        id,
        table_id,
        table_session_id,
        customer_phone,
        total_amount,
        status,
        order_type,
        created_at,
        order_items (
          id,
          quantity,
          unit_price,
          total_price,
          status,
          created_at,
          menu_items (
            id,
            name,
            is_veg
          )
        )
      `
      )
      .eq("table_session_id", sessionData.id)
      .not("status", "in", "(completed,paid,cancelled)")
      .order("created_at", { ascending: false });

    if (sessionOrdersError) {
      throw new Error(sessionOrdersError.message);
    }

    orders = (sessionOrders as Order[]) || [];

    // OPTIMIZED: Only fetch offer if there are active orders
    if (orders.length > 0) {
      const { data: offerUsageData } = await supabase
        .from("offer_usage")
        .select("discount_amount, offers!inner(name)")
        .eq("table_session_id", sessionData.id)
        .maybeSingle();

      if (offerUsageData && offerUsageData.offers) {
        sessionOffer = {
          name: (offerUsageData.offers as any).name,
          discount: Number(offerUsageData.discount_amount) || 0,
        };
      }
    }
  } else {
    // No active session - don't fetch anything (guest likely hasn't ordered yet)
    // If they have historical orders, they can view from order history page
    orders = [];
  }

  return { orders, sessionOffer };
}

export function useGuestOrders({
  tableCode,
  userPhone,
  enabled = true,
}: UseGuestOrdersOptions) {
  return useQuery({
    queryKey: ["guestOrders", tableCode, userPhone],
    queryFn: () => fetchGuestOrders(tableCode, userPhone),
    enabled: enabled && !!tableCode && !!userPhone,

    // Smart background refetching
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch when internet reconnects

    // Keep showing old data while fetching new
    placeholderData: (previousData) => previousData,
  });
}
