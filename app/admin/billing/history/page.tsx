"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import { formatCurrency } from "@/lib/constants";
import {
  Receipt,
  CreditCard,
  Clock,
  CheckCircle,
  DollarSign,
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
    customer_email: string;
    session_started_at: string;
    session_ended_at: string;
  } | null;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  useEffect(() => {
    fetchPaymentHistory();
  }, [dateFilter, paymentMethodFilter]);

  const fetchPaymentHistory = async () => {
    try {
      let query = supabase
        .from("bills")
        .select(`
          id,
          bill_number,
          final_amount,
          payment_method,
          paid_at,
          table_sessions (
            customer_email,
            session_started_at,
            session_ended_at,
            restaurant_tables (
              table_number
            )
          )
        `)
        .eq("payment_status", "paid")
        .order("paid_at", { ascending: false });

      // Apply date filter
      const now = new Date();
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte('paid_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('paid_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('paid_at', monthAgo.toISOString());
      }

      // Apply payment method filter
      if (paymentMethodFilter !== 'all') {
        query = query.eq('payment_method', paymentMethodFilter);
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

  const filteredPayments = payments.filter(payment =>
    payment.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.table_sessions?.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.table_sessions?.restaurant_tables?.table_number?.toString().includes(searchTerm)
  );

  const totalRevenue = filteredPayments.reduce((sum, payment) => sum + payment.final_amount, 0);
  const paymentMethodCounts = filteredPayments.reduce((acc, payment) => {
    acc[payment.payment_method] = (acc[payment.payment_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'upi': return '📱';
      case 'card': return '💳';
      default: return '💰';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
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
      console.log('Starting print process for payment:', payment);

      // Fetch detailed bill information
      const { data: billData, error } = await supabase
        .from("bills")
        .select(`
          *,
          bill_items (
            *,
            order_items (
              menu_items (
                name,
                price,
                is_veg
              )
            )
          ),
          table_sessions (
            customer_email,
            restaurant_tables (
              table_number,
              table_code
            )
          )
        `)
        .eq("id", payment.id)
        .single();

      if (error) {
        console.error('Database error fetching bill data:', error);
        throw error;
      }

      console.log('Bill data fetched successfully:', billData);

      // Get restaurant settings for receipt header
      const { data: restaurantSettings, error: settingsError } = await supabase
        .from("restaurant_settings")
        .select("*");

      if (settingsError) {
        console.error('Error fetching restaurant settings:', settingsError);
      }

      const settings = restaurantSettings?.reduce((acc: Record<string, string>, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {}) || {};

      console.log('Restaurant settings:', settings);

      // Get tax settings
      const { data: taxSettings, error: taxError } = await supabase
        .from("tax_settings")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (taxError) {
        console.error('Error fetching tax settings:', taxError);
      }

      console.log('Tax settings:', taxSettings);

      // Validate required data
      if (!billData) {
        throw new Error('Bill data not found');
      }

      // Format receipt content
      const printContent = `
        <html>
          <head>
            <title>Receipt - ${billData.bill_number || 'Unknown'}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                max-width: 300px;
                margin: 0 auto;
                padding: 15px;
                line-height: 1.5;
                font-size: 12px;
                color: #000;
                background: #fff;
              }
              .receipt-header {
                text-align: center;
                border-bottom: 1px dashed #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .restaurant-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .receipt-info {
                margin-bottom: 10px;
              }
              .items-section {
                border-bottom: 1px dashed #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .item-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
              }
              .item-name {
                flex: 1;
                margin-right: 10px;
              }
              .item-qty {
                width: 30px;
                text-align: center;
              }
              .item-price {
                width: 60px;
                text-align: right;
              }
              .totals-section {
                margin-top: 10px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
              }
              .final-total {
                font-weight: bold;
                font-size: 14px;
                border-top: 1px solid #000;
                padding-top: 5px;
                margin-top: 5px;
              }
              .receipt-footer {
                text-align: center;
                margin-top: 20px;
                border-top: 1px dashed #000;
                padding-top: 10px;
                font-size: 10px;
              }
              .veg-indicator {
                color: green;
                font-weight: bold;
              }
              .non-veg-indicator {
                color: red;
                font-weight: bold;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 10px;
                  font-size: 11px;
                }
                @page {
                  margin: 5mm;
                  size: 80mm auto;
                }
              }
              @media screen and (max-width: 400px) {
                body {
                  max-width: 95%;
                  padding: 10px;
                  font-size: 11px;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt-header">
              <div class="restaurant-name">${settings.restaurant_name || 'Restaurant Name'}</div>
              ${settings.restaurant_address ? `<div>${settings.restaurant_address}</div>` : ''}
              ${settings.restaurant_phone ? `<div>Phone: ${settings.restaurant_phone}</div>` : ''}
              ${settings.gst_number ? `<div>GST: ${settings.gst_number}</div>` : ''}
            </div>

            <div class="receipt-info">
              <div>Bill No: ${billData.bill_number}</div>
              <div>Date: ${billData.created_at ? formatDateTime(billData.created_at) : 'N/A'}</div>
              <div>Table: ${billData.table_sessions?.restaurant_tables?.table_number || 'Takeaway'}</div>
              ${billData.table_sessions?.customer_email ? `<div>Email: ${billData.table_sessions.customer_email}</div>` : ''}
              <div>Payment: ${payment.payment_method?.toUpperCase() || 'N/A'}</div>
            </div>

            <div class="items-section">
              <div style="font-weight: bold; margin-bottom: 5px;">ITEMS ORDERED</div>
              ${billData.bill_items?.map((item: any) => `
                <div class="item-row">
                  <div class="item-name">
                    <span class="${item.order_items?.menu_items?.is_veg ? 'veg-indicator' : 'non-veg-indicator'}">
                      ${item.order_items?.menu_items?.is_veg ? '●' : '▲'}
                    </span>
                    ${item.order_items?.menu_items?.name || item.item_name || 'Unknown Item'}
                  </div>
                  <div class="item-qty">${item.quantity || 0}</div>
                  <div class="item-price">${formatCurrency(Number(item.unit_price) || 0)}</div>
                  <div class="item-price">${formatCurrency(Number(item.total_price) || 0)}</div>
                </div>
              `).join('') || '<div>No items found</div>'}
            </div>

            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(Number(billData.subtotal) || 0)}</span>
              </div>

              ${taxSettings?.map((tax: any) => `
                <div class="total-row">
                  <span>${tax.name} @ ${tax.rate}%:</span>
                  <span>${formatCurrency((Number(billData.subtotal) || 0) * (Number(tax.rate) || 0) / 100)}</span>
                </div>
              `).join('') || ''}

              <div class="total-row final-total">
                <span>TOTAL:</span>
                <span>${formatCurrency(Number(billData.final_amount) || 0)}</span>
              </div>
            </div>

            <div class="receipt-footer">
              <div>Thank you for dining with us!</div>
              <div>Paid at: ${formatDateTime(payment.paid_at)}</div>
              <div style="margin-top: 10px;">● Veg | ▲ Non-Veg</div>
            </div>
          </body>
        </html>
      `;

      console.log('Generated print content, opening print window...');

      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        console.log('Print window opened successfully');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load then print
        // Add accessibility attributes
        printWindow.document.body.setAttribute('role', 'document');
        printWindow.document.body.setAttribute('aria-label', `Receipt for bill ${billData.bill_number}`);

        // Wait for content to load then print
        setTimeout(() => {
          try {
            console.log('Attempting to print...');
            printWindow.print();
            console.log('Print dialog opened successfully');
            // Close window after print dialog
            setTimeout(() => {
              printWindow.close();
            }, 1000);
          } catch (printError) {
            console.error("Print error:", printError);
            alert('Unable to open print dialog. Please check your browser settings.');
          }
        }, 500);
      } else {
        console.error('Failed to open print window - likely blocked by popup blocker');
        alert('Unable to open print window. Please check if pop-ups are blocked.');
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Error printing receipt. Please try again.');
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
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {filteredPayments.length}
                </div>
                <div className="text-sm text-gray-600">Total Bills</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(filteredPayments.length > 0 ? totalRevenue / filteredPayments.length : 0)}
                </div>
                <div className="text-sm text-gray-600">Avg Bill</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="text-sm text-gray-600 mb-2">Payment Methods</div>
            <div className="space-y-1">
              {Object.entries(paymentMethodCounts).map(([method, count]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <span>{getPaymentMethodIcon(method)}</span>
                    <span className="capitalize">{method}</span>
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table & Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount & Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
                    <p className="text-gray-600">No completed payments found for the selected filters.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">
                          {payment.bill_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          Bill ID: {payment.id.slice(-8)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">
                          {payment.table_sessions?.restaurant_tables?.table_number ?
                            `Table ${payment.table_sessions.restaurant_tables.table_number}` :
                            'Takeaway'
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.table_sessions?.customer_email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(payment.final_amount)}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <span>{getPaymentMethodIcon(payment.payment_method)}</span>
                          <span className="capitalize">{payment.payment_method}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.table_sessions ?
                        calculateSessionDuration(
                          payment.table_sessions.session_started_at,
                          payment.table_sessions.session_ended_at
                        ) :
                        'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(payment.paid_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => printReceipt(payment)}
                          leftIcon={<Printer className="w-3 h-3" />}
                        >
                          Print
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}