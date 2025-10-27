"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import Button from "@/components/admin/Button";
import RoleGuard from "@/components/admin/RoleGuard";
import { formatCurrency } from "@/lib/constants";
import {
  Package,
  Clock,
  User,
  Phone,
  RefreshCw,
  IndianRupee,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { TakeawayDetailPanel } from "@/components/admin/takeaway/TakeawayDetailPanel";

type Order = Tables<"orders"> & {
  order_items: Array<
    Tables<"order_items"> & {
      menu_items: Tables<"menu_items"> | null;
    }
  >;
  guest_users: Tables<"guest_users"> | null;
  takeaway_qr_codes: Tables<"takeaway_qr_codes"> | null;
};

interface CustomerGroup {
  customerName: string;
  customerPhone: string | null;
  orders: Order[];
  totalAmount: number;
  earliestOrderTime: string | null;
  latestStatus: string | null;
}

export default function TakeawayOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerGroup | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    fetchTakeawayOrders();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchTakeawayOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync selectedCustomer with fresh data after orders update
  useEffect(() => {
    if (selectedCustomer && showPanel) {
      const customerGroups = groupOrdersByCustomer(orders);
      const updatedCustomer = customerGroups.find(
        (c) => c.customerPhone === selectedCustomer.customerPhone
      );
      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
      }
    }
  }, [orders, showPanel]);

  const fetchTakeawayOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (
            *,
            menu_items (*)
          ),
          guest_users (*),
          takeaway_qr_codes (*)
        `
        )
        .eq("order_type", "takeaway")
        .not("status", "in", '("cancelled","pending_payment","paid")')
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching takeaway orders:", error);
        return;
      }

      setOrders(data as Order[]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupOrdersByCustomer = (orders: Order[]): CustomerGroup[] => {
    const groups = new Map<string, CustomerGroup>();

    orders.forEach((order) => {
      const key = order.customer_phone || "unknown";

      if (!groups.has(key)) {
        groups.set(key, {
          customerName:
            order.guest_users?.name ||
            order.customer_name ||
            "Unknown Customer",
          customerPhone: order.customer_phone,
          orders: [],
          totalAmount: 0,
          earliestOrderTime: order.created_at,
          latestStatus: order.status,
        });
      }

      const group = groups.get(key)!;
      group.orders.push(order);
      group.totalAmount += order.total_amount || 0;

      if (
        order.created_at &&
        group.earliestOrderTime &&
        order.created_at < group.earliestOrderTime
      ) {
        group.earliestOrderTime = order.created_at;
      } else if (order.created_at && !group.earliestOrderTime) {
        group.earliestOrderTime = order.created_at;
      }

      // Determine latest status (priority: placed > preparing > ready > served > paid)
      const statusPriority: { [key: string]: number } = {
        placed: 1,
        preparing: 2,
        ready: 3,
        served: 4,
        paid: 5,
      };

      const currentPriority = group.latestStatus
        ? statusPriority[group.latestStatus] || 999
        : 999;
      const newPriority = order.status
        ? statusPriority[order.status] || 999
        : 999;

      if (newPriority < currentPriority) {
        group.latestStatus = order.status;
      }
    });

    // Convert to array and sort by earliest order time
    return Array.from(groups.values()).sort((a, b) => {
      const aTime = a.earliestOrderTime
        ? new Date(a.earliestOrderTime).getTime()
        : 0;
      const bTime = b.earliestOrderTime
        ? new Date(b.earliestOrderTime).getTime()
        : 0;
      return aTime - bTime;
    });
  };

  const getCustomerStatus = (
    group: CustomerGroup
  ): "placed" | "preparing" | "ready" | "served" | "paid" => {
    // Return the most urgent status among all orders
    const statuses = group.orders.map((o) => o.status);

    if (statuses.includes("placed")) return "placed";
    if (statuses.includes("preparing")) return "preparing";
    if (statuses.includes("ready")) return "ready";
    if (statuses.includes("served")) return "served";
    return "paid";
  };

  const getStatusColor = (
    status: "placed" | "preparing" | "ready" | "served" | "paid"
  ) => {
    switch (status) {
      case "placed":
        return {
          bg: "bg-blue-500 hover:bg-blue-600",
          text: "text-white",
          border: "border-blue-600",
          icon: "text-blue-100",
        };
      case "preparing":
        return {
          bg: "bg-orange-500 hover:bg-orange-600",
          text: "text-white",
          border: "border-orange-600",
          icon: "text-orange-100",
        };
      case "ready":
        return {
          bg: "bg-green-500 hover:bg-green-600",
          text: "text-white",
          border: "border-green-600",
          icon: "text-green-100",
        };
      case "served":
        return {
          bg: "bg-gray-900 hover:bg-black",
          text: "text-white",
          border: "border-gray-950",
          icon: "text-gray-300",
        };
      case "paid":
        return {
          bg: "bg-purple-500 hover:bg-purple-600",
          text: "text-white",
          border: "border-purple-600",
          icon: "text-purple-100",
        };
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
          <div className="text-gray-600">Loading takeaway orders...</div>
        </div>
      </div>
    );
  }

  const customerGroups = groupOrdersByCustomer(orders);
  const activeCustomers = customerGroups.filter((g) =>
    ["placed", "preparing", "ready", "served"].includes(getCustomerStatus(g))
  );
  const placedCount = customerGroups.filter(
    (g) => getCustomerStatus(g) === "placed"
  ).length;
  const preparingCount = customerGroups.filter(
    (g) => getCustomerStatus(g) === "preparing"
  ).length;
  const readyCount = customerGroups.filter(
    (g) => getCustomerStatus(g) === "ready"
  ).length;

  return (
    <RoleGuard requiredRoute="/admin/takeaway/orders">
      <div className="flex gap-6">
        {/* Left Section - Customer Grid */}
        <div
          className={`flex-1 transition-all duration-300 ${
            showPanel ? "lg:mr-0" : ""
          }`}
        >
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Takeaway Orders
              </h1>
              <p className="text-gray-600 mt-1">
                Manage takeaway orders by customer
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={fetchTakeawayOrders}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>

          {/* Legend */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-700">Placed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm text-gray-700">Preparing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-700">Ready for Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-900 rounded"></div>
                <span className="text-sm text-gray-700">Ready to Bill</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-sm text-gray-700">Paid</span>
              </div>
            </div>
          </div>

          {/* Customer Grid */}
          {customerGroups.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No takeaway orders found
              </h3>
              <p className="text-gray-500">
                Takeaway orders will appear here once customers place orders via
                QR codes.
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                showPanel
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              }`}
            >
              {customerGroups.map((group) => {
                const status = getCustomerStatus(group);
                const colors = getStatusColor(status);
                const hasVegOnlyOrder = group.orders.some(
                  (o) => o.takeaway_qr_codes?.is_veg_only
                );

                return (
                  <button
                    key={group.customerPhone}
                    onClick={() => {
                      setSelectedCustomer(group);
                      setShowPanel(true);
                    }}
                    className={`${colors.bg} ${colors.text} ${colors.border} border-2 rounded-xl p-6 transition-all transform hover:scale-105 cursor-pointer shadow-lg relative`}
                  >
                    {/* Veg-Only Indicator */}
                    {hasVegOnlyOrder && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        🟢 Veg
                      </div>
                    )}

                    {/* Customer Name */}
                    <div className="text-center mb-3 mt-2">
                      <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-2">
                        <User className={`w-6 h-6 ${colors.icon}`} />
                      </div>
                      <div className="text-sm font-bold mb-1 truncate">
                        {group.customerName}
                      </div>
                      <div className={`text-xs ${colors.icon} truncate`}>
                        {group.customerPhone}
                      </div>
                    </div>

                    {/* Order Info */}
                    <div className={`text-xs space-y-1 ${colors.icon}`}>
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {group.earliestOrderTime
                            ? formatDuration(group.earliestOrderTime)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        <span>{formatCurrency(group.totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        <span>
                          {group.orders.length} order
                          {group.orders.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-3 text-center">
                      <div
                        className={`text-xs font-medium px-2 py-1 rounded-full ${colors.icon}`}
                      >
                        {status === "placed" && "New Order"}
                        {status === "preparing" && "Preparing"}
                        {status === "ready" && "Ready"}
                        {status === "served" && "Ready to Bill"}
                        {status === "paid" && "Paid"}
                      </div>
                    </div>

                    {/* Pulse animation for ready orders */}
                    {status === "ready" && (
                      <div className="absolute -top-1 -right-1">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Section - Customer Detail Panel */}
        {showPanel && selectedCustomer && (
          <div className="hidden lg:block w-96 flex-shrink-0">
            <TakeawayDetailPanel
              customer={selectedCustomer}
              onClose={() => {
                setShowPanel(false);
                setSelectedCustomer(null);
              }}
              onRefresh={fetchTakeawayOrders}
            />
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
