"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
// Removed PageHeader import as we use layout now
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  Archive,
  X,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";

type Order = Tables<"orders"> & {
  restaurant_tables: Tables<"restaurant_tables"> | null;
  order_items: Array<
    Tables<"order_items"> & {
      menu_items: Tables<"menu_items"> | null;
    }
  >;
};

type TableWithOrders = {
  table: Tables<"restaurant_tables"> | null;
  orders: Order[];
  totalAmount: number;
  oldestOrderTime: string;
  orderType: 'dine-in' | 'takeaway';
};


export default function ActiveOrdersPage() {
  const [activeTableOrders, setActiveTableOrders] = useState<TableWithOrders[]>([]);
  const [takeawayOrders, setTakeawayOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchActiveOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveOrders = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      // Fetch all active orders (both dine-in and takeaway)
      const { data: activeOrders, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          total_amount,
          customer_phone,
          customer_email,
          notes,
          order_type,
          created_at,
          created_by_type,
          created_by_admin_id,
          created_by_staff_id,
          restaurant_tables (
            id,
            table_number,
            table_code,
            is_active,
            qr_code_url,
            created_at,
            updated_at
          ),
          order_items!inner (
            id,
            quantity,
            unit_price,
            total_price,
            menu_items!inner (
              id,
              name,
              price,
              is_veg,
              subcategory
            )
          )
        `
        )
        .in("status", ["placed", "preparing", "ready", "served"])
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching active orders:", error);
        return;
      }

      // Separate dine-in and takeaway orders using order_type
      const dineInOrders = activeOrders?.filter(order => order.order_type === 'dine-in') || [];
      const takeawayOrdersList = activeOrders?.filter(order => order.order_type === 'takeaway') || [];

      // Group dine-in orders by table
      const tableOrdersMap = new Map<string, TableWithOrders>();
      dineInOrders.forEach((order) => {
        const tableId = order.restaurant_tables!.id;
        if (tableOrdersMap.has(tableId)) {
          const existing = tableOrdersMap.get(tableId)!;
          existing.orders.push(order as Order);
          existing.totalAmount += order.total_amount || 0;
          if (new Date(order.created_at || "") < new Date(existing.oldestOrderTime)) {
            existing.oldestOrderTime = order.created_at || "";
          }
        } else {
          tableOrdersMap.set(tableId, {
            table: order.restaurant_tables,
            orders: [order as Order],
            totalAmount: order.total_amount || 0,
            oldestOrderTime: order.created_at || "",
            orderType: 'dine-in'
          });
        }
      });

      // Priority sorting function
      const getStatusPriority = (status: string) => {
        const priorities = { 'ready': 1, 'preparing': 2, 'placed': 3, 'served': 4 };
        return priorities[status as keyof typeof priorities] || 5;
      };

      // Sort takeaway orders by priority (individual orders, no grouping)
      const sortedTakeawayOrders = takeawayOrdersList.sort((a, b) => {
        const aPriority = getStatusPriority(a.status || 'placed');
        const bPriority = getStatusPriority(b.status || 'placed');

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
      });

      // Sort table orders by priority (status first, then time)
      const sortedTableOrders = Array.from(tableOrdersMap.values()).sort((a, b) => {
        // Get highest priority status in each table's orders
        const aHighestPriority = Math.min(...a.orders.map(o => getStatusPriority(o.status || 'placed')));
        const bHighestPriority = Math.min(...b.orders.map(o => getStatusPriority(o.status || 'placed')));

        if (aHighestPriority !== bHighestPriority) {
          return aHighestPriority - bHighestPriority;
        }

        // If same priority, sort by oldest order time
        return new Date(a.oldestOrderTime).getTime() - new Date(b.oldestOrderTime).getTime();
      });

      setActiveTableOrders(sortedTableOrders);
      setTakeawayOrders(sortedTakeawayOrders as Order[]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) {
        console.error("Error updating order:", error);
        return;
      }

      // Refresh data
      fetchActiveOrders();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleCancelOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: 'cancelled',
          cancelled_reason: cancelReason.trim(),
          cancelled_at: new Date().toISOString()
        })
        .eq("id", selectedOrder.id);

      if (error) {
        console.error("Error cancelling order:", error);
        return;
      }

      // Check if this was the last active order in the session
      if (selectedOrder.table_session_id) {
        const { data: remainingOrders } = await supabase
          .from("orders")
          .select("id, status")
          .eq("table_session_id", selectedOrder.table_session_id)
          .neq("id", selectedOrder.id)
          .not("status", "in", "(cancelled)");

        // If no active orders remain in the session, close it
        if (!remainingOrders || remainingOrders.length === 0) {
          await supabase
            .from("table_sessions")
            .update({
              status: 'completed',
              session_ended_at: new Date().toISOString()
            })
            .eq("id", selectedOrder.table_session_id);
        }
      }

      // Close modal and refresh data
      setShowCancelModal(false);
      setSelectedOrder(null);
      setCancelReason('');
      fetchActiveOrders();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setCancelling(false);
    }
  };

  const getOrderPriority = (createdAt: string, status: string) => {
    // Served orders don't need kitchen priority
    if (status === 'served') {
      return {
        level: "served",
        color: "text-blue-600",
        bg: "bg-blue-50 border-blue-200",
      };
    }

    // Completed/paid orders don't need priority
    if (status === 'completed' || status === 'paid') {
      return {
        level: "completed",
        color: "text-gray-600",
        bg: "bg-gray-50 border-gray-200",
      };
    }

    // Only calculate time-based priority for kitchen orders: placed, preparing, ready
    const now = new Date().getTime();
    const orderTime = new Date(createdAt).getTime();
    const minutesAgo = (now - orderTime) / (1000 * 60);

    if (minutesAgo > 30)
      return {
        level: "urgent",
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
      };
    if (minutesAgo > 15)
      return {
        level: "high",
        color: "text-orange-600",
        bg: "bg-orange-50 border-orange-200",
      };
    return {
      level: "normal",
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
    };
  };

  const getTimeSince = (createdAt: string) => {
    const now = new Date().getTime();
    const orderTime = new Date(createdAt).getTime();
    const minutesAgo = Math.floor((now - orderTime) / (1000 * 60));

    if (minutesAgo < 1) return "Just now";
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ${minutesAgo % 60}m ago`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      placed: {
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Clock,
      },
      preparing: {
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: AlertCircle,
      },
      ready: {
        color: "bg-orange-50 text-orange-700 border-orange-200",
        icon: Bell,
      },
      served: {
        color: "bg-green-50 text-green-700 border-green-200",
        icon: CheckCircle,
      },
      cancelled: {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: X,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.placed;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Active Orders</h1>
          <p className="text-gray-600 mt-1">Kitchen workflow: Placed → Preparing → <span className="text-orange-600 font-medium">Ready</span> → Served → <span className="text-blue-600 font-medium">Ready for Billing</span></p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={() => fetchActiveOrders(true)}
            leftIcon={
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            }
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/admin/billing")}
            leftIcon={<Receipt className="w-4 h-4" />}
          >
            Go to Billing
          </Button>
          <Button
            variant="secondary"
            onClick={() => (window.location.href = "/admin/orders/history")}
            leftIcon={<Archive className="w-4 h-4" />}
          >
            View History
          </Button>
        </div>
      </div>

      {/* Flow Information */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">New Order Flow</h3>
              <p className="text-sm text-blue-800 mt-1">
                Once orders are <strong>Served</strong>, they automatically appear in the <strong>Bills & Payments</strong> page for billing.
                Completed payments will close the table session and free up the table.
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
                <span className="px-2 py-1 bg-blue-100 rounded">Placed</span>
                <span>→</span>
                <span className="px-2 py-1 bg-yellow-100 rounded">Preparing</span>
                <span>→</span>
                <span className="px-2 py-1 bg-orange-100 rounded">Ready</span>
                <span>→</span>
                <span className="px-2 py-1 bg-green-100 rounded">Served</span>
                <span>→</span>
                <span className="px-2 py-1 bg-blue-100 rounded">Ready for Billing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        {/* Active Orders by Table */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-orange-500 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Active Orders - Serve Now
                </h2>
                <p className="text-sm text-gray-500">
                  Orders grouped by table, sorted by urgency
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-xs text-gray-500">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                Urgent (30+ min)
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                High (15+ min)
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                Normal
              </div>
            </div>
          </div>

          {activeTableOrders.length === 0 && takeawayOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                All Caught Up!
              </h3>
              <p className="text-gray-500">
                No active orders to serve right now.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Takeaway Orders Section */}
              {/* Individual Takeaway Orders */}
              {takeawayOrders.map((order) => {
                const priority = getOrderPriority(order.created_at || "", order.status || "placed");
                return (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-6 ${priority.bg} border-2`}
                  >
                    {/* Takeaway Order Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-4 shadow-sm">
                          <span className="font-bold text-lg text-purple-700">
                            📦
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Takeaway Order #{order.id.slice(-6)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {order.customer_phone || 'No phone'} •
                            {getTimeSince(order.created_at || "")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </div>
                        <div className={`text-sm font-medium ${priority.color}`}>
                          {priority.level.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Single Order Details */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-500">
                              #{order.id.slice(-6)}
                            </span>
                            {getStatusBadge(order.status || "placed")}
                            <span className="text-sm text-gray-500">
                              {order.customer_phone}
                            </span>
                            {/* Creator indicator */}
                            <span className={`text-xs px-2 py-1 rounded ${
                              order.created_by_type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {order.created_by_type === 'admin' ? '👑 Admin' : '👤 Staff'}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              Takeaway
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {order.status !== 'cancelled' && (
                              <>
                                <select
                                  value={order.status || "placed"}
                                  onChange={(e) =>
                                    updateOrderStatus(order.id, e.target.value)
                                  }
                                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="placed">Placed</option>
                                  <option value="preparing">Preparing</option>
                                  <option value="ready">Ready</option>
                                  <option value="served">Served</option>
                                </select>

                                {(order.status === 'placed' || order.status === 'preparing') && (
                                  <button
                                    onClick={() => handleCancelOrder(order)}
                                    className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-100 transition-colors flex items-center"
                                    title="Cancel this order"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </button>
                                )}

                                {order.status === 'served' && (
                                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                                    Ready for Billing
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between text-sm ${
                                order.status === 'cancelled' ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-center">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2 ${
                                  order.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {item.quantity}
                                </span>
                                <span className={`font-medium ${
                                  order.status === 'cancelled' ? 'line-through' : ''
                                }`}>
                                  {item.menu_items?.name || "Unknown Item"}
                                </span>
                                {item.menu_items?.is_veg && (
                                  <span className="ml-2 text-green-500">
                                    🟢
                                  </span>
                                )}
                                {item.menu_items?.is_veg === false && (
                                  <span className="ml-2 text-red-500">
                                    🔴
                                  </span>
                                )}
                              </div>
                              <span className={`font-medium ${
                                order.status === 'cancelled' ? 'line-through' : ''
                              }`}>
                                {formatCurrency(item.total_price)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-xs text-yellow-800">
                              <strong>Note:</strong> {order.notes}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}

              {/* Dine-in Table Orders */}
              {activeTableOrders.map((tableOrder) => {
                // Determine priority based on most urgent status in table
                const hasPlaced = tableOrder.orders.some(o => o.status === 'placed');
                const hasPreparing = tableOrder.orders.some(o => o.status === 'preparing');
                const hasReady = tableOrder.orders.some(o => o.status === 'ready');
                const allServed = tableOrder.orders.every(o => o.status === 'served');

                let priorityStatus = 'served';
                if (hasPlaced) priorityStatus = 'placed';
                else if (hasPreparing) priorityStatus = 'preparing';
                else if (hasReady) priorityStatus = 'ready';

                const priority = getOrderPriority(tableOrder.oldestOrderTime, priorityStatus);
                return (
                  <div
                    key={tableOrder.table?.id}
                    className={`border rounded-lg p-6 ${priority.bg} border-2`}
                  >
                    {/* Table Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-4 shadow-sm">
                          <span className="font-bold text-lg text-gray-700">
                            {tableOrder.table?.table_number}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Table {tableOrder.table?.table_number}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {tableOrder.orders.length} order
                            {tableOrder.orders.length !== 1 ? "s" : ""} •
                            Oldest: {getTimeSince(tableOrder.oldestOrderTime)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(tableOrder.totalAmount)}
                        </div>
                        <div className={`text-sm font-medium ${priority.color}`}>
                          {priority.level.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Orders for this table */}
                    <div className="space-y-4">
                      {tableOrder.orders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-500">
                                #{order.id.slice(-6)}
                              </span>
                              {getStatusBadge(order.status || "placed")}
                              <span className="text-sm text-gray-500">
                                {order.customer_phone}
                              </span>
                              {/* Creator indicator */}
                              <span className={`text-xs px-2 py-1 rounded ${
                                order.created_by_type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {order.created_by_type === 'admin' ? '👑 Admin' : '👤 Staff'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {order.status !== 'cancelled' && (
                                <>
                                  <select
                                    value={order.status || "placed"}
                                    onChange={(e) =>
                                      updateOrderStatus(order.id, e.target.value)
                                    }
                                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="placed">Placed</option>
                                    <option value="preparing">Preparing</option>
                                    <option value="ready">Ready</option>
                                    <option value="served">Served</option>
                                  </select>

                                  {(order.status === 'placed' || order.status === 'preparing') && (
                                    <button
                                      onClick={() => handleCancelOrder(order)}
                                      className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-100 transition-colors flex items-center"
                                      title="Cancel this order"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Cancel
                                    </button>
                                  )}

                                  {order.status === 'served' && (
                                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                                      Ready for Billing
                                    </span>
                                  )}
                                </>
                              )}

                              {order.status === 'cancelled' && (
                                <span className="text-xs text-red-600 font-medium">
                                  Cancelled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="space-y-2">
                            {order.order_items.map((item) => (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between text-sm ${
                                  order.status === 'cancelled' ? 'opacity-60' : ''
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2 ${
                                    order.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {item.quantity}
                                  </span>
                                  <span className={`font-medium ${
                                    order.status === 'cancelled' ? 'line-through' : ''
                                  }`}>
                                    {item.menu_items?.name || "Unknown Item"}
                                  </span>
                                  {item.menu_items?.is_veg && (
                                    <span className="ml-2 text-green-500">
                                      🟢
                                    </span>
                                  )}
                                  {item.menu_items?.is_veg === false && (
                                    <span className="ml-2 text-red-500">
                                      🔴
                                    </span>
                                  )}
                                </div>
                                <span className={`font-medium ${
                                  order.status === 'cancelled' ? 'line-through' : ''
                                }`}>
                                  {formatCurrency(item.total_price)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-xs text-yellow-800">
                                <strong>Note:</strong> {order.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
                <p className="text-sm text-gray-600">
                  Order #{selectedOrder.id.slice(-6)}
                  {selectedOrder.restaurant_tables ?
                    ` - Table ${selectedOrder.restaurant_tables.table_number}` :
                    ' - Takeaway'
                  }
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation *
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Please provide a reason for cancelling this order..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedOrder(null);
                  setCancelReason('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={cancelling}
              >
                Keep Order
              </button>
              <button
                onClick={confirmCancelOrder}
                disabled={!cancelReason.trim() || cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {cancelling ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel Order
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Warning:</strong> This action cannot be undone. The order will be marked as cancelled and removed from kitchen workflow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}