"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { printKOTReceipt } from "@/components/shared/KOTReceipt";
import { KOTCard } from "@/components/shared/KOTCard";
import Button from "@/components/admin/Button";
import { Printer, CheckCircle, ChefHat, Loader2 } from "lucide-react";
import { useAdminKOTs } from "@/hooks/useAdminKOTs";
import { useQueryClient } from "@tanstack/react-query";
import { KOT } from "@/types/kot.types";

export default function KitchenDisplayPage() {
  const { data: kots = [], isLoading: loading } = useAdminKOTs();
  const queryClient = useQueryClient();
  const [updatingKOTs, setUpdatingKOTs] = useState<Set<string>>(new Set());

  // Split KOTs by veg/non-veg
  const { vegKOTs, nonVegKOTs } = useMemo(() => {
    const vegKOTs: KOT[] = [];
    const nonVegKOTs: KOT[] = [];

    kots.forEach((kot) => {
      const hasVeg = kot.items.some((item) => item.is_veg);
      const hasNonVeg = kot.items.some((item) => !item.is_veg);

      // Add to veg section if it has veg items
      if (hasVeg) {
        vegKOTs.push(kot);
      }

      // Add to non-veg section if it has non-veg items
      if (hasNonVeg) {
        nonVegKOTs.push(kot);
      }
    });

    return { vegKOTs, nonVegKOTs };
  }, [kots]);

  // Update specific items (for split veg/non-veg stations)
  const updateKOTItems = async (
    kotBatchId: string,
    itemIds: string[],
    newStatus: string
  ) => {
    setUpdatingKOTs((prev) => new Set(prev).add(kotBatchId));

    try {
      const kot = kots.find((k) => k.kot_batch_id === kotBatchId);

      // For takeaway orders: ready → served
      const finalStatus =
        kot?.order_type === "takeaway" && newStatus === "ready"
          ? "served"
          : newStatus;

      // Optimistic update
      queryClient.setQueryData(["adminKOTs"], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((k: any) =>
          k.kot_batch_id === kotBatchId
            ? {
                ...k,
                items: k.items.map((item: any) =>
                  itemIds.includes(item.id)
                    ? { ...item, status: finalStatus }
                    : item
                ),
              }
            : k
        );
      });

      // Update only specific items
      const { error } = await supabase
        .from("order_items")
        .update({ status: finalStatus } as any)
        .in("id", itemIds);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["adminKOTs"] });
      await queryClient.invalidateQueries({ queryKey: ["adminBadges"] });
    } catch (error: any) {
      console.error("Error updating KOT items:", error);
      alert("Failed to update KOT items");
      await queryClient.invalidateQueries({ queryKey: ["adminKOTs"] });
    } finally {
      setUpdatingKOTs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(kotBatchId);
        return newSet;
      });
    }
  };

  // Update all items in a KOT batch
  const updateKOTStatus = async (kotBatchId: string, newStatus: string) => {
    const kot = kots.find((k) => k.kot_batch_id === kotBatchId);
    if (!kot) return;

    const allItemIds = kot.items.map((item) => item.id);
    await updateKOTItems(kotBatchId, allItemIds, newStatus);
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Active KOTs
          </h3>
          <p className="text-gray-500">
            New kitchen orders will appear here automatically
          </p>
        </div>
      </div>
    );
  }

  // Render KOT actions
  const renderKOTActions = (kot: KOT, filterType: "veg" | "non-veg") => {
    const isUpdating = updatingKOTs.has(kot.kot_batch_id);

    // Get items for this filter type
    const filteredItems = kot.items.filter((item) =>
      filterType === "veg" ? item.is_veg : !item.is_veg
    );

    const itemIds = filteredItems.map((item) => item.id);

    // Check status of filtered items
    const allPlaced = filteredItems.every((item) => item.status === "placed");
    const allPreparing = filteredItems.every(
      (item) => item.status === "preparing"
    );
    const allReady = filteredItems.every((item) => item.status === "ready");
    const anyPreparing = filteredItems.some(
      (item) => item.status === "preparing"
    );

    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => printKOTReceipt(kot, filterType)}
          leftIcon={<Printer className="w-4 h-4" />}
          className="flex-1"
          disabled={isUpdating}
        >
          Print
        </Button>

        {(allPlaced || (!allReady && !allPreparing)) && (
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              updateKOTItems(kot.kot_batch_id, itemIds, "preparing")
            }
            leftIcon={
              isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChefHat className="w-4 h-4" />
              )
            }
            className="flex-1"
            disabled={isUpdating}
          >
            {isUpdating ? "Starting..." : "Start"}
          </Button>
        )}

        {(allPreparing || (anyPreparing && !allReady)) && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => updateKOTItems(kot.kot_batch_id, itemIds, "ready")}
            leftIcon={
              isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )
            }
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={isUpdating}
          >
            {isUpdating
              ? "Processing..."
              : kot.order_type === "takeaway"
              ? "Ready"
              : "Ready"}
          </Button>
        )}

        {allReady && (
          <div className="flex-1 px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-center">
            <span className="text-green-800 font-medium text-sm">✓ Ready</span>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:grid lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
      {/* VEG STATION - LEFT HALF */}
      <div className="flex flex-col lg:border-r-4 lg:border-green-500 lg:pr-4">
        {/* Compact Header */}
        <div className="bg-green-50 border-l-4 border-green-600 px-3 py-2 sm:px-4 sm:py-2.5 rounded mb-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-green-600 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-base sm:text-lg font-bold">
                {vegKOTs.length}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-green-800 flex items-center gap-1.5">
                  🟢 VEG STATION
                </h2>
                <p className="text-[10px] sm:text-xs text-green-700">
                  {vegKOTs.length} active
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KOT Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 pb-4">
            {vegKOTs.length === 0 ? (
              <div className="col-span-full text-center py-8 sm:py-12">
                <ChefHat className="w-10 h-10 sm:w-12 sm:h-12 text-green-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-green-600 font-medium text-sm sm:text-base">
                  No veg orders
                </p>
              </div>
            ) : (
              vegKOTs.map((kot) => (
                <KOTCard
                  key={`veg-${kot.kot_batch_id}`}
                  kot={kot}
                  filterType="veg"
                  showActions
                  actions={renderKOTActions(kot, "veg")}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* NON-VEG STATION - RIGHT HALF */}
      <div className="flex flex-col lg:pl-4">
        {/* Compact Header */}
        <div className="bg-red-50 border-l-4 border-red-600 px-3 py-2 sm:px-4 sm:py-2.5 rounded mb-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-red-600 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-base sm:text-lg font-bold">
                {nonVegKOTs.length}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-red-800 flex items-center gap-1.5">
                  🔴 NON-VEG STATION
                </h2>
                <p className="text-[10px] sm:text-xs text-red-700">
                  {nonVegKOTs.length} active
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KOT Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 pb-4">
            {nonVegKOTs.length === 0 ? (
              <div className="col-span-full text-center py-8 sm:py-12">
                <ChefHat className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-red-600 font-medium text-sm sm:text-base">
                  No non-veg orders
                </p>
              </div>
            ) : (
              nonVegKOTs.map((kot) => (
                <KOTCard
                  key={`nonveg-${kot.kot_batch_id}`}
                  kot={kot}
                  filterType="non-veg"
                  showActions
                  actions={renderKOTActions(kot, "non-veg")}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
