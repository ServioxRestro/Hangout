"use client";

import { supabase } from "@/lib/supabase/client";
import { printKOTReceipt } from "@/components/shared/KOTReceipt";
import { KOTCard } from "@/components/shared/KOTCard";
import Button from "@/components/admin/Button";
import { Printer, CheckCircle, ChefHat } from "lucide-react";
import { useAdminKOTs } from "@/hooks/useAdminKOTs";

export default function KitchenDisplayPage() {
  const { data: kots = [], isLoading: loading } = useAdminKOTs();

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

      // React Query will auto-update KOTs in 5 seconds, or immediately on window focus
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
