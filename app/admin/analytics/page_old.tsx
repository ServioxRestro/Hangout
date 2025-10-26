"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  Gift,
  Table2,
  Calendar,
  Download,
  Filter,
} from "lucide-react";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import { formatCurrency } from "@/lib/constants";

type Period = "7d" | "30d" | "90d" | "1y" | "all";

const COLORS = {
  primary: "#10b981", // green-500
  secondary: "#3b82f6", // blue-500
  accent: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
  purple: "#8b5cf6", // violet-500
  pink: "#ec4899", // pink-500
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.purple, COLORS.pink, COLORS.danger];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "revenue" | "menu" | "customers" | "offers" | "tables">("overview");

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?period=${period}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please log in as admin");
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch analytics");
      }
      return res.json();
    },
  });

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Failed to load analytics</h3>
          <p className="mt-2 text-gray-600">{(error as Error).message || "Please try again later or contact support."}</p>
          <div className="flex gap-3 justify-center mt-6">
            {(error as Error).message?.includes("Unauthorized") && (
              <a
                href="/admin/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Login
              </a>
            )}
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "revenue", label: "Revenue", icon: <DollarSign className="w-4 h-4" /> },
    { id: "menu", label: "Menu", icon: <UtensilsCrossed className="w-4 h-4" /> },
    { id: "customers", label: "Customers", icon: <Users className="w-4 h-4" /> },
    { id: "offers", label: "Offers", icon: <Gift className="w-4 h-4" /> },
    { id: "tables", label: "Tables", icon: <Table2 className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into your restaurant performance</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            {[
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
              { value: "90d", label: "90 Days" },
              { value: "1y", label: "1 Year" },
              { value: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as Period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => {
              // Export functionality
              const dataStr = JSON.stringify(analytics, null, 2);
              const dataBlob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `analytics-${period}-${new Date().toISOString()}.json`;
              link.click();
            }}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === "overview" && <OverviewTab analytics={analytics} />}
      {activeTab === "revenue" && <RevenueTab analytics={analytics} />}
      {activeTab === "menu" && <MenuTab analytics={analytics} />}
      {activeTab === "customers" && <CustomersTab analytics={analytics} />}
      {activeTab === "offers" && <OffersTab analytics={analytics} />}
      {activeTab === "tables" && <TablesTab analytics={analytics} />}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ analytics }: { analytics: any }) {
  const metrics = [
    {
      label: "Total Revenue",
      value: formatCurrency(analytics.overview.totalRevenue),
      icon: <DollarSign className="w-6 h-6 text-green-600" />,
      bg: "bg-green-50",
      change: "+12.5%",
      trend: "up",
    },
    {
      label: "Total Orders",
      value: analytics.overview.totalOrders.toLocaleString(),
      icon: <ShoppingCart className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-50",
      change: "+8.2%",
      trend: "up",
    },
    {
      label: "Total Customers",
      value: analytics.overview.totalCustomers.toLocaleString(),
      icon: <Users className="w-6 h-6 text-purple-600" />,
      bg: "bg-purple-50",
      change: "+15.3%",
      trend: "up",
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(analytics.overview.averageOrderValue),
      icon: <TrendingUp className="w-6 h-6 text-amber-600" />,
      bg: "bg-amber-50",
      change: "+4.1%",
      trend: "up",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{metric.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {metric.trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {metric.change}
                  </span>
                  <span className="text-sm text-gray-500">vs last period</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${metric.bg}`}>
                {metric.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue & Orders Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.revenue.trend}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="amount" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Orders Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.orders.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              />
              <Line type="monotone" dataKey="count" stroke={COLORS.secondary} strokeWidth={2} dot={{ fill: COLORS.secondary, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Order Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(analytics.orders.byStatus).map(([name, value]) => ({ name, value }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.keys(analytics.orders.byStatus).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Orders by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(analytics.orders.byType).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              />
              <Bar dataKey="value" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// Revenue Tab Component
function RevenueTab({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.revenue.total)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.revenue.count}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Bill</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.revenue.count > 0 ? analytics.revenue.total / analytics.revenue.count : 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue by Payment Method */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue by Payment Method</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={Object.entries(analytics.revenue.byPaymentMethod).map(([name, value]) => ({ name, value }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              formatter={(value: any) => formatCurrency(value)}
            />
            <Bar dataKey="value" fill={COLORS.secondary} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Revenue Trend */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={analytics.revenue.trend}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              formatter={(value: any) => formatCurrency(value)}
            />
            <Area type="monotone" dataKey="amount" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// Menu Tab Component
function MenuTab({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      {/* Menu Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <UtensilsCrossed className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Items Sold</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.menu.totalItemsSold.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Veg vs Non-Veg Sales</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: "Veg", value: analytics.menu.vegNonVeg.veg.quantity },
                  { name: "Non-Veg", value: analytics.menu.vegNonVeg.nonVeg.quantity },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Selling Items */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Selling Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Item Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Quantity</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {analytics.menu.topItems.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                  <td className="py-3 px-4 text-gray-600">{item.category}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.isVeg ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {item.isVeg ? "🟢 Veg" : "🔴 Non-Veg"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">{formatCurrency(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sales by Category */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Sales by Category</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={Object.entries(analytics.menu.byCategory).map(([name, data]: [string, any]) => ({
            name,
            quantity: data.quantity,
            revenue: data.revenue,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
            />
            <Legend />
            <Bar dataKey="quantity" fill={COLORS.secondary} name="Quantity" radius={[8, 8, 0, 0]} />
            <Bar dataKey="revenue" fill={COLORS.primary} name="Revenue (₹)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// Customers Tab Component
function CustomersTab({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      {/* Customer Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.customers.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">New Customers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.customers.new}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Returning</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.customers.returning}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Spend</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.customers.averageSpend)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer Acquisition Trend */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Acquisition Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.customers.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
            />
            <Line type="monotone" dataKey="count" stroke={COLORS.purple} strokeWidth={2} dot={{ fill: COLORS.purple, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Customers */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Customers by Spend</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Phone</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Total Spent</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Orders</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Visits</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Avg per Order</th>
              </tr>
            </thead>
            <tbody>
              {analytics.customers.topCustomers.map((customer: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{customer.phone}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">{formatCurrency(customer.totalSpent)}</td>
                  <td className="py-3 px-4 text-right">{customer.totalOrders}</td>
                  <td className="py-3 px-4 text-right">{customer.visitCount}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatCurrency(customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Offers Tab Component
function OffersTab({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      {/* Offers Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-50 rounded-lg">
              <Gift className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Offers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.offers.totalOffers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Offers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.offers.activeOffers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.offers.totalUsage}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Discount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.offers.totalDiscount)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performing Offers */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing Offers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Offer Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Usage Count</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Total Discount</th>
              </tr>
            </thead>
            <tbody>
              {analytics.offers.topOffers.map((offer: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 text-pink-700 font-bold text-sm">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{offer.name}</td>
                  <td className="py-3 px-4 text-gray-600">{offer.type}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      offer.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {offer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{offer.usageCount}</td>
                  <td className="py-3 px-4 text-right font-bold text-amber-600">{formatCurrency(offer.totalDiscount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Tables Tab Component
function TablesTab({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      {/* Tables Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Table2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.tables.totalSessions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.tables.activeSessions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Session</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.tables.averageSessionDuration} min</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performing Tables */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing Tables</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Table Number</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Sessions</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Revenue</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Avg per Session</th>
              </tr>
            </thead>
            <tbody>
              {analytics.tables.topTables.map((table: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">Table {table.tableNumber}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      table.isVegOnly ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {table.isVegOnly ? "🟢 Veg Only" : "All Items"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{table.sessions}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">{formatCurrency(table.revenue)}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatCurrency(table.sessions > 0 ? table.revenue / table.sessions : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
