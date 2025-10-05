"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import StatsCard from "@/components/admin/StatsCard";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import {
  ShoppingBag,
  DollarSign,
  Timer,
  Table2,
  Menu as MenuIcon,
  RefreshCw,
  ChevronRight,
  Archive,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/constants";

type Order = Tables<"orders"> & {
  restaurant_tables: Tables<"restaurant_tables"> | null;
  order_items: Array<
    Tables<"order_items"> & {
      menu_items: Tables<"menu_items"> | null;
    }
  >;
};

type OrderStats = {
  total: number;
  today: number;
  pending: number;
  completed: number;
  totalRevenue: number;
  todayRevenue: number;
  activeOrders: number;
};

type TableWithOrders = {
  table: Tables<"restaurant_tables">;
  orders: Order[];
  totalAmount: number;
  oldestOrderTime: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    today: 0,
    pending: 0,
    completed: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    activeOrders: 0,
  });
  const [activeTableOrders, setActiveTableOrders] = useState<TableWithOrders[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      // Fetch active orders (not completed or paid) with optimized query
      const { data: activeOrders, error: activeError } = await supabase
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

      if (activeError) {
        console.error("Error fetching active orders:", activeError);
        return;
      }

      // Fetch all orders for stats
      const { data: allOrders, error: statsError } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at");

      if (statsError) {
        console.error("Error fetching stats:", statsError);
        return;
      }

      // Process stats
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const todayOrders =
        allOrders?.filter(
          (order) => new Date(order.created_at || "") >= todayStart
        ) || [];

      const pendingOrders =
        allOrders?.filter((order) =>
          ["placed", "preparing"].includes(order.status || "")
        ) || [];

      const completedOrders =
        allOrders?.filter((order) =>
          ["completed", "paid"].includes(order.status || "")
        ) || [];

      const totalRevenue =
        allOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) ||
        0;
      const todayRevenue = todayOrders.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      );

      setStats({
        total: allOrders?.length || 0,
        today: todayOrders.length,
        pending: pendingOrders.length,
        completed: completedOrders.length,
        totalRevenue,
        todayRevenue,
        activeOrders: activeOrders?.length || 0,
      });

      // Group active orders by table
      const tableOrdersMap = new Map<string, TableWithOrders>();

      activeOrders?.forEach((order) => {
        if (!order.restaurant_tables) return;

        const tableId = order.restaurant_tables.id;
        if (tableOrdersMap.has(tableId)) {
          const existing = tableOrdersMap.get(tableId)!;
          existing.orders.push(order as Order);
          existing.totalAmount += order.total_amount || 0;
          // Update oldest order time if this one is older
          if (
            new Date(order.created_at || "") <
            new Date(existing.oldestOrderTime)
          ) {
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
        (a, b) =>
          new Date(a.oldestOrderTime).getTime() -
          new Date(b.oldestOrderTime).getTime()
      );

      setActiveTableOrders(sortedTableOrders);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
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

  const getTimeSince = (createdAt: string) => {
    const now = new Date().getTime();
    const orderTime = new Date(createdAt).getTime();
    const minutesAgo = Math.floor((now - orderTime) / (1000 * 60));

    if (minutesAgo < 1) return "Just now";
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ${minutesAgo % 60}m ago`;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Overview
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor restaurant performance and key metrics
              </p>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
              <Button
                variant="secondary"
                onClick={() => fetchDashboardData(true)}
                leftIcon={
                  <RefreshCw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                }
                disabled={refreshing}
                className="w-full sm:w-auto"
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                onClick={() => (window.location.href = "/admin/orders")}
                leftIcon={<ChevronRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Manage Orders
              </Button>
            </div>
          </div>
        </div>
        {/* Simple Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <StatsCard
            title="Active Orders"
            value={stats.activeOrders}
            change={{
              value: stats.activeOrders > 0 ? "Need attention" : "All clear",
              trend: stats.activeOrders > 5 ? "up" : "neutral",
            }}
            icon={<Timer className="w-6 h-6" />}
            color={
              stats.activeOrders > 5
                ? "red"
                : stats.activeOrders > 0
                ? "yellow"
                : "green"
            }
          />
          <StatsCard
            title="Today's Orders"
            value={stats.today}
            change={{ value: "Today", trend: "up" }}
            icon={<ShoppingBag className="w-6 h-6" />}
            color="blue"
          />
          <StatsCard
            title="Today's Revenue"
            value={formatCurrencyCompact(stats.todayRevenue)}
            change={{ value: "Today", trend: "up" }}
            icon={<DollarSign className="w-6 h-6" />}
            color="green"
          />
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <div className="p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Timer className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Active Orders</h3>
              <Button
                variant="primary"
                size="sm"
                onClick={() => (window.location.href = "/admin/orders")}
                className="w-full"
              >
                Manage
              </Button>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Table2 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Tables</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = "/admin/tables")}
                className="w-full"
              >
                Manage
              </Button>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MenuIcon className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Menu</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = "/admin/menu")}
                className="w-full"
              >
                Manage
              </Button>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Archive className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">History</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = "/admin/orders/history")}
                className="w-full"
              >
                View
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
