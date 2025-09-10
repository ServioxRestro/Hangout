"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  Archive,
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
  table: Tables<"restaurant_tables">;
  orders: Order[];
  totalAmount: number;
  oldestOrderTime: string;
};

export default function ActiveOrdersPage() {
  const [activeTableOrders, setActiveTableOrders] = useState<TableWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchActiveOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveOrders = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      // Fetch active orders (not completed or paid)
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
          created_at,
          restaurant_tables!inner (
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
        .in("status", ["placed", "preparing", "served"])
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching active orders:", error);
        return;
      }

      // Group active orders by table
      const tableOrdersMap = new Map<string, TableWithOrders>();
      activeOrders?.forEach((order) => {
        if (!order.restaurant_tables) return;
        const tableId = order.restaurant_tables.id;
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
          });
        }
      });

      // Sort by oldest order first (most urgent)
      const sortedTableOrders = Array.from(tableOrdersMap.values()).sort(
        (a, b) => new Date(a.oldestOrderTime).getTime() - new Date(b.oldestOrderTime).getTime()
      );
      setActiveTableOrders(sortedTableOrders);
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

  const getOrderPriority = (createdAt: string) => {
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
      served: {
        color: "bg-green-50 text-green-700 border-green-200",
        icon: CheckCircle,
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
      <PageHeader
        title="Active Orders"
        description="Manage orders that need to be served"
        breadcrumbs={[
          { name: "Dashboard", href: "/admin/dashboard" },
          { name: "Active Orders" },
        ]}
      >
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
            variant="secondary"
            onClick={() => (window.location.href = "/admin/orders/history")}
            leftIcon={<Archive className="w-4 h-4" />}
          >
            View History
          </Button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {activeTableOrders.length === 0 ? (
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
              {activeTableOrders.map((tableOrder) => {
                const priority = getOrderPriority(tableOrder.oldestOrderTime);
                return (
                  <div
                    key={tableOrder.table.id}
                    className={`border rounded-lg p-6 ${priority.bg} border-2`}
                  >
                    {/* Table Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-4 shadow-sm">
                          <span className="font-bold text-lg text-gray-700">
                            {tableOrder.table.table_number}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Table {tableOrder.table.table_number}
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
                            </div>
                            <div className="flex items-center space-x-2">
                              <select
                                value={order.status || "placed"}
                                onChange={(e) =>
                                  updateOrderStatus(order.id, e.target.value)
                                }
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="placed">Placed</option>
                                <option value="preparing">Preparing</option>
                                <option value="served">Served</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="space-y-2">
                            {order.order_items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center">
                                  <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                                    {item.quantity}
                                  </span>
                                  <span className="font-medium">
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
                                <span className="font-medium">
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
    </div>
  );
}