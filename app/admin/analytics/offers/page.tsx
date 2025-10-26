"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Gift,
  TrendingUp,
  Tag,
  ArrowLeft,
  Download,
  DollarSign,
  Award,
  Percent,
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

type Period = "7d" | "30d" | "90d" | "1y" | "all";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function OffersAnalyticsPage() {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offers analytics...</p>
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

  const { offers } = analytics;

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
            <h1 className="text-3xl font-bold text-gray-900">Offers Performance</h1>
            <p className="text-gray-600 mt-1">Track offer usage, discounts given, and promotion effectiveness</p>
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
                    ? "bg-pink-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const dataStr = JSON.stringify(analytics.offers, null, 2);
              const dataBlob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `offers-analytics-${period}-${new Date().toISOString()}.json`;
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
              <p className="text-sm text-gray-600 font-medium">Total Offers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {offers.totalOffers}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Tag className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-medium text-pink-600">
                  All Offers
                </span>
              </div>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg">
              <Gift className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Active Offers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {offers.activeOffers}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  Currently Active
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Usage</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {offers.totalUsage.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Award className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  Times Used
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Discount</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(offers.totalDiscount)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Percent className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  Given Away
                </span>
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performing Offers */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Top Performing Offers</h3>
            <p className="text-sm text-gray-600">Most used offers by customers</p>
          </div>
          <Award className="w-5 h-5 text-gray-400" />
        </div>

        {offers.topOffers && offers.topOffers.length > 0 ? (
          <>
            <div className="space-y-3 mb-6">
              {offers.topOffers.slice(0, 5).map((offer: any, index: number) => (
                <div
                  key={offer.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-amber-600" : "bg-gray-300"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{offer.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          offer.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {offer.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{offer.type?.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{offer.usageCount} uses</p>
                    <p className="text-sm text-red-600 font-medium">-{formatCurrency(offer.totalDiscount)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Offer Usage Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={offers.topOffers.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {payload[0].payload.name}
                          </p>
                          <p className="text-sm font-bold text-blue-600">
                            {payload[0].value} uses
                          </p>
                          <p className="text-xs text-red-600">
                            Discount: {formatCurrency(payload[0].payload.totalDiscount)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="usageCount" fill="#ec4899" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Gift className="w-12 h-12 mb-3" />
            <p className="text-sm">No offer usage data available for this period</p>
          </div>
        )}
      </Card>

      {/* Offer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Offer Status Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Offer Status</h3>
              <p className="text-sm text-gray-600">Active vs Inactive offers</p>
            </div>
          </div>

          {offers.totalOffers > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Active", value: offers.activeOffers },
                      { name: "Inactive", value: offers.totalOffers - offers.activeOffers },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#9ca3af" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{offers.activeOffers}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                    <span className="text-sm font-medium text-gray-700">Inactive</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{offers.totalOffers - offers.activeOffers}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Tag className="w-12 h-12 mb-3" />
              <p className="text-sm">No offers created yet</p>
            </div>
          )}
        </Card>

        {/* Offer Impact */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Offer Impact Summary</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Average Usage Per Offer</span>
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {offers.totalOffers > 0 ? (offers.totalUsage / offers.totalOffers).toFixed(1) : 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Times used per offer</p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Average Discount Per Use</span>
                <Percent className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(offers.totalUsage > 0 ? offers.totalDiscount / offers.totalUsage : 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per redemption</p>
            </div>

            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Activation Rate</span>
                <TrendingUp className="w-5 h-5 text-pink-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {offers.totalOffers > 0 ? ((offers.activeOffers / offers.totalOffers) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Active offers ratio</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
