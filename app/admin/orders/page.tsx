"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Card from "@/components/admin/Card";
import { formatCurrency } from "@/lib/constants";
import { Clock, Users, ShoppingBag, TrendingUp } from "lucide-react";

type OrderStats = {
  totalActive: number;
  totalDineIn: number;
  totalTakeaway: number;
  totalRevenue: number;
  averageOrderValue: number;
};

type KOTSummary = {
  kotNumber: number;
  tableNumber: string | null;
  orderType: string;
  itemCount: number;
  status: string;
  createdAt: string;
  age: number;
};

export default function OrdersOverviewPage() {
  const [stats, setStats] = useState<OrderStats>({
    totalActive: 0,
    totalDineIn: 0,
    totalTakeaway: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  });
  const [kots, setKots] = useState<KOTSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch active orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_type, total_amount, status")
        .in("status", ["placed", "preparing", "ready", "served"]);

      if (ordersError) throw ordersError;

      // Calculate stats
      const dineIn = orders?.filter((o) => o.order_type === "dine-in") || [];
      const takeaway = orders?.filter((o) => o.order_type === "takeaway") || [];
      const totalRevenue =
        orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      setStats({
        totalActive: orders?.length || 0,
        totalDineIn: dineIn.length,
        totalTakeaway: takeaway.length,
        totalRevenue,
        averageOrderValue: orders?.length ? totalRevenue / orders.length : 0,
      });

      // Fetch KOT summary
      const { data: kotItems, error: kotError } = await supabase
        .from("order_items")
        .select(
          `
          kot_number,
          kot_batch_id,
          status,
          created_at,
          orders (
            order_type,
            restaurant_tables (
              table_number
            )
          )
        `
        )
        .not("kot_number", "is", null)
        .in("status", ["placed", "preparing", "ready"])
        .order("kot_number", { ascending: true });

      if (kotError) throw kotError;

      // Group by KOT batch
      const kotMap = new Map<string, KOTSummary>();
      kotItems?.forEach((item: any) => {
        const batchId = item.kot_batch_id;
        if (!batchId) return;

        if (!kotMap.has(batchId)) {
          kotMap.set(batchId, {
            kotNumber: item.kot_number,
            tableNumber: item.orders?.restaurant_tables?.table_number || null,
            orderType: item.orders?.order_type || "dine-in",
            itemCount: 0,
            status: item.status,
            createdAt: item.created_at,
            age: Math.floor(
              (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60)
            ),
          });
        }

        const kot = kotMap.get(batchId)!;
        kot.itemCount++;

        // Update status (use highest priority status)
        const statusPriority = { placed: 3, preparing: 2, ready: 1 };
        const currentPriority =
          statusPriority[kot.status as keyof typeof statusPriority] || 3;
        const newPriority =
          statusPriority[item.status as keyof typeof statusPriority] || 3;
        if (newPriority < currentPriority) {
          kot.status = item.status;
        }
      });

      setKots(Array.from(kotMap.values()));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "placed":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading orders overview...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders Overview</h1>
        <p className="text-gray-600 mt-1">
          Real-time summary of active orders across the restaurant
        </p>
      </div>

      {/* Active KOTs */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active KOTs in Kitchen
          </h2>

          {kots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active KOTs in kitchen
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      KOT #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Table
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Age
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {kots.map((kot) => (
                    <tr
                      key={kot.kotNumber}
                      className={kot.age > 15 ? "bg-red-50" : ""}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-blue-600">
                          #{kot.kotNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {kot.orderType === "dine-in" ? (
                          <span className="text-sm text-gray-700">Dine-In</span>
                        ) : (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                            Takeaway
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {kot.tableNumber || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {kot.itemCount} {kot.itemCount === 1 ? "item" : "items"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                            kot.status
                          )}`}
                        >
                          {kot.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span
                            className={
                              kot.age > 15
                                ? "text-red-600 font-medium"
                                : "text-gray-600"
                            }
                          >
                            {kot.age} min
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-4 text-sm text-gray-500">
        <p>
          <strong>Note:</strong> Use <strong>/admin/kitchen</strong> for kitchen
          operations (KOT management). Use{" "}
          <strong>/admin/tables/sessions</strong> for table management and
          marking items as served.
        </p>
      </div>
    </div>
  );
}
