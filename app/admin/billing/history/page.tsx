"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import { formatCurrency } from "@/lib/constants";
import { getCurrentAuthUser, type UserRole } from "@/lib/auth";
import {
  generateHTMLReceipt,
  printHTMLReceipt,
  type BillItem,
} from "@/lib/utils/billing";
import {
  Receipt,
  CreditCard,
  Clock,
  CheckCircle,
  IndianRupee,
  Users,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  ArrowLeft,
  Printer,
} from "lucide-react";

interface PaymentHistory {
  id: string;
  bill_number: string;
  final_amount: number;
  payment_method: string;
  paid_at: string;
  table_sessions: {
    restaurant_tables: {
      table_number: number;
    } | null;
    customer_email: string | null;
    customer_phone: string | null;
    session_started_at: string;
    session_ended_at: string;
  } | null;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("today");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    fetchPaymentHistory();
    fetchUserRole();
  }, [dateFilter, paymentMethodFilter]);

  const fetchUserRole = async () => {
    const user = await getCurrentAuthUser();
    if (user) {
      setUserRole(user.role);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      let query = supabase
        .from("bills")
        .select(
          `
          id,
          bill_number,
          final_amount,
          payment_method,
          paid_at,
          table_sessions (
            customer_email,
            customer_phone,
            session_started_at,
            session_ended_at,
            restaurant_tables (
              table_number
            )
          )
        `
        )
        .eq("payment_status", "paid")
        .order("paid_at", { ascending: false });

      // Apply date filter
      const now = new Date();
      if (dateFilter === "today") {
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        query = query.gte("paid_at", today.toISOString());
      } else if (dateFilter === "yesterday") {
        const yesterday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        );
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        query = query
          .gte("paid_at", yesterday.toISOString())
          .lt("paid_at", today.toISOString());
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte("paid_at", weekAgo.toISOString());
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte("paid_at", monthAgo.toISOString());
      }

      // Apply payment method filter
      if (paymentMethodFilter !== "all") {
        query = query.eq("payment_method", paymentMethodFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPayments((data as PaymentHistory[]) || []);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(
    (payment) =>
      payment.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.table_sessions?.customer_email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.table_sessions?.customer_phone?.includes(searchTerm) ||
      payment.table_sessions?.restaurant_tables?.table_number
        ?.toString()
        .includes(searchTerm)
  );

  const totalRevenue = filteredPayments.reduce(
    (sum, payment) => sum + payment.final_amount,
    0
  );
  const paymentMethodCounts = filteredPayments.reduce((acc, payment) => {
    acc[payment.payment_method] = (acc[payment.payment_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate revenue by payment method
  const paymentMethodRevenue = filteredPayments.reduce((acc, payment) => {
    acc[payment.payment_method] =
      (acc[payment.payment_method] || 0) + payment.final_amount;
    return acc;
  }, {} as Record<string, number>);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return "💵";
      case "upi":
        return "📱";
      case "card":
        return "💳";
      default:
        return "💰";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const calculateSessionDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const printReceipt = async (payment: PaymentHistory) => {
    try {
      // Fetch detailed bill information
      const { data: billData, error } = await supabase
        .from("bills")
        .select(
          `
          *,
          bill_items (
            id,
            item_name,
            quantity,
            unit_price,
            total_price,
            order_item_id
          ),
          table_sessions (
            customer_email,
            customer_phone,
            restaurant_tables (
              table_number
            )
          )
        `
        )
        .eq("id", payment.id)
        .single();

      if (error) throw error;
      if (!billData) throw new Error("Bill data not found");

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
      const billItems: BillItem[] = billData.bill_items.map((item: any) => ({
        name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_manual: !item.order_item_id,
      }));

      // Reconstruct items_with_taxes for receipt printing
      // Since old bills don't have per-item tax breakdown, we calculate it
      const cgstRate = billData.cgst_rate || 0;
      const sgstRate = billData.sgst_rate || 0;
      const totalTaxRate = cgstRate + sgstRate;

      const items_with_taxes = billItems.map((item) => {
        // Reverse calculate base price from total (assuming tax-inclusive)
        const base_price = item.total_price / (1 + totalTaxRate / 100);
        const item_taxes: Array<{
          name: string;
          rate: number;
          amount: number;
        }> = [];

        if (cgstRate > 0) {
          item_taxes.push({
            name: "CGST",
            rate: cgstRate,
            amount: (base_price * cgstRate) / 100,
          });
        }
        if (sgstRate > 0) {
          item_taxes.push({
            name: "SGST",
            rate: sgstRate,
            amount: (base_price * sgstRate) / 100,
          });
        }

        return {
          ...item,
          base_price: Math.round(base_price * 100) / 100,
          item_taxes: item_taxes.map((t) => ({
            ...t,
            amount: Math.round(t.amount * 100) / 100,
          })),
        };
      });

      // Generate HTML receipt using the shared utility
      const htmlReceipt = generateHTMLReceipt({
        settings: {
          restaurant_name: settingsMap.restaurant_name,
          restaurant_address: settingsMap.restaurant_address,
          restaurant_phone: settingsMap.restaurant_phone,
          gst_number: settingsMap.gst_number,
        },
        billNumber: billData.bill_number || undefined,
        tableNumber:
          billData.table_sessions?.restaurant_tables?.table_number?.toString() ||
          null,
        orderType: billData.table_session_id ? "dine-in" : "takeaway",
        customerPhone: billData.table_sessions?.customer_phone || undefined,
        calculation: {
          items_with_taxes,
          subtotal: billData.subtotal || 0,
          taxable_subtotal: billData.subtotal || 0,
          total_gst: billData.total_tax_amount || 0,
          subtotal_with_tax:
            (billData.subtotal || 0) + (billData.total_tax_amount || 0),
          discount_amount: billData.discount_amount || 0,
          final_amount: billData.final_amount || 0,
        },
        paymentMethod: billData.payment_method || "Cash",
        discountPercentage: billData.discount_percentage || undefined,
        offerName: null, // Offer name not available in history query
        date: new Date(billData.created_at || new Date()),
      });

      printHTMLReceipt(htmlReceipt);
    } catch (error) {
      console.error("Error printing receipt:", error);
      alert("Error printing receipt. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading payment history...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600 mt-1">
            Track all completed payments and revenue
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchPaymentHistory}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            {userRole !== "manager" && (
              <>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by bill number, table, or customer email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card>
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-green-100 rounded-lg flex-shrink-0">
                <IndianRupee className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                  {formatCurrency(totalRevenue)}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  Total Revenue
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <Receipt className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg md:text-2xl font-bold text-gray-900">
                  {filteredPayments.length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  Total Bills
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 md:p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 md:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm text-gray-600 mb-2 font-medium">
                  Payment Distribution
                </div>
                <div className="space-y-1 md:space-y-1.5">
                  {Object.entries(paymentMethodRevenue).length > 0 ? (
                    Object.entries(paymentMethodRevenue)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, amount]) => (
                        <div
                          key={method}
                          className="flex justify-between items-center text-xs md:text-sm gap-2"
                        >
                          <span className="flex items-center gap-1 md:gap-1.5 text-gray-700 min-w-0 flex-shrink">
                            <span className="flex-shrink-0">
                              {getPaymentMethodIcon(method)}
                            </span>
                            <span className="capitalize truncate">
                              {method}
                            </span>
                          </span>
                          <span className="font-semibold text-gray-900 whitespace-nowrap">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className="text-xs md:text-sm text-gray-500 text-center py-2">
                      No payments yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 md:p-6">
            <div className="text-xs md:text-sm text-gray-600 mb-2 font-medium">
              Payment Methods
            </div>
            <div className="space-y-1">
              {Object.entries(paymentMethodCounts).map(([method, count]) => (
                <div
                  key={method}
                  className="flex justify-between text-xs md:text-sm gap-2"
                >
                  <span className="flex items-center gap-1 min-w-0 flex-shrink">
                    <span className="flex-shrink-0">
                      {getPaymentMethodIcon(method)}
                    </span>
                    <span className="capitalize truncate">{method}</span>
                  </span>
                  <span className="font-medium whitespace-nowrap">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Bill Details
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Table & Customer
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Amount & Payment
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Session Duration
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Paid At
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No Payment History
                        </h3>
                        <p className="text-gray-600">
                          No completed payments found for the selected filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {payment.bill_number}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {payment.id.slice(-8)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {payment.table_sessions?.restaurant_tables
                                ?.table_number
                                ? `Table ${payment.table_sessions.restaurant_tables.table_number}`
                                : "Takeaway"}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">
                              {payment.table_sessions?.customer_phone ||
                                payment.table_sessions?.customer_email ||
                                "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {formatCurrency(payment.final_amount)}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <span>
                                {getPaymentMethodIcon(payment.payment_method)}
                              </span>
                              <span className="capitalize">
                                {payment.payment_method}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.table_sessions
                            ? calculateSessionDuration(
                                payment.table_sessions.session_started_at,
                                payment.table_sessions.session_ended_at
                              )
                            : "N/A"}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {formatDateTime(payment.paid_at)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => printReceipt(payment)}
                              leftIcon={<Printer className="w-3 h-3" />}
                            >
                              <span className="hidden sm:inline">Print</span>
                              <span className="sm:hidden">
                                <Printer className="w-3 h-3" />
                              </span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Scroll indicator for mobile */}
        {filteredPayments.length > 0 && (
          <div className="sm:hidden px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-200 bg-gray-50">
            ← Swipe to view all columns →
          </div>
        )}
      </Card>
    </div>
  );
}
