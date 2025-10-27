"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  TrendingUp,
  ArrowLeft,
  Download,
  Award,
  PieChart as PieChartIcon,
} from "lucide-react";
import Card from "@/components/admin/Card";
import { formatCurrency } from "@/lib/constants";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMenuAnalytics, type Period } from "@/hooks/useAnalytics";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export default function MenuAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30d");

  const { data: analytics, isLoading, error } = useMenuAnalytics({ period });

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Failed to load analytics
          </h3>
          <p className="mt-2 text-gray-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const { menu } = analytics;

  // Prepare category data for chart
  const categoryData = Object.entries(menu.byCategory || {}).map(
    ([category, data]: [string, any]) => ({
      category,
      quantity: data.quantity,
      revenue: data.revenue,
    })
  );

  // Prepare veg/non-veg data for pie chart
  const vegNonVegData = [
    {
      name: "Veg",
      value: menu.vegNonVeg.veg.quantity,
      revenue: menu.vegNonVeg.veg.revenue,
    },
    {
      name: "Non-Veg",
      value: menu.vegNonVeg.nonVeg.quantity,
      revenue: menu.vegNonVeg.nonVeg.revenue,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => router.push("/admin/analytics")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Menu Performance
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Analyze top selling items, category trends, and menu optimization
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-200 rounded-lg p-1 overflow-x-auto">
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
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  period === p.value
                    ? "bg-amber-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const dataStr = JSON.stringify(analytics.menu, null, 2);
              const dataBlob = new Blob([dataStr], {
                type: "application/json",
              });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `menu-analytics-${period}-${new Date().toISOString()}.json`;
              link.click();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Total Items Sold
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {menu.totalItemsSold.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-600">
                  All Categories
                </span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <UtensilsCrossed className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Veg Items Sold
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {menu.vegNonVeg.veg.quantity.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(menu.vegNonVeg.veg.revenue)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <span className="text-2xl">🟢</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Non-Veg Items Sold
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {menu.vegNonVeg.nonVeg.quantity.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm font-medium text-red-600">
                  {formatCurrency(menu.vegNonVeg.nonVeg.revenue)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <span className="text-2xl">🔴</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Selling Items */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Top Selling Items
            </h3>
            <p className="text-sm text-gray-600">
              Best performing menu items by quantity sold
            </p>
          </div>
          <Award className="w-5 h-5 text-gray-400" />
        </div>

        {menu.topItems.length > 0 ? (
          <div className="space-y-3">
            {menu.topItems.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0
                        ? "bg-yellow-500"
                        : index === 1
                        ? "bg-gray-400"
                        : index === 2
                        ? "bg-amber-600"
                        : "bg-gray-300"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.isVeg
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.isVeg ? "🟢 Veg" : "🔴 Non-Veg"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {item.quantity} sold
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(item.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Award className="w-12 h-12 mb-3" />
            <p className="text-sm">
              No item sales data available for this period
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Performance */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Sales by Category
              </h3>
              <p className="text-sm text-gray-600">
                Quantity sold per category
              </p>
            </div>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>

          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="category"
                    stroke="#9ca3af"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="text-sm font-medium text-gray-900">
                              {payload[0].payload.category}
                            </p>
                            <p className="text-sm font-bold text-amber-600">
                              {payload[0].value} items sold
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatCurrency(payload[0].payload.revenue)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="#f59e0b"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {categoryData.map((cat, index) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                      <span className="text-gray-700">{cat.category}</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(cat.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <PieChartIcon className="w-12 h-12 mb-3" />
              <p className="text-sm">
                No category data available for this period
              </p>
            </div>
          )}
        </Card>

        {/* Veg vs Non-Veg Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Veg vs Non-Veg
              </h3>
              <p className="text-sm text-gray-600">Distribution by food type</p>
            </div>
          </div>

          {menu.totalItemsSold > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vegNonVegData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="text-sm font-medium text-gray-900">
                              {payload[0].name}
                            </p>
                            <p className="text-sm font-bold">
                              {payload[0].value} items sold
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatCurrency(payload[0].payload.revenue)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Veg
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {menu.vegNonVeg.veg.quantity}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatCurrency(menu.vegNonVeg.veg.revenue)}
                  </p>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Non-Veg
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {menu.vegNonVeg.nonVeg.quantity}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatCurrency(menu.vegNonVeg.nonVeg.revenue)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <UtensilsCrossed className="w-12 h-12 mb-3" />
              <p className="text-sm">
                No food type data available for this period
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
