"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  UserCheck,
  ArrowLeft,
  Download,
  TrendingUp,
  DollarSign,
  Award,
} from "lucide-react";
import Card from "@/components/admin/Card";
import { formatCurrency } from "@/lib/constants";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCustomerAnalytics, type Period } from "@/hooks/useAnalytics";

export default function CustomerAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30d");

  const {
    data: analytics,
    isLoading,
    error,
  } = useCustomerAnalytics({ period });

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer analytics...</p>
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

  const { customers, overview } = analytics;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/analytics")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Insights
            </h1>
            <p className="text-gray-600 mt-1">
              Understand customer behavior, retention, and top spenders
            </p>
          </div>
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
                    ? "bg-purple-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const dataStr = JSON.stringify(analytics.customers, null, 2);
              const dataBlob = new Blob([dataStr], {
                type: "application/json",
              });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `customer-analytics-${period}-${new Date().toISOString()}.json`;
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Total Customers
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {customers.total.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">
                  Unique Guests
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
              <p className="text-sm text-gray-600 font-medium">New Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {customers.new.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <UserPlus className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  First Visit
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Returning Customers
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {customers.returning.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  2+ Visits
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Avg Spend</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(customers.averageSpend)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-600">
                  Per Customer
                </span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Customer Acquisition Trend */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Customer Acquisition
            </h3>
            <p className="text-sm text-gray-600">New customers over time</p>
          </div>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>

        {customers.trend && customers.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={customers.trend}>
              <defs>
                <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(
                            payload[0].payload.date
                          ).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-bold text-purple-600">
                          {payload[0].value} new customers
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#9333ea"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCustomers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <TrendingUp className="w-12 h-12 mb-3" />
            <p className="text-sm">
              No customer acquisition data available for this period
            </p>
          </div>
        )}
      </Card>

      {/* Top Customers */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Top Customers</h3>
            <p className="text-sm text-gray-600">Highest spending customers</p>
          </div>
          <Award className="w-5 h-5 text-gray-400" />
        </div>

        {customers.topCustomers && customers.topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Phone
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Total Spent
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                    Orders
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                    Visits
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Avg Order
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.topCustomers.map((customer: any, index: number) => (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index < 3 ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
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
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">
                        {customer.phone}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(customer.totalSpent)}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {customer.totalOrders}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {customer.visitCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="text-gray-700 font-medium">
                        {formatCurrency(
                          customer.totalOrders > 0
                            ? customer.totalSpent / customer.totalOrders
                            : 0
                        )}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Award className="w-12 h-12 mb-3" />
            <p className="text-sm">
              No customer data available for this period
            </p>
          </div>
        )}
      </Card>

      {/* Customer Retention Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Customer Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">New Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customers.new}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Percentage</p>
                <p className="text-lg font-bold text-green-600">
                  {customers.total > 0
                    ? ((customers.new / customers.total) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Returning Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customers.returning}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Percentage</p>
                <p className="text-lg font-bold text-blue-600">
                  {customers.total > 0
                    ? ((customers.returning / customers.total) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Customer Insights
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Average Spend Per Customer
                </span>
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(customers.averageSpend)}
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Retention Rate</span>
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {customers.total > 0
                  ? ((customers.returning / customers.total) * 100).toFixed(1)
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Customers with 2+ visits
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
