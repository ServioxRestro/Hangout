"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Table2,
  TrendingUp,
  Clock,
  ArrowLeft,
  Download,
  DollarSign,
  Award,
  Users,
  Activity,
} from "lucide-react";
import Card from "@/components/admin/Card";
import { formatCurrency } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Period = "7d" | "30d" | "90d" | "1y" | "all";

export default function TablesAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30d");

  const { data: analytics, isLoading, error } = useQuery({
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tables analytics...</p>
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
          <p className="mt-2 text-gray-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const { tables } = analytics;

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
            <h1 className="text-3xl font-bold text-gray-900">Table Analytics</h1>
            <p className="text-gray-600 mt-1">Analyze table utilization, session duration, and table performance</p>
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
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const dataStr = JSON.stringify(analytics.tables, null, 2);
              const dataBlob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `tables-analytics-${period}-${new Date().toISOString()}.json`;
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
              <p className="text-sm text-gray-600 font-medium">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {tables.totalSessions.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-600">
                  All Tables
                </span>
              </div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Table2 className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Active Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {tables.activeSessions}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  Currently Active
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Avg Duration</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {tables.averageSessionDuration}min
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  Per Session
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Utilization</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {tables.totalSessions > 0 ? ((tables.activeSessions / tables.totalSessions) * 100).toFixed(1) : 0}%
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">
                  Current Rate
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performing Tables */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Top Performing Tables</h3>
            <p className="text-sm text-gray-600">Tables by revenue and session count</p>
          </div>
          <Award className="w-5 h-5 text-gray-400" />
        </div>

        {tables.topTables && tables.topTables.length > 0 ? (
          <>
            {/* Table Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {tables.topTables.slice(0, 5).map((table: any, index: number) => (
                <div
                  key={table.tableNumber}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    index === 0
                      ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-400"
                      : index === 1
                      ? "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300"
                      : index === 2
                      ? "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                      index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-amber-600" : "bg-gray-300"
                    }`}>
                      {index + 1}
                    </div>
                    {table.isVegOnly && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                        VEG
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      Table {table.tableNumber}
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(table.revenue)}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      {table.sessions} sessions
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tables.topTables.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="tableNumber"
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Table Number", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  label={{ value: "Revenue", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="text-sm font-medium text-gray-900">
                            Table {payload[0].payload.tableNumber}
                          </p>
                          <p className="text-sm font-bold text-green-600">
                            {formatCurrency(Number(payload[0].value))}
                          </p>
                          <p className="text-xs text-gray-600">
                            {payload[0].payload.sessions} sessions
                          </p>
                          {payload[0].payload.isVegOnly && (
                            <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Veg Only
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Detailed Table Stats */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Table</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Sessions</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg/Session</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.topTables.map((table: any, index: number) => (
                    <tr
                      key={table.tableNumber}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        index < 3 ? "bg-indigo-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                          index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-amber-600" : "bg-gray-300"
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">Table {table.tableNumber}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-bold text-green-600">{formatCurrency(table.revenue)}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {table.sessions}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-gray-700 font-medium">
                          {formatCurrency(table.sessions > 0 ? table.revenue / table.sessions : 0)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {table.isVegOnly ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            🟢 Veg
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            All
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Table2 className="w-12 h-12 mb-3" />
            <p className="text-sm">No table data available for this period</p>
          </div>
        )}
      </Card>

      {/* Session Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Total Sessions</h3>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">{tables.totalSessions}</p>
          <p className="text-xs text-gray-500">All table sessions combined</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Avg Session Duration</h3>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">{tables.averageSessionDuration} min</p>
          <p className="text-xs text-gray-500">Average time per session</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Active Sessions</h3>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">{tables.activeSessions}</p>
          <p className="text-xs text-gray-500">Currently occupied tables</p>
        </Card>
      </div>
    </div>
  );
}
