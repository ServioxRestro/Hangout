"use client";

import { useState } from "react";
import Button from "../Button";
import {
  Clock,
  IndianRupee,
  Utensils,
  Plus,
  X,
  XCircle,
  Gift,
  Tag,
  Percent,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { getStatusBadgeClass } from "@/lib/utils/kot";
import { BillProcessingModal } from "./BillProcessingModal";
import { AddManualItemModal } from "./AddManualItemModal";
import type { TableWithSession } from "@/hooks/useTableSessions";

interface ManualItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface TableDetailPanelProps {
  table: TableWithSession;
  onClose: () => void;
  onMarkItemsAsServed: (table: TableWithSession) => Promise<void>;
  onEndSession: (sessionId: string) => Promise<void>;
  onPaymentComplete: () => Promise<void>;
  changingOrderStatus: string | null;
}

export function TableDetailPanel({
  table,
  onClose,
  onMarkItemsAsServed,
  onEndSession,
  onPaymentComplete,
  changingOrderStatus,
}: TableDetailPanelProps) {
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const handleMarkAsServed = async () => {
    await onMarkItemsAsServed(table);
    // Panel will automatically update to show "Process Bill" button
    // No auto-opening of billing modal
  };

  const handleAddManualItem = (item: ManualItem) => {
    setManualItems((prev) => [...prev, item]);
  };

  const removeManualItem = (id: string) => {
    setManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePaymentCompleteInternal = async () => {
    setShowBillingModal(false);
    setManualItems([]);
    await onPaymentComplete();
    onClose();
  };

  const getTableStatus = (): "available" | "active" | "ready-to-bill" => {
    if (!table.session) return "available";

    const hasServedOrder = table.session.orders?.some(
      (o) => o.status === "served"
    );
    if (hasServedOrder) return "ready-to-bill";

    return "active";
  };

  const tableStatus = getTableStatus();

  if (!table.session) return null;

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - Modal on Mobile, Inline on Desktop */}
      <div className="fixed inset-x-0 bottom-0 lg:sticky lg:inset-auto bg-white border border-gray-200 rounded-t-2xl lg:rounded-lg shadow-lg h-[90vh] lg:h-fit lg:top-4 z-50 lg:z-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0 rounded-t-2xl lg:rounded-t-lg">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">
              Table {table.table.table_number}
            </h3>
            <p className="text-xs text-gray-600 truncate">
              {formatDuration(
                table.session.session_started_at ||
                  table.session.created_at ||
                  ""
              )}{" "}
              • {formatCurrency(table.session.total_amount || 0)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 md:p-1.5 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition touch-manipulation ml-3"
            aria-label="Close panel"
          >
            <XCircle className="w-6 h-6 md:w-5 md:h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable, flexible height */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Session Info Compact with End Session button */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600">Customer</div>
                <div className="font-medium text-sm text-gray-900">
                  {table.session.guest_users?.name || "Guest"}
                </div>
                <div className="text-xs text-gray-600">
                  {table.session.customer_phone}
                </div>
              </div>

              {/* Emergency End Session Button - Positioned away from close button */}
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      '⚠️ End this session? This is for emergency use only. Use "Process Bill" for normal checkout.'
                    )
                  ) {
                    onEndSession(table.session!.id);
                  }
                }}
                className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 rounded transition touch-manipulation whitespace-nowrap flex-shrink-0"
                title="Emergency: End session without billing"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Session Offer */}
          {table.session.orders &&
            table.session.orders.length > 0 &&
            table.session.orders[0].session_offer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-white rounded shadow-sm flex-shrink-0">
                    {table.session.orders[0].session_offer.offer_type ===
                      "cart_percentage" ||
                    table.session.orders[0].session_offer.offer_type ===
                      "min_order_discount" ? (
                      <Percent className="w-4 h-4 text-green-600" />
                    ) : table.session.orders[0].session_offer.offer_type ===
                      "promo_code" ? (
                      <Tag className="w-4 h-4 text-green-600" />
                    ) : (
                      <Gift className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-green-900">
                        OFFER APPLIED
                      </span>
                    </div>
                    <div className="font-medium text-sm text-green-800 truncate">
                      {table.session.orders[0].session_offer.name}
                    </div>
                    <div className="text-xs text-green-700 mt-0.5">
                      {(() => {
                        const benefits = table.session.orders[0].session_offer
                          ?.benefits as any;
                        const offerType =
                          table.session.orders[0].session_offer?.offer_type;

                        if (offerType === "cart_percentage") {
                          return `${benefits?.discount_percentage || 0}% off${
                            benefits?.max_discount_amount
                              ? ` (max ${formatCurrency(
                                  benefits.max_discount_amount
                                )})`
                              : ""
                          }`;
                        } else if (offerType === "cart_flat_amount") {
                          return `${formatCurrency(
                            benefits?.discount_amount || 0
                          )} off`;
                        } else if (offerType === "promo_code") {
                          if (benefits?.discount_percentage) {
                            return `${benefits.discount_percentage}% off${
                              benefits?.max_discount_amount
                                ? ` (max ${formatCurrency(
                                    benefits.max_discount_amount
                                  )})`
                                : ""
                            }`;
                          } else {
                            return `${formatCurrency(
                              benefits?.discount_amount || 0
                            )} off`;
                          }
                        }
                        return "Special discount applied";
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Order Items */}
          {table.session.orders && table.session.orders.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <h4 className="font-semibold text-sm text-gray-900">
                  Order Items
                </h4>
              </div>
              <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {table.session.orders
                  .flatMap((order) =>
                    order.order_items.sort(
                      (a, b) =>
                        new Date(a.created_at).getTime() -
                        new Date(b.created_at).getTime()
                    )
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {item.quantity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {item.menu_items?.name || "Unknown"}
                          </span>
                          {item.menu_items?.is_veg && (
                            <span className="text-xs">🟢</span>
                          )}
                          {item.menu_items?.is_veg === false && (
                            <span className="text-xs">🔴</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <div className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                            {item.kot_number && ` • KOT #${item.kot_number}`}
                          </div>
                          {item.status && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                                item.status as any
                              )}`}
                            >
                              {item.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-medium text-sm text-gray-900 flex-shrink-0">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Manual Items */}
          <div className="border border-gray-200 rounded-lg">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900">
                Additional Items
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddItemModal(true)}
                leftIcon={<Plus className="w-3 h-3" />}
              >
                Add
              </Button>
            </div>
            {manualItems.length > 0 ? (
              <div className="p-3 space-y-2">
                {manualItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-medium">
                      {item.quantity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-gray-900 block truncate">
                        {item.name}
                      </span>
                      <div className="text-xs text-amber-600">Manual</div>
                    </div>
                    <span className="font-medium text-sm text-gray-900">
                      {formatCurrency(item.total_price)}
                    </span>
                    <button
                      onClick={() => removeManualItem(item.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-gray-500">
                No additional items
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky Actions, better spacing on mobile */}
        <div className="border-t p-4 bg-white flex-shrink-0 rounded-b-2xl lg:rounded-b-lg">
          <div className="flex gap-2">
            {tableStatus === "ready-to-bill" ? (
              <Button
                variant="primary"
                onClick={() => setShowBillingModal(true)}
                className="flex-1 min-h-[44px]"
                size="sm"
                leftIcon={<IndianRupee className="w-4 h-4" />}
              >
                Process Bill
              </Button>
            ) : /* Show Serve button when items are ready */
            table.session.orders?.some((order) =>
                order.order_items.some((item) => item.status === "ready")
              ) ? (
              <Button
                variant="primary"
                onClick={handleMarkAsServed}
                disabled={changingOrderStatus === "marking_served"}
                className="flex-1 min-h-[44px]"
                size="sm"
                leftIcon={<Utensils className="w-4 h-4" />}
              >
                {changingOrderStatus === "marking_served"
                  ? "Marking as Served..."
                  : "Mark Items as Served"}
              </Button>
            ) : (
              <div className="flex-1 text-center text-sm text-gray-500 py-3">
                Waiting for orders to be ready...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill Processing Modal */}
      {showBillingModal && (
        <BillProcessingModal
          table={table}
          manualItems={manualItems}
          onAddManualItem={() => setShowAddItemModal(true)}
          onRemoveManualItem={removeManualItem}
          onClose={() => setShowBillingModal(false)}
          onSuccess={handlePaymentCompleteInternal}
        />
      )}

      {/* Add Manual Item Modal */}
      <AddManualItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onAddItem={handleAddManualItem}
      />
    </>
  );
}
