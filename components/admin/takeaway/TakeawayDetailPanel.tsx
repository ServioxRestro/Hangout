"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/constants";
import Button from "@/components/admin/Button";
import Card from "@/components/admin/Card";
import { TakeawayBillModal } from "./TakeawayBillModal";
import {
  X,
  User,
  Phone,
  Clock,
  IndianRupee,
  Package,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Receipt,
} from "lucide-react";

interface TakeawayDetailPanelProps {
  customer: {
    customerName: string;
    customerPhone: string | null;
    orders: any[];
    totalAmount: number;
    earliestOrderTime: string | null;
  };
  onClose: () => void;
  onRefresh: () => void;
}

export function TakeawayDetailPanel({
  customer,
  onClose,
  onRefresh,
}: TakeawayDetailPanelProps) {
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Check if all orders are served (ready for billing)
  const allOrdersServed = customer.orders.every(
    (order) => order.status === "served"
  );

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setProcessingOrderId(orderId);
    try {
      // Update all order items to the new status
      const { error: itemsError } = await supabase
        .from("order_items")
        .update({ status: newStatus })
        .eq("order_id", orderId);

      if (itemsError) {
        console.error("Error updating order items:", itemsError);
        alert("Failed to update order status");
        return;
      }

      // The order status will be auto-updated by the database trigger
      await onRefresh();
      alert(`Order marked as ${newStatus}`);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update order status");
    } finally {
      setProcessingOrderId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "placed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "preparing":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "ready":
        return "bg-green-100 text-green-800 border-green-200";
      case "served":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "paid":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  };

  return (
    <div className="bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {customer.customerName}
              </h3>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Phone className="w-3 h-3" />
                <span>{customer.customerPhone}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <ShoppingCart className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <div className="text-xs text-purple-600 font-medium">Orders</div>
            <div className="text-lg font-bold text-purple-900">
              {customer.orders.length}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <IndianRupee className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <div className="text-xs text-green-600 font-medium">Total</div>
            <div className="text-lg font-bold text-green-900">
              {formatCurrency(customer.totalAmount)}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <div className="text-xs text-blue-600 font-medium">Time</div>
            <div className="text-xs font-bold text-blue-900">
              {customer.earliestOrderTime
                ? formatDuration(customer.earliestOrderTime)
                : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-4">
        {customer.orders.map((order) => (
          <Card key={order.id} className="border-2 border-gray-200">
            <div className="p-4">
              {/* Order Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">
                      Order #{order.id.slice(0, 8)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(order.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(order.total_amount || 0)}
                  </div>
                  {order.takeaway_qr_codes?.is_veg_only && (
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold border border-green-200 inline-block mt-1">
                      🟢 VEG
                    </span>
                  )}
                </div>
              </div>

              {/* Order Items - Grouped by Veg/Non-Veg */}
              <div className="space-y-2 mb-3">
                {/* Veg Items */}
                {order.order_items.some(
                  (item: any) => item.menu_items?.is_veg
                ) && (
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <div className="text-xs font-bold text-green-800 mb-1 uppercase">
                      🟢 Veg Items
                    </div>
                    <div className="space-y-1">
                      {order.order_items
                        .filter((item: any) => item.menu_items?.is_veg)
                        .map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                                {item.quantity}
                              </span>
                              <span className="text-gray-900">
                                {item.menu_items?.name || "Unknown Item"}
                              </span>
                            </div>
                            <span className="text-gray-700 font-medium">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Non-Veg Items */}
                {order.order_items.some(
                  (item: any) => !item.menu_items?.is_veg
                ) && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <div className="text-xs font-bold text-red-800 mb-1 uppercase">
                      🔴 Non-Veg Items
                    </div>
                    <div className="space-y-1">
                      {order.order_items
                        .filter((item: any) => !item.menu_items?.is_veg)
                        .map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                                {item.quantity}
                              </span>
                              <span className="text-gray-900">
                                {item.menu_items?.name || "Unknown Item"}
                              </span>
                            </div>
                            <span className="text-gray-700 font-medium">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Actions */}
              <div className="flex gap-2 flex-wrap">
                {order.status === "placed" && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => updateOrderStatus(order.id, "preparing")}
                    loading={processingOrderId === order.id}
                  >
                    Start Preparing
                  </Button>
                )}
                {order.status === "preparing" && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => updateOrderStatus(order.id, "ready")}
                    loading={processingOrderId === order.id}
                  >
                    Mark as Ready
                  </Button>
                )}
                {order.status === "ready" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateOrderStatus(order.id, "served")}
                    loading={processingOrderId === order.id}
                  >
                    Customer Picked Up
                  </Button>
                )}
                {order.status === "served" && (
                  <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-1.5 rounded border border-purple-200">
                    <IndianRupee className="w-4 h-4" />
                    <span>Ready for billing</span>
                  </div>
                )}
                {order.status === "paid" && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span>Payment completed</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Process Bill Button (Sticky Footer) */}
      {allOrdersServed && customer.orders.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowBillingModal(true)}
            leftIcon={<Receipt className="w-5 h-5" />}
            className="w-full"
          >
            Process Bill • {formatCurrency(customer.totalAmount)}
          </Button>
        </div>
      )}

      {/* Billing Modal */}
      {showBillingModal && (
        <TakeawayBillModal
          customer={customer}
          onClose={() => setShowBillingModal(false)}
          onSuccess={() => {
            setShowBillingModal(false);
            onRefresh();
            onClose();
          }}
        />
      )}
    </div>
  );
}
