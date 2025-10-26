import { useState, useCallback } from "react";
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
}

export interface BillGroup {
  sessionId: string;
  tableNumber: number;
  bills: BillWithDetails[];
  totalAmount: number;
  billCount: number;
}

export function useBilling() {
  const [bills, setBills] = useState<BillWithDetails[]>([]);
  const [billGroups, setBillGroups] = useState<BillGroup[]>([]);
  const [takeawayBills, setTakeawayBills] = useState<BillWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taxSettings, setTaxSettings] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      // Fetch pending bills (staff processed, awaiting manager confirmation)
      const { data, error } = await supabase
        .from("bills")
        .select(`
          *,
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

      // Manually fetch admin/staff info for each bill
      const billsData = (data as any[]) || [];

      // Fetch all unique generated_by IDs
      const generatedByIds = [...new Set(billsData.map(b => b.generated_by).filter(Boolean))];

      // Try to fetch from staff table
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, email")
        .in("id", generatedByIds);

      // Try to fetch from admin table
      const { data: adminData } = await supabase
        .from("admin")
        .select("id, email")
        .in("id", generatedByIds);

      // Create lookup maps
      const staffMap = new Map(staffData?.map(s => [s.id, s]) || []);
      const adminMap = new Map(adminData?.map(a => [a.id, { ...a, name: a.email.split('@')[0] }]) || []);

      // Attach staff/admin info to bills
      billsData.forEach(bill => {
        if (bill.generated_by) {
          const staffInfo = staffMap.get(bill.generated_by);
          const adminInfo = adminMap.get(bill.generated_by);
          bill.staff = staffInfo || adminInfo || null;
        }
      });

      // Fetch offer information for bills
      const sessionIds = billsData.map(b => b.table_session_id).filter(Boolean);
      if (sessionIds.length > 0) {
        const { data: offerUsageData } = await supabase
          .from("offer_usage")
          .select(`
            table_session_id,
            discount_amount,
            offers (
              id,
              name,
              offer_type
            )
          `)
          .in("table_session_id", sessionIds);

        // Create offer lookup map
        const offerMap = new Map(
          offerUsageData?.map(ou => [ou.table_session_id, ou]) || []
        );

        // Attach offer info to bills
        billsData.forEach(bill => {
          if (bill.table_session_id) {
            const offerUsage = offerMap.get(bill.table_session_id);
            if (offerUsage) {
              bill.offer = offerUsage.offers;
            }
          }
        });
      }

      console.log("[useBilling] Fetched bills:", billsData.length);
      console.log("[useBilling] Bills data:", billsData);

      setBills(billsData);

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
          // Takeaway bills (no session)
          takeaway.push(bill);
        }
      });

      // Sort bill groups by table number
      const groups = Array.from(sessionMap.values()).sort(
        (a, b) => a.tableNumber - b.tableNumber
      );

      console.log("[useBilling] Bill groups:", groups.length);
      console.log("[useBilling] Takeaway bills:", takeaway.length);

      setBillGroups(groups);
      setTakeawayBills(takeaway);
      setError("");
    } catch (error: any) {
      console.error("[useBilling] Error fetching bills:", error);
      setError(error.message || "Failed to fetch bills");
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
    bills,
    billGroups,
    takeawayBills,
    loading,
    error,
    taxSettings,
    fetchOrders,
    fetchTaxSettings,
  };
}
