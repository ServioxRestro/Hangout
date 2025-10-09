"use client";

import { useState, useEffect } from "react";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import { formatCurrency } from "@/lib/constants";
import {
  CheckCircle,
  RefreshCw,
  ShoppingBag,
  Plus,
  Trash2,
  Receipt,
  AlertCircle,
  Search,
  Printer,
} from "lucide-react";
import {
  useBilling,
  type OrderWithDetails,
  type SessionGroup,
} from "@/hooks/useBilling";
import { AddManualItemModal } from "@/components/admin/tables/AddManualItemModal";
import { PaymentModal } from "@/components/admin/billing/PaymentModal";
import { supabase } from "@/lib/supabase/client";
import {
  generateHTMLReceipt,
  printHTMLReceipt,
  type BillItem,
} from "@/lib/utils/billing";

interface ManualItem {
  id: string;
  name: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function BillingPage() {
  // Use custom hook for data management
  const {
    orders,
    sessionGroups,
    takeawayOrders,
    loading,
    error,
    taxSettings,
    fetchOrders,
    fetchTaxSettings,
  } = useBilling();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [billSummary, setBillSummary] = useState<any>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedMenuItem, setSelectedMenuItem] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchMenuData();
  }, []);

  useEffect(() => {
    calculateBillSummary();
  }, [selectedOrders, manualItems, discountPercentage, taxSettings]);

  const fetchData = async () => {
    await Promise.all([fetchOrders(), fetchTaxSettings()]);
  };

  const fetchMenuData = async () => {
    try {
      const [{ data: items }, { data: categories }] = await Promise.all([
        supabase.from("menu_items").select("*").eq("is_available", true),
        supabase.from("menu_categories").select("*").eq("is_active", true).order("display_order"),
      ]);
      setMenuItems(items || []);
      setMenuCategories(categories || []);
      if (categories && categories.length > 0) {
        setSelectedCategory(categories[0].id);
      }
    } catch (error) {
      console.error("Error fetching menu:", error);
    }
  };

  const calculateBillSummary = () => {
    if (selectedOrders.length === 0 && manualItems.length === 0) {
      setBillSummary(null);
      return;
    }

    const selectedOrdersData = orders.filter((o) =>
      selectedOrders.includes(o.id)
    );
    const ordersSubtotal = selectedOrdersData.reduce(
      (sum, order) => sum + order.total_amount,
      0
    );
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

  const getFilteredMenuItems = () => {
    return menuItems.filter((item) => {
      const matchesSearch =
        !itemSearchTerm ||
        item.name.toLowerCase().includes(itemSearchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategory || item.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const addManualItem = () => {
    const item = menuItems.find((i) => i.id === selectedMenuItem);
    if (!item) return;

    const manualItem: ManualItem = {
      id: crypto.randomUUID(),
      name: item.name,
      menu_item_id: item.id,
      quantity: newItemQuantity,
      unit_price: item.price,
      total_price: item.price * newItemQuantity,
    };

    setManualItems((prev) => [...prev, manualItem]);
    setShowAddItemModal(false);
    setSelectedMenuItem("");
    setNewItemQuantity(1);
    setItemSearchTerm("");
  };

  const handleAddManualItem = (item: {
    id: string;
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }) => {
    setManualItems((prev) => [...prev, item]);
  };

  const removeManualItem = (id: string) => {
    setManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleSessionSelection = (
    sessionId: string,
    orders: OrderWithDetails[]
  ) => {
    const sessionOrderIds = orders.map((o) => o.id);
    const allSelected = sessionOrderIds.every((id) =>
      selectedOrders.includes(id)
    );

    if (allSelected) {
      // Deselect all orders in this session
      setSelectedOrders((prev) =>
        prev.filter((id) => !sessionOrderIds.includes(id))
      );
    } else {
      // Select all orders in this session
      setSelectedOrders((prev) => [...new Set([...prev, ...sessionOrderIds])]);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const getSessionDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const processPayment = async () => {
    if (!billSummary || selectedOrders.length === 0) return;

    setProcessing(true);
    try {
      // Get current user
      const response = await fetch("/api/admin/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to verify user");
      const { user } = await response.json();

      // Get session IDs from selected orders
      const selectedOrdersData = orders.filter((order) =>
        selectedOrders.includes(order.id)
      );
      const sessionIds = [
        ...new Set(
          selectedOrdersData
            .map((order) => order.table_session_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      // If all orders are from same session, link bill to that session
      const billSessionId = sessionIds.length === 1 ? sessionIds[0] : null;

      // Create bill
      const billNumber = `BILL-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-6)}`;

      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert({
          bill_number: billNumber,
          table_session_id: billSessionId, // Link to session if all orders from same session
          subtotal: billSummary.subtotal,
          discount_percentage: discountPercentage,
          discount_amount: billSummary.discountAmount,
          cgst_rate:
            billSummary.taxes.find((t: any) => t.name.includes("CGST"))?.rate || 0,
          cgst_amount:
            billSummary.taxes.find((t: any) => t.name.includes("CGST"))?.amount || 0,
          sgst_rate:
            billSummary.taxes.find((t: any) => t.name.includes("SGST"))?.rate || 0,
          sgst_amount:
            billSummary.taxes.find((t: any) => t.name.includes("SGST"))?.amount || 0,
          service_charge_rate:
            billSummary.taxes.find((t: any) => t.name.includes("Service"))?.rate ||
            0,
          service_charge_amount:
            billSummary.taxes.find((t: any) => t.name.includes("Service"))?.amount ||
            0,
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

      // Create bill items from orders
      const orderBillItems = selectedOrdersData.flatMap((order) =>
        order.order_items.map((item) => ({
          bill_id: billData.id,
          order_item_id: item.id,
          item_name: item.menu_items?.name || "Unknown Item",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))
      );

      // Create bill items from manual items (no order_item_id)
      const manualBillItems = manualItems.map((item) => ({
        bill_id: billData.id,
        order_item_id: null, // Manual items don't have order_item_id
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      // Combine all bill items
      const allBillItems = [...orderBillItems, ...manualBillItems];

      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(allBillItems);

      if (itemsError) throw itemsError;

      // Update orders status to paid
      const { error: ordersError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .in("id", selectedOrders);

      if (ordersError) throw ordersError;

      // Check each session to see if ALL orders are now completed/paid/cancelled
      // If yes, automatically complete the session
      if (sessionIds.length > 0) {
        for (const sessionId of sessionIds) {
          // Get all orders in this session
          const { data: sessionOrders } = await supabase
            .from("orders")
            .select("id, status")
            .eq("table_session_id", sessionId);

          // Check if all orders are in final states
          const allOrdersComplete = sessionOrders?.every((o) =>
            ["completed", "paid", "cancelled"].includes(o.status || "")
          );

          if (allOrdersComplete) {
            // Auto-complete the session
            await supabase
              .from("table_sessions")
              .update({
                status: "completed",
                payment_method: paymentMethod,
                paid_at: new Date().toISOString(),
                session_ended_at: new Date().toISOString(),
              })
              .eq("id", sessionId);
          }
        }
      }

      // Show success and prepare for printing
      setLastBill({
        ...billData,
        bill_items: allBillItems,
        orders: selectedOrdersData,
      });
      setShowPaymentSuccess(true);
      setSelectedOrders([]);
      setManualItems([]); // Clear manual items
      setBillSummary(null);
      setDiscountPercentage(0);
      await fetchOrders();
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Error processing payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = async (bill: any) => {
    try {
      // Fetch restaurant settings
      const { data: settings } = await supabase
        .from("restaurant_settings")
        .select("*");

      const settingsMap =
        settings?.reduce((acc: any, setting: any) => {
          acc[setting.setting_key] = setting.setting_value;
          return acc;
        }, {}) || {};

      // Prepare bill items for receipt
      const billItems: BillItem[] =
        bill.bill_items?.map((item: any) => ({
          name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          is_manual: item.is_manual || false,
        })) || [];

      // Prepare tax settings
      const taxes = [];
      if (bill.cgst_amount > 0) {
        taxes.push({
          name: "CGST",
          rate: bill.cgst_rate,
          amount: bill.cgst_amount,
        });
      }
      if (bill.sgst_amount > 0) {
        taxes.push({
          name: "SGST",
          rate: bill.sgst_rate,
          amount: bill.sgst_amount,
        });
      }
      if (bill.service_charge_amount > 0) {
        taxes.push({
          name: "Service Charge",
          rate: bill.service_charge_rate,
          amount: bill.service_charge_amount,
        });
      }

      const taxAmount = taxes.reduce((sum, tax) => sum + tax.amount, 0);

      // Generate HTML receipt using shared utility
      const htmlReceipt = generateHTMLReceipt({
        settings: {
          restaurant_name: settingsMap.restaurant_name,
          restaurant_address: settingsMap.restaurant_address,
          restaurant_phone: settingsMap.restaurant_phone,
          gst_number: settingsMap.gst_number,
        },
        billNumber: bill.bill_number,
        tableNumber: null,
        orderType: "takeaway",
        items: billItems,
        calculation: {
          subtotal: bill.subtotal,
          discount_amount: bill.discount_amount,
          taxable_amount: bill.subtotal - bill.discount_amount,
          taxes,
          tax_amount: taxAmount,
          final_amount: bill.final_amount,
        },
        paymentMethod: bill.payment_method,
        discountPercentage: bill.discount_percentage,
        date: new Date(bill.created_at),
      });

      // Print using shared utility
      printHTMLReceipt(htmlReceipt);
    } catch (error) {
      console.error("Error printing receipt:", error);
      alert("Error printing receipt. Please try again.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchTerm ||
      order.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.table_sessions?.restaurant_tables?.table_number
        ?.toString()
        .includes(searchTerm) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || order.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading billing data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Counter Billing
              </h1>
              <p className="text-gray-600">
                Process payments and print receipts
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={fetchData}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Order Selection */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    Select Tables/Orders to Bill
                  </h2>
                  <div className="text-sm text-gray-600">
                    Click on a table to select all orders at once
                  </div>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {sessionGroups.length === 0 && takeawayOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Orders Found
                      </h3>
                      <p className="text-gray-600">
                        No served orders available for billing.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Dine-in Sessions Grouped by Table */}
                      {sessionGroups.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Dine-In Tables ({sessionGroups.length})
                          </h3>
                          {sessionGroups.map((session) => {
                            const isSessionSelected = session.orders.every(
                              (o) => selectedOrders.includes(o.id)
                            );
                            return (
                              <div
                                key={session.sessionId}
                                className="border-2 rounded-lg overflow-hidden transition-all"
                              >
                                {/* Session Header - Clickable */}
                                <div
                                  onClick={() =>
                                    toggleSessionSelection(
                                      session.sessionId,
                                      session.orders
                                    )
                                  }
                                  className={`p-4 cursor-pointer transition-all ${
                                    isSessionSelected
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                                          isSessionSelected
                                            ? "bg-blue-500 text-white"
                                            : "bg-white text-blue-600 border-2 border-blue-600"
                                        }`}
                                      >
                                        {session.tableNumber}
                                      </div>
                                      <div>
                                        <div
                                          className={`font-semibold ${
                                            isSessionSelected
                                              ? "text-white"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          Table {session.tableNumber}
                                        </div>
                                        <div
                                          className={`text-sm ${
                                            isSessionSelected
                                              ? "text-blue-100"
                                              : "text-gray-600"
                                          }`}
                                        >
                                          {session.orderCount} order
                                          {session.orderCount !== 1 ? "s" : ""}{" "}
                                          •{" "}
                                          {getSessionDuration(
                                            session.sessionStartedAt
                                          )}
                                        </div>
                                        {session.customerPhone && (
                                          <div
                                            className={`text-xs ${
                                              isSessionSelected
                                                ? "text-blue-100"
                                                : "text-gray-500"
                                            }`}
                                          >
                                            📱 {session.customerPhone}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div
                                        className={`text-2xl font-bold ${
                                          isSessionSelected
                                            ? "text-white"
                                            : "text-gray-900"
                                        }`}
                                      >
                                        {formatCurrency(session.totalAmount)}
                                      </div>
                                      <div
                                        className={`text-xs ${
                                          isSessionSelected
                                            ? "text-blue-100"
                                            : "text-gray-600"
                                        }`}
                                      >
                                        Click to{" "}
                                        {isSessionSelected
                                          ? "deselect"
                                          : "select"}{" "}
                                        all
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Orders in Session - Collapsible */}
                                <div className="bg-white border-t">
                                  {session.orders.map((order, idx) => (
                                    <div
                                      key={order.id}
                                      className={`p-3 ${
                                        idx !== session.orders.length - 1
                                          ? "border-b"
                                          : ""
                                      } ${
                                        selectedOrders.includes(order.id)
                                          ? "bg-blue-50"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-gray-500">
                                              Order #{order.id.slice(-6)}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                              {new Date(
                                                order.created_at
                                              ).toLocaleTimeString("en-IN", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </span>
                                          </div>
                                          <div className="text-sm text-gray-700">
                                            {order.order_items.map((item) => (
                                              <div
                                                key={item.id}
                                                className="flex justify-between"
                                              >
                                                <span>
                                                  {item.quantity}x{" "}
                                                  {item.menu_items?.name}
                                                </span>
                                                <span className="text-gray-600">
                                                  {formatCurrency(
                                                    item.total_price
                                                  )}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="ml-3 text-right">
                                          <div className="font-medium text-gray-900">
                                            {formatCurrency(order.total_amount)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Takeaway Orders */}
                      {takeawayOrders.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mt-6">
                            Takeaway Orders ({takeawayOrders.length})
                          </h3>
                          {takeawayOrders.map((order) => (
                            <div
                              key={order.id}
                              onClick={() => toggleOrderSelection(order.id)}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedOrders.includes(order.id)
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-gray-900">
                                      #{order.id.slice(-6)}
                                    </span>
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                      🥡 Takeaway
                                    </span>
                                  </div>

                                  <div className="text-sm text-gray-600 mb-2">
                                    {order.order_items.length} items •{" "}
                                    {formatCurrency(order.total_amount)}
                                  </div>

                                  <div className="text-xs text-gray-500">
                                    {new Date(
                                      order.created_at
                                    ).toLocaleString()}
                                    {order.customer_phone &&
                                      ` • ${order.customer_phone}`}
                                  </div>

                                  <div className="mt-2 text-xs text-gray-600">
                                    {order.order_items
                                      .slice(0, 2)
                                      .map((item) => item.menu_items?.name)
                                      .join(", ")}
                                    {order.order_items.length > 2 &&
                                      ` +${order.order_items.length - 2} more`}
                                  </div>
                                </div>

                                {selectedOrders.includes(order.id) && (
                                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Bill Summary & Payment */}
          <div>
            <div className="sticky top-6">
              <Card>
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Bill Summary</h2>

                  {selectedOrders.length === 0 && manualItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">
                        Select orders or add manual items
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedOrders.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600 mb-1">
                            Selected Orders
                          </div>
                          <div className="font-medium">
                            {selectedOrders.length} order
                            {selectedOrders.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      )}

                      {/* Additional Items Section */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-sm">
                            Additional Items
                          </h3>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowAddItemModal(true)}
                            leftIcon={<Plus className="w-3 h-3" />}
                          >
                            Add from Menu
                          </Button>
                        </div>

                        {manualItems.length > 0 ? (
                          <div className="space-y-2">
                            {manualItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm bg-amber-50 p-2 rounded border border-amber-200"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {item.quantity} ×{" "}
                                    {formatCurrency(item.unit_price)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {formatCurrency(item.total_price)}
                                  </span>
                                  <button
                                    onClick={() => removeManualItem(item.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic">
                            No additional items
                          </p>
                        )}
                      </div>

                      {billSummary && (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>
                                {formatCurrency(billSummary.subtotal)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span>Discount:</span>
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
                                <span className="text-sm">%</span>
                                <span className="text-sm">
                                  -{formatCurrency(billSummary.discountAmount)}
                                </span>
                              </div>
                            </div>

                            {billSummary.taxes.map((tax: any) => (
                              <div
                                key={tax.name}
                                className="flex justify-between text-sm text-gray-600"
                              >
                                <span>{tax.name}:</span>
                                <span>{formatCurrency(tax.amount)}</span>
                              </div>
                            ))}

                            <div className="border-t pt-2">
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span className="text-green-600">
                                  {formatCurrency(billSummary.finalAmount)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h3 className="font-medium mb-3">Payment Method</h3>
                            <div className="grid grid-cols-3 gap-2">
                              {(["cash", "upi", "card"] as const).map(
                                (method) => (
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
                                )
                              )}
                            </div>
                          </div>

                          <Button
                            variant="primary"
                            size="lg"
                            onClick={processPayment}
                            disabled={processing}
                            className="w-full"
                            leftIcon={
                              processing ? undefined : (
                                <CheckCircle className="w-5 h-5" />
                              )
                            }
                          >
                            {processing ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Processing...
                              </div>
                            ) : (
                              "Process Payment"
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Add Menu Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Add Item from Menu
              </h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setSelectedMenuItem("");
                  setNewItemQuantity(1);
                  setItemSearchTerm("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <AlertCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {menuCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                {getFilteredMenuItems().length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    No items found
                  </div>
                ) : (
                  getFilteredMenuItems().map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedMenuItem(item.id)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        selectedMenuItem === item.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {item.name}
                          </div>
                          <div className="text-sm font-medium text-blue-600 mt-1">
                            {formatCurrency(item.price)}
                          </div>
                        </div>
                        {item.is_veg && (
                          <span className="text-green-600 text-xs">🟢</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Quantity Input */}
              {selectedMenuItem && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
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
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">
                      Quantity:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newItemQuantity}
                      onChange={(e) =>
                        setNewItemQuantity(parseInt(e.target.value) || 1)
                      }
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex-1 text-right">
                      <div className="text-sm text-gray-600">Total:</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(
                          (menuItems.find((i) => i.id === selectedMenuItem)
                            ?.price || 0) * newItemQuantity
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
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
                >
                  Add to Bill
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccess && lastBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600 mb-1">Bill: {lastBill.bill_number}</p>
              <p className="text-2xl font-bold text-green-600 mb-6">
                {formatCurrency(lastBill.final_amount)}
              </p>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPaymentSuccess(false);
                    setLastBill(null);
                  }}
                  className="flex-1"
                >
                  Done
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    printReceipt(lastBill);
                    setShowPaymentSuccess(false);
                    setLastBill(null);
                  }}
                  className="flex-1"
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
