"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { KOT, KOTItem } from "@/types/kot.types";
import { calculateKOTStatus } from "@/lib/utils/kot";
import { printKOTReceipt } from "@/components/shared/KOTReceipt";
import { KOTCard } from "@/components/shared/KOTCard";
import Button from "@/components/admin/Button";
import { Printer, CheckCircle, ChefHat } from "lucide-react";

export default function KitchenDisplayPage() {
  const [kots, setKots] = useState<KOT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKOTs();
    const interval = setInterval(fetchKOTs, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchKOTs = async () => {
    try {
      // Fetch all order_items with active KOT statuses (Kitchen handles: placed → preparing → ready)
      // Once marked "served" by waiters, KOT disappears from kitchen
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
      const kotsArray = Array.from(kotMap.values()).sort(
        (a, b) => a.kot_number - b.kot_number
      );

      setKots(kotsArray);
    } catch (error: any) {
      console.error("Error fetching KOTs:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateKOTStatus = async (kotBatchId: string, newStatus: string) => {
    try {
      // Get the KOT to check if it's a takeaway order
      const kot = kots.find((k) => k.kot_batch_id === kotBatchId);

      // For takeaway orders: ready → served (auto-mark as served since takeaway is pickup-based)
      // For dine-in orders: ready → stays ready (waiters mark as served from table sessions page)
      const finalStatus =
        kot?.order_type === "takeaway" && newStatus === "ready"
          ? "served"
          : newStatus;

      // Update ALL items in this KOT batch
      const { error } = await supabase
        .from("order_items")
        .update({ status: finalStatus } as any)
        .eq("kot_batch_id", kotBatchId);

      if (error) throw error;

      // Trigger will auto-update order status
      await fetchKOTs();
    } catch (error: any) {
      console.error("Error updating KOT status:", error);
      alert("Failed to update KOT status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading KOTs...</div>
        </div>
      </div>
    );
  }

  if (kots.length === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active KOTs</h3>
          <p className="text-gray-500">New kitchen orders will appear here automatically</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {kots.map((kot) => (
        <KOTCard
          key={kot.kot_batch_id}
          kot={kot}
          showActions
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => printKOTReceipt(kot)}
                leftIcon={<Printer className="w-4 h-4" />}
                className="flex-1"
              >
                Print
              </Button>

              {kot.kot_status === "placed" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => updateKOTStatus(kot.kot_batch_id, "preparing")}
                  leftIcon={<ChefHat className="w-4 h-4" />}
                  className="flex-1"
                >
                  Start
                </Button>
              )}

              {kot.kot_status === "preparing" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => updateKOTStatus(kot.kot_batch_id, "ready")}
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {kot.order_type === "takeaway" ? "Ready (Pickup)" : "Ready"}
                </Button>
              )}

              {kot.kot_status === "ready" && (
                <div className="flex-1 px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-center">
                  <span className="text-green-800 font-medium text-sm">
                    ✓ Ready - Awaiting Waiter
                  </span>
                </div>
              )}

              {/* Ready KOTs stay visible until waiter marks as served from table sessions */}
            </>
          }
        />
      ))}
    </div>
  );
}
