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
  Printer,
  Eye,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  Users,
  ShoppingBag,
} from "lucide-react";

interface OrderWithDetails {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  table_sessions: {
    id: string;
    restaurant_tables: {
      table_number: number;
    } | null;
  } | null;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    menu_items: {
      id: string;
      name: string;
      is_veg: boolean;
    } | null;
  }>;
}

interface BillSummary {
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  taxes: Array<{
    name: string;
    rate: number;
    amount: number;
  }>;
}

export default function BillingPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [billSummary, setBillSummary] = useState<BillSummary | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'served'>('served');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedOrders.length > 0) {
      calculateBill();
    } else {
      setBillSummary(null);
    }
  }, [selectedOrders, discountPercentage]);

  const fetchData = async () => {
    await Promise.all([fetchOrders(), fetchTaxSettings()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          table_sessions (
            id,
            restaurant_tables (
              table_number
            )
          ),
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            menu_items (
              id,
              name,
              is_veg
            )
          )
        `)
        .in('status', ['served', 'completed'])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data as OrderWithDetails[] || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
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

  const calculateBill = () => {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id));
    const subtotal = selectedOrdersData.reduce((sum, order) => sum + order.total_amount, 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    const taxableAmount = subtotal - discountAmount;

    const taxes = taxSettings.map(tax => ({
      name: tax.name,
      rate: tax.rate,
      amount: (taxableAmount * tax.rate) / 100
    }));

    const taxAmount = taxes.reduce((sum, tax) => sum + tax.amount, 0);
    const finalAmount = taxableAmount + taxAmount;

    setBillSummary({
      subtotal,
      discountPercentage,
      discountAmount,
      taxAmount,
      finalAmount,
      taxes
    });
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
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

      // Create bill
      const billNumber = `BILL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert({
          bill_number: billNumber,
          table_session_id: null, // For counter billing
          subtotal: billSummary.subtotal,
          discount_percentage: discountPercentage,
          discount_amount: billSummary.discountAmount,
          cgst_rate: billSummary.taxes.find(t => t.name.includes('CGST'))?.rate || 0,
          cgst_amount: billSummary.taxes.find(t => t.name.includes('CGST'))?.amount || 0,
          sgst_rate: billSummary.taxes.find(t => t.name.includes('SGST'))?.rate || 0,
          sgst_amount: billSummary.taxes.find(t => t.name.includes('SGST'))?.amount || 0,
          service_charge_rate: billSummary.taxes.find(t => t.name.includes('Service'))?.rate || 0,
          service_charge_amount: billSummary.taxes.find(t => t.name.includes('Service'))?.amount || 0,
          total_tax_amount: billSummary.taxAmount,
          final_amount: billSummary.finalAmount,
          payment_status: 'paid',
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          payment_received_by: user.id
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill items
      const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id));
      const billItems = selectedOrdersData.flatMap(order =>
        order.order_items.map(item => ({
          bill_id: billData.id,
          order_item_id: item.id,
          item_name: item.menu_items?.name || 'Unknown Item',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      );

      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(billItems);

      if (itemsError) throw itemsError;

      // Update orders status to completed
      const { error: ordersError } = await supabase
        .from("orders")
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .in('id', selectedOrders);

      if (ordersError) throw ordersError;

      // Update table sessions if any
      const sessionIds = selectedOrdersData
        .map(order => order.table_sessions?.id)
        .filter((id): id is string => Boolean(id));

      if (sessionIds.length > 0) {
        await supabase
          .from("table_sessions")
          .update({
            status: 'completed',
            payment_method: paymentMethod,
            paid_at: new Date().toISOString(),
            session_ended_at: new Date().toISOString()
          })
          .in('id', sessionIds);
      }

      // Show success and prepare for printing
      setLastBill({
        ...billData,
        bill_items: billItems,
        orders: selectedOrdersData
      });
      setShowPaymentSuccess(true);
      setSelectedOrders([]);
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

      const settingsMap = settings?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {}) || {};

      const printContent = `
        <html>
          <head>
            <title>Receipt - ${bill.bill_number}</title>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: 'Courier New', monospace;
                max-width: 300px;
                margin: 0 auto;
                padding: 15px;
                line-height: 1.4;
                font-size: 12px;
                color: #000;
                background: #fff;
              }
              .center { text-align: center; margin-bottom: 10px; }
              .line { border-bottom: 1px dashed #000; margin: 8px 0; }
              .row { display: flex; justify-content: space-between; margin: 2px 0; }
              .bold { font-weight: bold; }
              .item-row {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
                padding: 2px 0;
              }
              .item-name { flex: 1; margin-right: 10px; }
              .final-total {
                font-size: 16px;
                font-weight: bold;
                border-top: 2px solid #000;
                padding-top: 8px;
                margin-top: 8px;
              }
              @media print {
                body { margin: 0; padding: 10px; font-size: 11px; }
                @page { margin: 5mm; size: 80mm auto; }
              }
            </style>
          </head>
          <body>
            <div class="center">
              <div class="bold" style="font-size: 16px;">${settingsMap.restaurant_name || 'HANGOUT RESTAURANT'}</div>
              ${settingsMap.restaurant_address ? `<div>${settingsMap.restaurant_address}</div>` : ''}
              ${settingsMap.restaurant_phone ? `<div>Phone: ${settingsMap.restaurant_phone}</div>` : ''}
              ${settingsMap.gst_number ? `<div>GST: ${settingsMap.gst_number}</div>` : ''}
            </div>
            <div class="line"></div>

            <div class="center">
              <div class="bold">Bill No: ${bill.bill_number}</div>
              <div>Date: ${new Date(bill.created_at).toLocaleString('en-IN')}</div>
              <div>Payment: ${bill.payment_method.toUpperCase()}</div>
            </div>
            <div class="line"></div>

            <div>
              <div class="bold center">ITEMS ORDERED</div>
              <div class="line" style="margin: 5px 0;"></div>
              ${bill.bill_items?.map((item: any) => `
                <div class="item-row">
                  <div class="item-name">${item.item_name}</div>
                  <div style="width: 30px; text-align: center;">${item.quantity}</div>
                  <div style="width: 70px; text-align: right;">${formatCurrency(item.total_price)}</div>
                </div>
              `).join('') || '<div>No items</div>'}
            </div>
            <div class="line"></div>

            <div class="row"><span>Subtotal:</span><span>${formatCurrency(bill.subtotal)}</span></div>
            ${bill.discount_amount > 0 ? `
              <div class="row"><span>Discount (${bill.discount_percentage}%):</span><span>-${formatCurrency(bill.discount_amount)}</span></div>
            ` : ''}
            ${bill.cgst_amount > 0 ? `<div class="row"><span>CGST @ ${bill.cgst_rate}%:</span><span>${formatCurrency(bill.cgst_amount)}</span></div>` : ''}
            ${bill.sgst_amount > 0 ? `<div class="row"><span>SGST @ ${bill.sgst_rate}%:</span><span>${formatCurrency(bill.sgst_amount)}</span></div>` : ''}
            ${bill.service_charge_amount > 0 ? `<div class="row"><span>Service Charge @ ${bill.service_charge_rate}%:</span><span>${formatCurrency(bill.service_charge_amount)}</span></div>` : ''}

            <div class="row final-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(bill.final_amount)}</span>
            </div>

            <div class="line"></div>
            <div class="center">
              <div class="bold">Thank you for dining with us!</div>
              <div>Please visit us again!</div>
              <div style="margin-top: 10px;">Paid on: ${new Date(bill.paid_at).toLocaleString('en-IN')}</div>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }, 500);
      } else {
        alert('Unable to open print window. Please check if pop-ups are blocked.');
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Error printing receipt. Please try again.');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      !searchTerm ||
      order.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.table_sessions?.restaurant_tables?.table_number?.toString().includes(searchTerm) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

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
              <h1 className="text-2xl font-bold text-gray-900">Counter Billing</h1>
              <p className="text-gray-600">Process payments and print receipts</p>
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
                  <h2 className="text-lg font-semibold">Select Orders to Bill</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search orders..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Orders</option>
                      <option value="served">Served Only</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
                      <p className="text-gray-600">No served orders available for billing.</p>
                    </div>
                  ) : (
                    filteredOrders.map(order => (
                      <div
                        key={order.id}
                        onClick={() => toggleOrderSelection(order.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedOrders.includes(order.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">
                                #{order.id.slice(-6)}
                              </span>
                              {order.table_sessions?.restaurant_tables ? (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  Table {order.table_sessions.restaurant_tables.table_number}
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Takeaway
                                </span>
                              )}
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                order.status === 'served'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>

                            <div className="text-sm text-gray-600 mb-2">
                              {order.order_items.length} items • {formatCurrency(order.total_amount)}
                            </div>

                            <div className="text-xs text-gray-500">
                              {new Date(order.created_at).toLocaleString()}
                              {order.customer_phone && ` • ${order.customer_phone}`}
                            </div>

                            <div className="mt-2 text-xs text-gray-600">
                              {order.order_items.slice(0, 2).map(item => item.menu_items?.name).join(', ')}
                              {order.order_items.length > 2 && ` +${order.order_items.length - 2} more`}
                            </div>
                          </div>

                          {selectedOrders.includes(order.id) && (
                            <CheckCircle className="w-5 h-5 text-blue-500 mt-1" />
                          )}
                        </div>
                      </div>
                    ))
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

                  {selectedOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Select orders to create bill</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">Selected Orders</div>
                        <div className="font-medium">{selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''}</div>
                      </div>

                      {billSummary && (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>{formatCurrency(billSummary.subtotal)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span>Discount:</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={discountPercentage}
                                  onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 border rounded text-center text-sm"
                                />
                                <span className="text-sm">%</span>
                                <span className="text-sm">-{formatCurrency(billSummary.discountAmount)}</span>
                              </div>
                            </div>

                            {billSummary.taxes.map(tax => (
                              <div key={tax.name} className="flex justify-between text-sm text-gray-600">
                                <span>{tax.name}:</span>
                                <span>{formatCurrency(tax.amount)}</span>
                              </div>
                            ))}

                            <div className="border-t pt-2">
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span className="text-green-600">{formatCurrency(billSummary.finalAmount)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h3 className="font-medium mb-3">Payment Method</h3>
                            <div className="grid grid-cols-3 gap-2">
                              {(['cash', 'upi', 'card'] as const).map(method => (
                                <button
                                  key={method}
                                  onClick={() => setPaymentMethod(method)}
                                  className={`p-3 text-center border-2 rounded-lg transition-all ${
                                    paymentMethod === method
                                      ? 'border-green-500 bg-green-50 text-green-700'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="text-2xl mb-1">
                                    {method === 'cash' ? '💵' : method === 'upi' ? '📱' : '💳'}
                                  </div>
                                  <div className="text-xs font-medium capitalize">{method}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <Button
                            variant="primary"
                            size="lg"
                            onClick={processPayment}
                            disabled={processing}
                            className="w-full"
                            leftIcon={processing ? undefined : <CheckCircle className="w-5 h-5" />}
                          >
                            {processing ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Processing...
                              </div>
                            ) : (
                              'Process Payment'
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

      {/* Payment Success Modal */}
      {showPaymentSuccess && lastBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
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