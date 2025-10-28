"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface BillWithDetails {
  id: string;
  bill_number: string;
  table_session_id: string | null;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  service_charge_rate: number;
  service_charge_amount: number;
  total_tax_amount: number;
  final_amount: number;
  payment_method: string | null;
  payment_status: string;
  generated_by: string | null;
  generated_at: string;
  created_at: string;
  table_sessions: {
    id: string;
    restaurant_tables: {
      table_number: number;
      veg_only: boolean;
    } | null;
  } | null;
  bill_items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    order_item_id: string | null;
  }>;
  staff?: {
    name: string;
    email: string;
  } | null;
  offer?: {
    id: string;
    name: string;
    offer_type: string;
  } | null;
}

export interface BillGroup {
  sessionId: string;
  tableNumber: number;
  bills: BillWithDetails[];
  totalAmount: number;
  billCount: number;
}

interface BillingData {
  bills: BillWithDetails[];
  billGroups: BillGroup[];
  takeawayBills: BillWithDetails[];
}

async function fetchBillingData(): Promise<BillingData> {
  // OPTIMIZED: Fetch pending bills with minimal columns
  const { data, error } = await supabase
    .from("bills")
    .select(`
      id,
      bill_number,
      table_session_id,
      subtotal,
      discount_amount,
      discount_percentage,
      cgst_rate,
      cgst_amount,
      sgst_rate,
      sgst_amount,
      service_charge_rate,
      service_charge_amount,
      total_tax_amount,
      final_amount,
      payment_method,
      payment_status,
      generated_by,
      generated_at,
      created_at,
      table_sessions (
        id,
        restaurant_tables (
          table_number,
          veg_only
        )
      ),
      bill_items (
        id,
        item_name,
        quantity,
        unit_price,
        total_price,
        order_item_id
      )
    `)
    .eq("payment_status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bills:", error);
    throw error;
  }

  const billsData = (data as any[]) || [];

  // OPTIMIZED: Only fetch staff/admin info if there are bills
  if (billsData.length > 0) {
    const generatedByIds = [
      ...new Set(billsData.map((b) => b.generated_by).filter(Boolean)),
    ];

    if (generatedByIds.length > 0) {
      // Fetch staff and admin in parallel
      const [staffResult, adminResult] = await Promise.all([
        supabase
          .from("staff")
          .select("id, name, email")
          .in("id", generatedByIds),
        supabase.from("admin").select("id, email").in("id", generatedByIds),
      ]);

      // Create lookup maps
      const staffMap = new Map(
        staffResult.data?.map((s) => [s.id, s]) || []
      );
      const adminMap = new Map(
        adminResult.data?.map((a) => [
          a.id,
          { ...a, name: a.email.split("@")[0] },
        ]) || []
      );

      // Attach staff/admin info
      billsData.forEach((bill) => {
        if (bill.generated_by) {
          const staffInfo = staffMap.get(bill.generated_by);
          const adminInfo = adminMap.get(bill.generated_by);
          bill.staff = staffInfo || adminInfo || null;
        }
      });
    }

    // OPTIMIZED: Fetch offer information in parallel
    const sessionIds = billsData
      .map((b) => b.table_session_id)
      .filter(Boolean);
    if (sessionIds.length > 0) {
      // Fetch both offer_usage and session locked offers
      const [offerUsageResult, sessionResult] = await Promise.all([
        supabase
          .from("offer_usage")
          .select(
            `
            table_session_id,
            discount_amount,
            offers (
              id,
              name,
              offer_type
            )
          `
          )
          .in("table_session_id", sessionIds),
        supabase
          .from("table_sessions")
          .select("id, locked_offer_id, locked_offer_data")
          .in("id", sessionIds),
      ]);

      const offerUsageMap = new Map(
        offerUsageResult.data?.map((ou) => [ou.table_session_id, ou]) || []
      );
      
      const sessionOfferMap = new Map(
        sessionResult.data?.map((s) => [s.id, s]) || []
      );

      billsData.forEach((bill) => {
        if (bill.table_session_id) {
          // Try offer_usage first (guest orders)
          const offerUsage = offerUsageMap.get(bill.table_session_id);
          if (offerUsage && offerUsage.offers) {
            bill.offer = offerUsage.offers as any;
          } else {
            // Fallback to session locked offer (admin orders)
            const sessionOffer = sessionOfferMap.get(bill.table_session_id);
            if (sessionOffer?.locked_offer_data) {
              const offerData = sessionOffer.locked_offer_data as any;
              bill.offer = {
                id: offerData.offer_id,
                name: offerData.name,
                offer_type: offerData.offer_type,
              };
            }
          }
        }
      });
    }
  }

  // Group bills by session (dine-in) vs individual (takeaway)
  const sessionMap = new Map<string, BillGroup>();
  const takeaway: BillWithDetails[] = [];

  billsData.forEach((bill) => {
    if (bill.table_sessions && bill.table_session_id) {
      const sessionId = bill.table_session_id;

      if (sessionMap.has(sessionId)) {
        const group = sessionMap.get(sessionId)!;
        group.bills.push(bill);
        group.totalAmount += bill.final_amount;
        group.billCount++;
      } else {
        sessionMap.set(sessionId, {
          sessionId,
          tableNumber:
            bill.table_sessions.restaurant_tables?.table_number || 0,
          bills: [bill],
          totalAmount: bill.final_amount,
          billCount: 1,
        });
      }
    } else {
      takeaway.push(bill);
    }
  });

  // Sort bill groups by table number
  const billGroups = Array.from(sessionMap.values()).sort(
    (a, b) => a.tableNumber - b.tableNumber
  );

  return {
    bills: billsData,
    billGroups,
    takeawayBills: takeaway,
  };
}

async function fetchTaxSettings() {
  const { data, error } = await supabase
    .from("tax_settings")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data || [];
}

export function useBilling(enabled: boolean = true) {
  const billingQuery = useQuery({
    queryKey: ["billing", "pending"],
    queryFn: fetchBillingData,
    enabled,

    // Background refetching for billing page
    refetchInterval: 10000, // Every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // Keep showing old data while fetching
    placeholderData: (previousData) => previousData,
  });

  const taxQuery = useQuery({
    queryKey: ["taxSettings"],
    queryFn: fetchTaxSettings,
    enabled,

    // Tax settings don't change often
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    bills: billingQuery.data?.bills || [],
    billGroups: billingQuery.data?.billGroups || [],
    takeawayBills: billingQuery.data?.takeawayBills || [],
    loading: billingQuery.isLoading || taxQuery.isLoading,
    error: billingQuery.error?.message || taxQuery.error?.message || "",
    taxSettings: taxQuery.data || [],
    refetch: billingQuery.refetch,
  };
}
