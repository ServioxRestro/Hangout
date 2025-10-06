"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import { formatCurrency } from "@/lib/constants";
import {
  Users,
  Clock,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

type TableSession = Tables<"table_sessions"> & {
  restaurant_tables: Tables<"restaurant_tables"> | null;
  guest_users?: Tables<"guest_users"> | null;
};

export default function TableSessionsPage() {
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSessions();

    // Set up auto-refresh every 30 seconds to catch session completions
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("table_sessions")
        .select(
          `
          *,
          restaurant_tables (*),
          guest_users (
            id,
            name,
            phone,
            visit_count,
            total_orders,
            total_spent
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setSessions((data as TableSession[]) || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      setError(error.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200";
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatDuration = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("table_sessions")
        .update({
          status: "completed",
          session_ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        throw new Error(error.message);
      }

      await fetchSessions();
    } catch (error: any) {
      console.error("Error ending session:", error);
      alert("Failed to end session: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading sessions...</div>
        </div>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Table Sessions</h1>
          <p className="text-gray-600 mt-1">
            Monitor active dining sessions and table occupancy. Sessions
            automatically complete when all orders are finished.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchSessions}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {activeSessions.length}
                </div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {activeSessions.reduce(
                    (sum, s) => sum + (s.total_orders || 0),
                    0
                  )}
                </div>
                <div className="text-sm text-gray-600">Active Orders</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    activeSessions.reduce(
                      (sum, s) => sum + (s.total_amount || 0),
                      0
                    )
                  )}
                </div>
                <div className="text-sm text-gray-600">Active Revenue</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Sessions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Active Sessions
        </h2>
        {activeSessions.length === 0 ? (
          <Card>
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Active Sessions
              </h3>
              <p className="text-gray-600">
                All tables are currently available
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeSessions.map((session) => (
              <Card key={session.id}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-lg">
                        Table {session.restaurant_tables?.table_number}
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </div>
                    </div>
                    {getStatusIcon(session.status)}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <div className="flex flex-col">
                        <span>
                          {session.customer_phone ||
                            session.customer_email ||
                            "N/A"}
                        </span>
                        {session.guest_users && (
                          <span className="text-xs text-blue-600">
                            {session.guest_users.visit_count}x visitor •{" "}
                            {session.guest_users.total_orders} total orders
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatDuration(
                          session.session_started_at || session.created_at || ""
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ShoppingCart className="w-4 h-4" />
                      <span>{session.total_orders || 0} orders (session)</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatCurrency(session.total_amount || 0)}</span>
                      {session.guest_users && (
                        <span className="text-xs text-gray-500">
                          (
                          {formatCurrency(session.guest_users.total_spent || 0)}{" "}
                          lifetime)
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => endSession(session.id)}
                    className="w-full"
                  >
                    End Session
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Completed Sessions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Completed Sessions
        </h2>
        {completedSessions.length === 0 ? (
          <Card>
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Completed Sessions
              </h3>
              <p className="text-gray-600">
                Completed sessions will appear here
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedSessions.slice(0, 10).map((session) => (
                    <tr key={session.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Table {session.restaurant_tables?.table_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.customer_phone ||
                          session.customer_email ||
                          "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDuration(
                          session.session_started_at ||
                            session.created_at ||
                            "",
                          session.session_ended_at
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.total_orders || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(session.total_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
