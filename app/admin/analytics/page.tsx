"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  Gift,
  Table2,
  ArrowRight,
  Download,
} from "lucide-react";
import Card from "@/components/admin/Card";
import { formatCurrency } from "@/lib/constants";

type Period = "7d" | "30d" | "90d" | "1y" | "all";

export default function AnalyticsOverviewPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30d");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Fetching analytics for period:", period);
      const res = await fetch(`/api/admin/analytics?period=${period}`, {
        credentials: 'include',
      });

      console.log("Analytics response status:", res.status);

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized - Please log in as admin");
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Failed to fetch analytics");
        return;
      }

      const data = await res.json();
      console.log("Analytics data received:", data);
      setAnalytics(data);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
          <p className="mt-2 text-gray-600">{error}</p>
          <div className="mt-4 space-x-3">
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Retry
            </button>
            {error.includes("Unauthorized") && (
              <a
                href="/admin/login"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Login
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No analytics data available</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  const analyticsCards = [
    {
      title: "Revenue Analytics",
      description: "Track revenue trends, payment methods, and financial performance",
      icon: <DollarSign className="w-8 h-8" />,
      color: "green",
      value: formatCurrency(analytics.overview.totalRevenue),
      label: "Total Revenue",
      href: "/admin/analytics/revenue",
      stats: [
        { label: "Total Bills", value: analytics.revenue.count },
        { label: "Avg Bill", value: formatCurrency(analytics.revenue.count > 0 ? analytics.overview.totalRevenue / analytics.revenue.count : 0) },
      ],
    },
    {
      title: "Menu Performance",
      description: "Analyze top selling items, category trends, and menu optimization",
      icon: <UtensilsCrossed className="w-8 h-8" />,
      color: "amber",
      value: analytics.menu.totalItemsSold.toLocaleString(),
      label: "Items Sold",
      href: "/admin/analytics/menu",
      stats: [
        { label: "Veg Items", value: analytics.menu.vegNonVeg.veg.quantity },
        { label: "Non-Veg Items", value: analytics.menu.vegNonVeg.nonVeg.quantity },
      ],
    },
    {
      title: "Customer Insights",
      description: "Understand customer behavior, retention, and top spenders",
      icon: <Users className="w-8 h-8" />,
      color: "purple",
      value: analytics.overview.totalCustomers.toLocaleString(),
      label: "Total Customers",
      href: "/admin/analytics/customers",
      stats: [
        { label: "New Customers", value: analytics.customers.new },
        { label: "Returning", value: analytics.customers.returning },
      ],
    },
    {
      title: "Orders Overview",
      description: "Monitor order status, completion rates, and order trends",
      icon: <ShoppingCart className="w-8 h-8" />,
      color: "blue",
      value: analytics.overview.totalOrders.toLocaleString(),
      label: "Total Orders",
      href: "/admin/analytics/orders",
      stats: [
        { label: "Completed", value: analytics.orders.completed },
        { label: "Cancelled", value: analytics.orders.cancelled },
      ],
    },
    {
      title: "Offers Performance",
      description: "Track offer usage, discounts given, and promotion effectiveness",
      icon: <Gift className="w-8 h-8" />,
      color: "pink",
      value: analytics.offers.totalUsage.toLocaleString(),
      label: "Offers Used",
      href: "/admin/analytics/offers",
      stats: [
        { label: "Active Offers", value: analytics.offers.activeOffers },
        { label: "Total Discount", value: formatCurrency(analytics.offers.totalDiscount) },
      ],
    },
    {
      title: "Table Analytics",
      description: "Analyze table utilization, session duration, and table performance",
      icon: <Table2 className="w-8 h-8" />,
      color: "indigo",
      value: analytics.tables.totalSessions.toLocaleString(),
      label: "Total Sessions",
      href: "/admin/analytics/tables",
      stats: [
        { label: "Active Now", value: analytics.tables.activeSessions },
        { label: "Avg Duration", value: `${analytics.tables.averageSessionDuration}min` },
      ],
    },
  ];

  const colorClasses = {
    green: {
      bg: "bg-green-50",
      text: "text-green-600",
      border: "border-green-200",
      hover: "hover:bg-green-100",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-200",
      hover: "hover:bg-amber-100",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      border: "border-purple-200",
      hover: "hover:bg-purple-100",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-200",
      hover: "hover:bg-blue-100",
    },
    pink: {
      bg: "bg-pink-50",
      text: "text-pink-600",
      border: "border-pink-200",
      hover: "hover:bg-pink-100",
    },
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      border: "border-indigo-200",
      hover: "hover:bg-indigo-100",
    },
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Bird's eye view of your restaurant performance</p>
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

          <button
            onClick={() => {
              const dataStr = JSON.stringify(analytics, null, 2);
              const dataBlob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `analytics-overview-${period}-${new Date().toISOString()}.json`;
              link.click();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(analytics.overview.totalRevenue)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  {period === "7d" ? "This Week" : period === "30d" ? "This Month" : "Selected Period"}
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {analytics.overview.totalOrders.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  {analytics.orders.completed} Completed
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {analytics.overview.totalCustomers.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">
                  {analytics.customers.new} New
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(analytics.overview.averageOrderValue)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-600">
                  Per Order
                </span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Analytics Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyticsCards.map((card, index) => {
            const colors = colorClasses[card.color as keyof typeof colorClasses];
            return (
              <Card
                key={index}
                className={`p-6 border-2 ${colors.border} ${colors.hover} transition-all duration-200 cursor-pointer group`}
                onClick={() => router.push(card.href)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 ${colors.bg} rounded-lg ${colors.text}`}>
                    {card.icon}
                  </div>
                  <ArrowRight className={`w-5 h-5 ${colors.text} group-hover:translate-x-1 transition-transform`} />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{card.description}</p>

                <div className="mb-4">
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{card.value}</p>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                  {card.stats.map((stat, idx) => (
                    <div key={idx}>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Need Custom Reports?</h3>
            <p className="text-gray-600 mt-1">Export detailed analytics data for further analysis</p>
          </div>
          <button
            onClick={() => {
              const dataStr = JSON.stringify(analytics, null, 2);
              const dataBlob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `analytics-complete-${period}-${new Date().toISOString()}.json`;
              link.click();
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export All Data
          </button>
        </div>
      </div>
    </div>
  );
}
