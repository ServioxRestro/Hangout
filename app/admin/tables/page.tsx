"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Button from "@/components/admin/Button";
import { formatCurrency } from "@/lib/constants";
import {
  Clock,
  IndianRupee,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  useTableSessions,
  useMarkItemsAsServed,
  type TableWithSession,
} from "@/hooks/useTableSessions";
import { TableDetailPanel } from "@/components/admin/tables/TableDetailPanel";

export default function TableSessionsPage() {
  // Use custom hook for data management (React Query with auto-refresh)
  const {
    data: tablesData = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useTableSessions();
  const markServedMutation = useMarkItemsAsServed();

  const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(
    null
  );
  const [showPanel, setShowPanel] = useState(false);
  const [changingOrderStatus, setChangingOrderStatus] = useState<string | null>(
    null
  );

  const error = queryError ? (queryError as any).message : "";

  // Sync selectedTable with fresh data after tablesData updates
  useEffect(() => {
    if (selectedTable && showPanel) {
      const updatedTable = tablesData.find(
        (t) => t.table.id === selectedTable.table.id
      );
      if (updatedTable) {
        setSelectedTable(updatedTable);
      }
    }
  }, [tablesData, showPanel, selectedTable]);

  const getTableStatus = (
    tableData: TableWithSession
  ): "available" | "active" | "ready-to-bill" => {
    if (!tableData.session) return "available";

    // Check if any order is in 'served' status (ready to bill)
    const hasServedOrder = tableData.session.orders?.some(
      (o) => o.status === "served"
    );
    if (hasServedOrder) return "ready-to-bill";

    return "active";
  };

  const getTableColor = (status: "available" | "active" | "ready-to-bill") => {
    switch (status) {
      case "available":
        return {
          bg: "bg-blue-500 hover:bg-blue-600",
          text: "text-white",
          border: "border-blue-600",
          icon: "text-blue-100",
        };
      case "active":
        return {
          bg: "bg-green-500 hover:bg-green-600",
          text: "text-white",
          border: "border-green-600",
          icon: "text-green-100",
        };
      case "ready-to-bill":
        return {
          bg: "bg-gray-900 hover:bg-black",
          text: "text-white",
          border: "border-gray-950",
          icon: "text-gray-300",
        };
    }
  };

  const handleMarkItemsAsServed = async (table: TableWithSession) => {
    if (!table?.session?.orders) return;

    setChangingOrderStatus("marking_served");
    try {
      await markServedMutation.mutateAsync(table.session.orders);
      // No need to manually refetch - mutation will auto-invalidate queries
    } catch (error: any) {
      console.error("Error marking items as served:", error);
      alert("Failed to mark items as served: " + error.message);
    } finally {
      setChangingOrderStatus(null);
    }
  };

  const handlePaymentComplete = async () => {
    setShowPanel(false);
    setSelectedTable(null);
    // No need to manually refetch - React Query will auto-update
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("table_sessions")
        .update({
          status: "completed",
          session_ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;

      setShowPanel(false);
      setSelectedTable(null);
      // React Query will auto-update the tables list
    } catch (error: any) {
      console.error("Error ending session:", error);
      alert("Failed to end session: " + error.message);
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading tables...</div>
        </div>
      </div>
    );
  }

  const availableTables = tablesData.filter(
    (t) => getTableStatus(t) === "available"
  );
  const activeTables = tablesData.filter((t) => getTableStatus(t) === "active");
  const readyToBillTables = tablesData.filter(
    (t) => getTableStatus(t) === "ready-to-bill"
  );

  // Group tables by type (regular vs veg-only)
  const regularTables = tablesData.filter((t) => !t.table.veg_only);
  const vegOnlyTables = tablesData.filter((t) => t.table.veg_only);

  return (
    <div className="flex gap-6">
      {/* Left Section - Tables Grid */}
      <div
        className={`flex-1 transition-all duration-300 ${
          showPanel ? "lg:mr-0" : ""
        }`}
      >
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Table Overview</h1>
            <p className="text-gray-600 mt-1">
              Real-time table status and session management
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
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

        {/* Legend */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-700">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700">Active (Dining)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-900 rounded"></div>
              <span className="text-sm text-gray-700">Ready to Bill</span>
            </div>
          </div>
        </div>

        {/* Tables Grid - Grouped by Type */}
        <div className="space-y-6">
          {/* Regular Tables Section */}
          {regularTables.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <h2 className="text-lg font-semibold text-gray-900">
                  Regular Tables
                </h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {regularTables.length}
                </span>
              </div>
              <div
                className={`grid gap-4 ${
                  showPanel
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                }`}
              >
                {regularTables.map((tableData) => {
                  const status = getTableStatus(tableData);
                  const colors = getTableColor(status);
                  const displayNumber = tableData.table.table_number.toString();

                  return (
                    <button
                      key={tableData.table.id}
                      onClick={() => {
                        if (tableData.session) {
                          setSelectedTable(tableData);
                          setShowPanel(true);
                        }
                      }}
                      className={`${colors.bg} ${colors.text} ${colors.border} border-2 rounded-xl p-6 transition-all transform hover:scale-105 cursor-pointer shadow-lg relative`}
                    >
                      {/* Table Number */}
                      <div className="text-center mb-3">
                        <div className="text-4xl font-bold mb-1">
                          {displayNumber}
                        </div>
                        <div className={`text-xs font-medium ${colors.icon}`}>
                          {status === "available" && "Available"}
                          {status === "active" && "Occupied"}
                          {status === "ready-to-bill" && "Ready to Bill"}
                        </div>
                      </div>

                      {/* Session Info (if active) */}
                      {tableData.session && (
                        <div className={`text-xs space-y-1 ${colors.icon}`}>
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDuration(
                                tableData.session.session_started_at ||
                                  tableData.session.created_at ||
                                  ""
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            <span>
                              {formatCurrency(
                                tableData.session.total_amount || 0
                              )}
                            </span>
                          </div>
                          {tableData.session.orders &&
                            tableData.session.orders.length > 0 && (
                              <div className="flex items-center justify-center gap-1">
                                <ShoppingCart className="w-3 h-3" />
                                <span>
                                  {tableData.session.orders.length} order
                                  {tableData.session.orders.length > 1
                                    ? "s"
                                    : ""}
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                      {/* Pulse animation for ready to bill */}
                      {status === "ready-to-bill" && (
                        <div className="absolute -top-1 -right-1">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Veg-Only Tables Section */}
          {vegOnlyTables.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <h2 className="text-lg font-semibold text-gray-900">
                  Veg-Only Tables
                </h2>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {vegOnlyTables.length}
                </span>
              </div>
              <div
                className={`grid gap-4 ${
                  showPanel
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                }`}
              >
                {vegOnlyTables.map((tableData) => {
                  const status = getTableStatus(tableData);
                  const colors = getTableColor(status);
                  const displayNumber = `V${tableData.table.table_number}`;

                  return (
                    <button
                      key={tableData.table.id}
                      onClick={() => {
                        if (tableData.session) {
                          setSelectedTable(tableData);
                          setShowPanel(true);
                        }
                      }}
                      className={`${colors.bg} ${colors.text} ${colors.border} border-2 rounded-xl p-6 transition-all transform hover:scale-105 cursor-pointer shadow-lg relative`}
                    >
                      {/* Veg-Only Indicator */}
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        🟢 Veg
                      </div>

                      {/* Table Number */}
                      <div className="text-center mb-3">
                        <div className="text-4xl font-bold mb-1">
                          {displayNumber}
                        </div>
                        <div className={`text-xs font-medium ${colors.icon}`}>
                          {status === "available" && "Available"}
                          {status === "active" && "Occupied"}
                          {status === "ready-to-bill" && "Ready to Bill"}
                        </div>
                      </div>

                      {/* Session Info (if active) */}
                      {tableData.session && (
                        <div className={`text-xs space-y-1 ${colors.icon}`}>
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDuration(
                                tableData.session.session_started_at ||
                                  tableData.session.created_at ||
                                  ""
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            <span>
                              {formatCurrency(
                                tableData.session.total_amount || 0
                              )}
                            </span>
                          </div>
                          {tableData.session.orders &&
                            tableData.session.orders.length > 0 && (
                              <div className="flex items-center justify-center gap-1">
                                <ShoppingCart className="w-3 h-3" />
                                <span>
                                  {tableData.session.orders.length} order
                                  {tableData.session.orders.length > 1
                                    ? "s"
                                    : ""}
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                      {/* Pulse animation for ready to bill */}
                      {status === "ready-to-bill" && (
                        <div className="absolute -top-1 -right-1">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Table Detail Panel (Inline) */}
      {showPanel && selectedTable && selectedTable.session && (
        <div className="hidden lg:block w-96 flex-shrink-0">
          <TableDetailPanel
            table={selectedTable}
            onClose={() => {
              setShowPanel(false);
              setSelectedTable(null);
            }}
            onMarkItemsAsServed={handleMarkItemsAsServed}
            onEndSession={handleEndSession}
            onPaymentComplete={handlePaymentComplete}
            changingOrderStatus={changingOrderStatus}
          />
        </div>
      )}
    </div>
  );
}
