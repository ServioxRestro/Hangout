"use client";

import { useDashboardStats } from "@/hooks/useAdminQueries";
import type { Tables } from "@/types/database.types";
import StatsCard from "@/components/admin/StatsCard";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import {
  ShoppingBag,
  IndianRupee,
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
  totalBills: number;
  todayBills: number;
};

type TableWithOrders = {
  table: Tables<"restaurant_tables">;
  orders: Order[];
  totalAmount: number;
  oldestOrderTime: string;
};

export default function AdminDashboard() {
  const { data, isLoading, error, refetch, isFetching } = useDashboardStats();

  const stats = data?.stats || {
    total: 0,
    today: 0,
    pending: 0,
    completed: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    activeOrders: 0,
    totalBills: 0,
    todayBills: 0,
  };

  // Group active orders by table
  const activeTableOrders = (() => {
    if (!data?.activeOrders) return [];

    const tableOrdersMap = new Map<string, TableWithOrders>();

    data.activeOrders.forEach((order: any) => {
      if (!order.restaurant_tables) return;

      const tableId = order.restaurant_tables.id;
      if (tableOrdersMap.has(tableId)) {
        const existing = tableOrdersMap.get(tableId)!;
        existing.orders.push(order as Order);
        existing.totalAmount += order.total_amount || 0;
        if (
          new Date(order.created_at || "") < new Date(existing.oldestOrderTime)
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

    return Array.from(tableOrdersMap.values()).sort(
      (a, b) =>
        new Date(a.oldestOrderTime).getTime() -
        new Date(b.oldestOrderTime).getTime()
    );
  })();

  const handleRefresh = () => {
    refetch();
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load dashboard data</p>
          <Button onClick={handleRefresh} className="mt-4">
            Retry
          </Button>
        </div>
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
                onClick={handleRefresh}
                leftIcon={
                  <RefreshCw
                    className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
                  />
                }
                disabled={isFetching}
                className="w-full sm:w-auto"
              >
                {isFetching ? "Refreshing..." : "Refresh"}
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
            icon={<IndianRupee className="w-6 h-6" />}
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
