"use client";

import { useState } from "react";
import Button from "../Button";
import {
  Clock,
  DollarSign,
  Utensils,
  Plus,
  X,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { getStatusBadgeClass } from "@/lib/utils/kot";
import { BillingModal } from "./BillingModal";
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

  return (
    <>
      {/* Compact Inline Panel */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg h-fit sticky top-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">
              Table {table.table.table_number}
            </h3>
            <p className="text-xs text-gray-600 truncate">
              {formatDuration(
                table.session.session_started_at ||
                  table.session.created_at ||
                  ""
              )} • {formatCurrency(table.session.total_amount || 0)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1.5 hover:bg-gray-200 rounded-lg transition flex-shrink-0"
            aria-label="Close panel"
          >
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {/* Session Info Compact */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div>
              <div className="text-xs text-gray-600">Customer</div>
              <div className="font-medium text-sm text-gray-900">
                {table.session.guest_users?.name || "Guest"}
              </div>
              <div className="text-xs text-gray-600">
                {table.session.customer_phone}
              </div>
            </div>

            {table.session.guest_users && (
              <div className="pt-2 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-600">Visits</div>
                    <div className="font-medium text-gray-900">
                      {table.session.guest_users.visit_count}x
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Lifetime</div>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(
                        table.session.guest_users.total_spent || 0
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          {table.session.orders && table.session.orders.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-900">
                  Order Items
                </h4>
                {table.session.orders.some((order) =>
                  order.order_items.some((item) => item.status === "ready")
                ) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleMarkAsServed}
                    disabled={changingOrderStatus === "marking_served"}
                    leftIcon={<Utensils className="w-3 h-3" />}
                  >
                    {changingOrderStatus === "marking_served"
                      ? "Marking..."
                      : "Serve"}
                  </Button>
                )}
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

        {/* Footer - Sticky Actions */}
        <div className="border-t p-4 bg-white">
          <div className="flex gap-2">
            {tableStatus === "ready-to-bill" ? (
              <Button
                variant="primary"
                onClick={() => setShowBillingModal(true)}
                className="flex-1"
                size="sm"
                leftIcon={<DollarSign className="w-4 h-4" />}
              >
                Process Bill
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => onEndSession(table.session!.id)}
                className="flex-1"
                size="sm"
              >
                End Session
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Billing Modal */}
      <BillingModal
        isOpen={showBillingModal}
        onClose={() => setShowBillingModal(false)}
        selectedTable={table}
        manualItems={manualItems}
        onPaymentComplete={handlePaymentCompleteInternal}
      />

      {/* Add Manual Item Modal */}
      <AddManualItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onAddItem={handleAddManualItem}
      />
    </>
  );
}
