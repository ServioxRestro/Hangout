"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import { formatCurrency } from "@/lib/constants";
import {
  generateHTMLReceipt,
  printHTMLReceipt,
  calculateBill,
  type BillItem,
} from "@/lib/utils/billing";
import {
  Users,
  Clock,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  X,
  Receipt,
  Utensils,
  CheckCircle,
  Printer,
  Plus,
  Search,
  ChefHat,
} from "lucide-react";
import { getStatusBadgeClass } from "@/lib/utils/kot";

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  status: string;
  kot_number: number | null;
  menu_items: {
    id: string;
    name: string;
    is_veg: boolean;
  } | null;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
};

type TableWithSession = {
  table: Tables<"restaurant_tables">;
  session:
    | (Tables<"table_sessions"> & {
        guest_users?: Tables<"guest_users"> | null;
        orders?: Order[];
      })
    | null;
};

export default function TableSessionsPage() {
  const [tablesData, setTablesData] = useState<TableWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Billing state
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">(
    "cash"
  );
  const [processing, setProcessing] = useState(false);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [billSummary, setBillSummary] = useState<any>(null);

  // Manual items state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [manualItems, setManualItems] = useState<
    Array<{
      id: string;
      menu_item_id: string;
      name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>
  >([]);

  // Order status management
  const [changingOrderStatus, setChangingOrderStatus] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchTablesWithSessions();
    fetchTaxSettings();
    fetchMenuItems();

    // Auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchTablesWithSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTable?.session) {
      calculateBill();
    }
  }, [selectedTable, discountPercentage, manualItems]);

  const fetchTablesWithSessions = async () => {
    try {
      // Fetch all tables
      const { data: tables, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("is_active", true)
        .order("table_number", { ascending: true });

      if (tablesError) throw tablesError;

      if (!tables) {
        setTablesData([]);
        return;
      }

      // Fetch all active sessions with related data
      const { data: sessions, error: sessionsError } = await supabase
        .from("table_sessions")
        .select(
          `
          *,
          guest_users (
            id,
            name,
            phone,
            visit_count,
            total_spent
          ),
          orders (
            id,
            status,
            total_amount,
            created_at,
            order_items (
              id,
              quantity,
              unit_price,
              total_price,
              created_at,
              status,
              kot_number,
              menu_items (
                id,
                name,
                is_veg
              )
            )
          )
        `
        )
        .eq("status", "active");

      if (sessionsError) throw sessionsError;

      // Map tables with their sessions
      const tablesWithSessions: TableWithSession[] = tables.map((table) => {
        const session = sessions?.find((s) => s.table_id === table.id) || null;
        return {
          table,
          session: session as any,
        };
      });

      setTablesData(tablesWithSessions);
    } catch (error: any) {
      console.error("Error fetching tables:", error);
      setError(error.message || "Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

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

  const fetchTaxSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("tax_settings")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setTaxSettings(data || []);
    } catch (error) {
      console.error("Error fetching tax settings:", error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (categoriesError) throw categoriesError;
      setMenuCategories(categoriesData || []);
      if (categoriesData && categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("display_order");

      if (itemsError) throw itemsError;
      setMenuItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const calculateBill = () => {
    if (!selectedTable?.session) return;

    const ordersSubtotal = selectedTable.session.total_amount || 0;
    const manualSubtotal = manualItems.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    const subtotal = ordersSubtotal + manualSubtotal;

    const discountAmount = (subtotal * discountPercentage) / 100;
    const taxableAmount = subtotal - discountAmount;

    const taxes = taxSettings.map((tax) => ({
      name: tax.name,
      rate: tax.rate,
      amount: (taxableAmount * tax.rate) / 100,
    }));

    const taxAmount = taxes.reduce((sum, tax) => sum + tax.amount, 0);
    const finalAmount = taxableAmount + taxAmount;

    setBillSummary({
      subtotal,
      discountPercentage,
      discountAmount,
      taxAmount,
      finalAmount,
      taxes,
    });
  };

  const addManualItem = () => {
    if (!selectedMenuItem || newItemQuantity <= 0) {
      alert("Please select a menu item and quantity");
      return;
    }

    const menuItem = menuItems.find((item) => item.id === selectedMenuItem);
    if (!menuItem) {
      alert("Selected item not found");
      return;
    }

    const manualItem = {
      id: `manual_${Date.now()}`,
      menu_item_id: menuItem.id,
      name: menuItem.name,
      quantity: newItemQuantity,
      unit_price: menuItem.price,
      total_price: newItemQuantity * menuItem.price,
    };

    setManualItems((prev) => [...prev, manualItem]);
    setSelectedMenuItem("");
    setNewItemQuantity(1);
    setItemSearchTerm("");
    setShowAddItemModal(false);
  };

  const removeManualItem = (id: string) => {
    setManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  const getFilteredMenuItems = () => {
    let filtered = menuItems;

    if (selectedCategory) {
      filtered = filtered.filter(
        (item) => item.category_id === selectedCategory
      );
    }

    if (itemSearchTerm.trim()) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const markItemsAsServed = async () => {
    if (!selectedTable?.session?.orders) return;

    setChangingOrderStatus("marking_served");
    try {
      // Get all items that are ready but not served
      const readyItems = selectedTable.session.orders
        .flatMap((order) => order.order_items)
        .filter((item) => item.status === "ready");

      if (readyItems.length === 0) {
        alert("No items are ready to mark as served");
        return;
      }

      const itemIds = readyItems.map((item) => item.id);

      const { error } = await supabase
        .from("order_items")
        .update({ status: "served" })
        .in("id", itemIds);

      if (error) throw error;

      await fetchTablesWithSessions();
    } catch (error: any) {
      console.error("Error marking items as served:", error);
      alert("Failed to mark items as served: " + error.message);
    } finally {
      setChangingOrderStatus(null);
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

  const printBill = async () => {
    if (!selectedTable?.session || !billSummary) return;

    const sessionOrders = selectedTable.session.orders || [];
    const allOrderItems = sessionOrders.flatMap((order) => order.order_items);

    // Prepare bill items for receipt
    const billItems: BillItem[] = [
      ...allOrderItems.map((item) => ({
        name: item.menu_items?.name || "Unknown",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_manual: false,
      })),
      ...manualItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_manual: true,
      })),
    ];

    // Generate HTML receipt using shared utility
    const htmlReceipt = generateHTMLReceipt({
      tableNumber: selectedTable.table.table_number,
      orderType: "dine-in",
      customerName: selectedTable.session.guest_users?.name || "Guest",
      customerPhone: selectedTable.session.customer_phone || undefined,
      items: billItems,
      calculation: {
        subtotal: billSummary.subtotal,
        discount_amount: billSummary.discountAmount,
        taxable_amount: billSummary.taxableAmount,
        taxes: billSummary.taxes,
        tax_amount: billSummary.taxAmount,
        final_amount: billSummary.finalAmount,
      },
      paymentMethod,
      discountPercentage,
    });

    // Print using shared utility
    printHTMLReceipt(htmlReceipt);
  };

  const processPayment = async () => {
    if (!selectedTable?.session || !billSummary) return;

    setProcessing(true);
    try {
      // Get current user
      const response = await fetch("/api/admin/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to verify user");
      const { user } = await response.json();

      // Get all orders in this session
      const sessionOrders = selectedTable.session.orders || [];
      if (sessionOrders.length === 0 && manualItems.length === 0) {
        throw new Error("No orders to bill");
      }

      // Create bill
      const billNumber = `BILL-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-6)}`;

      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert({
          bill_number: billNumber,
          table_session_id: selectedTable.session.id,
          subtotal: billSummary.subtotal,
          discount_percentage: discountPercentage,
          discount_amount: billSummary.discountAmount,
          cgst_rate:
            billSummary.taxes.find((t: any) => t.name.includes("CGST"))?.rate ||
            0,
          cgst_amount:
            billSummary.taxes.find((t: any) => t.name.includes("CGST"))
              ?.amount || 0,
          sgst_rate:
            billSummary.taxes.find((t: any) => t.name.includes("SGST"))?.rate ||
            0,
          sgst_amount:
            billSummary.taxes.find((t: any) => t.name.includes("SGST"))
              ?.amount || 0,
          service_charge_rate:
            billSummary.taxes.find((t: any) => t.name.includes("Service"))
              ?.rate || 0,
          service_charge_amount:
            billSummary.taxes.find((t: any) => t.name.includes("Service"))
              ?.amount || 0,
          total_tax_amount: billSummary.taxAmount,
          final_amount: billSummary.finalAmount,
          payment_status: "paid",
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          payment_received_by: user.id,
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill items from all order items
      const allOrderItems = sessionOrders.flatMap((order) =>
        order.order_items.map((item) => ({
          bill_id: billData.id,
          order_item_id: item.id,
          item_name: item.menu_items?.name || "Unknown Item",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))
      );

      // Add manual items to bill
      const manualBillItems = manualItems.map((item) => ({
        bill_id: billData.id,
        order_item_id: null,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const allBillItems = [...allOrderItems, ...manualBillItems];

      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(allBillItems);

      if (itemsError) throw itemsError;

      // Update all orders to paid
      const orderIds = sessionOrders.map((o) => o.id);
      const { error: ordersError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .in("id", orderIds);

      if (ordersError) throw ordersError;

      // Complete the session
      await supabase
        .from("table_sessions")
        .update({
          status: "completed",
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          session_ended_at: new Date().toISOString(),
        })
        .eq("id", selectedTable.session.id);

      // Success - close modals, reset state and refresh
      setShowBillingModal(false);
      setShowDetailsModal(false);
      setSelectedTable(null);
      setDiscountPercentage(0);
      setManualItems([]);
      await fetchTablesWithSessions();

      alert(
        `✅ Payment processed successfully!\nBill: ${billNumber}\nAmount: ${formatCurrency(
          billSummary.finalAmount
        )}`
      );
    } catch (error: any) {
      console.error("Error processing payment:", error);
      alert("Error processing payment: " + error.message);
    } finally {
      setProcessing(false);
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

      if (error) throw error;

      setShowDetailsModal(false);
      setSelectedTable(null);
      await fetchTablesWithSessions();
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

  return (
    <div>
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
          onClick={fetchTablesWithSessions}
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

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tablesData.map((tableData) => {
          const status = getTableStatus(tableData);
          const colors = getTableColor(status);

          return (
            <button
              key={tableData.table.id}
              onClick={() => {
                if (tableData.session) {
                  setSelectedTable(tableData);
                  setShowDetailsModal(true);
                }
              }}
              className={`${colors.bg} ${colors.text} ${colors.border} border-2 rounded-xl p-6 transition-all transform hover:scale-105 cursor-pointer shadow-lg relative`}
            >
              {/* Table Number */}
              <div className="text-center mb-3">
                <div className="text-4xl font-bold mb-1">
                  {tableData.table.table_number}
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
                    <DollarSign className="w-3 h-3" />
                    <span>
                      {formatCurrency(tableData.session.total_amount || 0)}
                    </span>
                  </div>
                  {tableData.session.orders &&
                    tableData.session.orders.length > 0 && (
                      <div className="flex items-center justify-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        <span>
                          {tableData.session.orders.length} order
                          {tableData.session.orders.length > 1 ? "s" : ""}
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

      {/* Details Modal */}
      {showDetailsModal && selectedTable && selectedTable.session && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Table {selectedTable.table.table_number}
                  </h2>
                  <p className="text-gray-600">Session Details</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Session Info */}
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Customer</div>
                      <div className="font-medium text-gray-900">
                        {selectedTable.session.guest_users?.name || "Guest"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedTable.session.customer_phone}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Duration</div>
                      <div className="font-medium text-gray-900">
                        {formatDuration(
                          selectedTable.session.session_started_at ||
                            selectedTable.session.created_at ||
                            ""
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Orders</div>
                      <div className="font-medium text-gray-900">
                        {selectedTable.session.orders?.length || 0}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        Total Amount
                      </div>
                      <div className="font-medium text-green-600 text-lg">
                        {formatCurrency(
                          selectedTable.session.total_amount || 0
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guest Info */}
                {selectedTable.session.guest_users && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-900 mb-2">
                      Guest Information
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-blue-600">Visit Count</div>
                        <div className="font-medium text-blue-900">
                          {selectedTable.session.guest_users.visit_count}x
                        </div>
                      </div>
                      <div>
                        <div className="text-blue-600">Lifetime Spent</div>
                        <div className="font-medium text-blue-900">
                          {formatCurrency(
                            selectedTable.session.guest_users.total_spent || 0
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items with Status */}
                {selectedTable.session.orders &&
                  selectedTable.session.orders.length > 0 && (
                    <div className="border border-gray-200 rounded-lg">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          Order Items
                        </h3>
                        {selectedTable.session.orders.some((order) =>
                          order.order_items.some((item) => item.status === "ready")
                        ) && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={markItemsAsServed}
                            disabled={changingOrderStatus === "marking_served"}
                            leftIcon={<Utensils className="w-4 h-4" />}
                          >
                            {changingOrderStatus === "marking_served"
                              ? "Marking..."
                              : "Mark Ready Items as Served"}
                          </Button>
                        )}
                      </div>
                      <div className="p-4 max-h-60 overflow-y-auto">
                        {selectedTable.session.orders
                          .flatMap((order) =>
                            order.order_items.sort(
                              (a, b) =>
                                new Date(a.created_at).getTime() -
                                new Date(b.created_at).getTime()
                            )
                          )
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-medium">
                                  {item.quantity}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {item.menu_items?.name || "Unknown"}
                                    </span>
                                    {item.menu_items?.is_veg && (
                                      <span className="text-green-600 text-xs">
                                        🟢
                                      </span>
                                    )}
                                    {item.menu_items?.is_veg === false && (
                                      <span className="text-red-600 text-xs">
                                        🔴
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="text-xs text-gray-500">
                                      Added at{" "}
                                      {new Date(
                                        item.created_at
                                      ).toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      {item.kot_number && ` • KOT #${item.kot_number}`}
                                    </div>
                                    {item.status && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeClass(item.status)}`}>
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(item.total_price)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Manual Items Section */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      Additional Items
                    </h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAddItemModal(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Add Item
                    </Button>
                  </div>
                  {manualItems.length > 0 ? (
                    <div className="p-4 space-y-2">
                      {manualItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">
                                {item.name}
                              </span>
                              <div className="text-xs text-amber-600">
                                Manual entry
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(item.total_price)}
                            </span>
                            <button
                              onClick={() => removeManualItem(item.id)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No additional items added
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                {getTableStatus(selectedTable) === "ready-to-bill" ? (
                  <Button
                    variant="primary"
                    onClick={() => setShowBillingModal(true)}
                    className="flex-1"
                    leftIcon={<DollarSign className="w-4 h-4" />}
                  >
                    Process Bill
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    onClick={() => endSession(selectedTable.session!.id)}
                    className="flex-1"
                  >
                    End Session
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Modal */}
      {showBillingModal &&
        selectedTable &&
        selectedTable.session &&
        billSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Process Payment
                    </h2>
                    <p className="text-gray-600">
                      Table {selectedTable.table.table_number}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBillingModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Bill Summary */}
                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        {formatCurrency(billSummary.subtotal)}
                      </span>
                    </div>

                    {/* Discount Input */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercentage}
                          onChange={(e) =>
                            setDiscountPercentage(
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 px-2 py-1 border rounded text-center text-sm"
                        />
                        <span>%</span>
                        <span className="font-medium w-20 text-right">
                          -{formatCurrency(billSummary.discountAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Taxes */}
                    {billSummary.taxes.map((tax: any) => (
                      <div
                        key={tax.name}
                        className="flex justify-between text-sm text-gray-600"
                      >
                        <span>
                          {tax.name} ({tax.rate}%):
                        </span>
                        <span>{formatCurrency(tax.amount)}</span>
                      </div>
                    ))}

                    {/* Final Total */}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-green-600">
                          {formatCurrency(billSummary.finalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h3 className="font-medium mb-3 text-gray-900">
                      Payment Method
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(["cash", "upi", "card"] as const).map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`p-3 text-center border-2 rounded-lg transition-all ${
                            paymentMethod === method
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-2xl mb-1">
                            {method === "cash"
                              ? "💵"
                              : method === "upi"
                              ? "📱"
                              : "💳"}
                          </div>
                          <div className="text-xs font-medium capitalize">
                            {method}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={printBill}
                    leftIcon={<Printer className="w-4 h-4" />}
                    disabled={processing}
                  >
                    Print
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowBillingModal(false)}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={processPayment}
                    className="flex-1"
                    disabled={processing}
                    leftIcon={
                      processing ? undefined : (
                        <CheckCircle className="w-4 h-4" />
                      )
                    }
                  >
                    {processing ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </div>
                    ) : (
                      `Pay ${formatCurrency(billSummary.finalAmount)}`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Add Manual Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Add Manual Item
                  </h2>
                  <p className="text-gray-600">
                    Items ordered outside the system
                  </p>
                </div>
                <button
                  onClick={() => setShowAddItemModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {menuCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === category.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6 max-h-96 overflow-y-auto">
                {getFilteredMenuItems().map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMenuItem(item.id)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedMenuItem === item.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm">
                        {item.name}
                      </span>
                      {item.is_veg && <span className="text-xs">🟢</span>}
                      {item.is_veg === false && (
                        <span className="text-xs">🔴</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(item.price)}
                    </div>
                  </button>
                ))}
              </div>

              {/* Quantity */}
              {selectedMenuItem && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {menuItems.find((i) => i.id === selectedMenuItem)?.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(
                          menuItems.find((i) => i.id === selectedMenuItem)
                            ?.price || 0
                        )}{" "}
                        each
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setNewItemQuantity(Math.max(1, newItemQuantity - 1))
                        }
                        className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="text-lg font-semibold w-8 text-center">
                        {newItemQuantity}
                      </span>
                      <button
                        onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                        className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(
                          (menuItems.find((i) => i.id === selectedMenuItem)
                            ?.price || 0) * newItemQuantity
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddItemModal(false);
                    setSelectedMenuItem("");
                    setNewItemQuantity(1);
                    setItemSearchTerm("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={addManualItem}
                  className="flex-1"
                  disabled={!selectedMenuItem || newItemQuantity <= 0}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Item
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
