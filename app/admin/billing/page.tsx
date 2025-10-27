"use client";

import { useState, useEffect } from "react";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import RoleGuard from "@/components/admin/RoleGuard";
import { formatCurrency } from "@/lib/constants";
import {
  CheckCircle,
  RefreshCw,
  ShoppingBag,
  Printer,
  Receipt,
  User,
  Clock,
} from "lucide-react";
import {
  useBilling,
  type BillWithDetails,
  type BillGroup,
} from "@/hooks/useBilling";
import { supabase } from "@/lib/supabase/client";
import {
  generateHTMLReceipt,
  printHTMLReceipt,
  type BillItem,
} from "@/lib/utils/billing";

export default function BillingPage() {
  const {
    bills,
    billGroups,
    takeawayBills,
    loading,
    error,
    refetch,
  } = useBilling();

  const [selectedBill, setSelectedBill] = useState<BillWithDetails | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastConfirmedBill, setLastConfirmedBill] = useState<BillWithDetails | null>(null);

  const confirmPayment = async (bill: BillWithDetails) => {
    setProcessing(true);
    try {
      // Get current user (manager)
      const response = await fetch("/api/admin/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to verify user");
      const { user } = await response.json();

      // Update bill to paid status
      const { error: billError } = await supabase
        .from("bills")
        .update({
          payment_status: "paid",
          payment_received_by: user.id,
          paid_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      if (billError) throw billError;

      // Get all order IDs from bill items
      const orderItemIds = bill.bill_items
        .filter((item) => item.order_item_id !== null)
        .map((item) => item.order_item_id) as string[];

      if (orderItemIds.length > 0) {
        // Get unique order IDs from order items
        const { data: orderItems, error: fetchError } = await supabase
          .from("order_items")
          .select("order_id")
          .in("id", orderItemIds);

        if (fetchError) throw fetchError;

        const orderIds = [...new Set(orderItems?.map((oi) => oi.order_id).filter((id): id is string => id !== null))] as string[];

        // Update orders to paid status
        const { error: ordersError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            updated_at: new Date().toISOString(),
          })
          .in("id", orderIds);

        if (ordersError) throw ordersError;
      }

      setLastConfirmedBill(bill);
      setShowSuccessModal(true);
      await refetch();
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      alert("Error confirming payment: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = async (bill: BillWithDetails) => {
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
      const billItems: BillItem[] = bill.bill_items.map((item) => ({
        name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_manual: !item.order_item_id,
      }));

      // Prepare taxes
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

      // Reconstruct items_with_taxes for receipt printing
      // Since old bills don't have per-item tax breakdown, we calculate it
      const totalTaxRate = (bill.cgst_rate || 0) + (bill.sgst_rate || 0);
      const items_with_taxes = billItems.map(item => {
        // Reverse calculate base price from total (assuming tax-inclusive)
        const base_price = item.total_price / (1 + totalTaxRate / 100);
        const item_taxes = [];

        if (bill.cgst_rate > 0) {
          item_taxes.push({
            name: "CGST",
            rate: bill.cgst_rate,
            amount: (base_price * bill.cgst_rate) / 100,
          });
        }
        if (bill.sgst_rate > 0) {
          item_taxes.push({
            name: "SGST",
            rate: bill.sgst_rate,
            amount: (base_price * bill.sgst_rate) / 100,
          });
        }

        return {
          ...item,
          base_price: Math.round(base_price * 100) / 100,
          item_taxes: item_taxes.map(t => ({
            ...t,
            amount: Math.round(t.amount * 100) / 100,
          })),
        };
      });

      // Generate HTML receipt
      const htmlReceipt = generateHTMLReceipt({
        settings: {
          restaurant_name: settingsMap.restaurant_name,
          restaurant_address: settingsMap.restaurant_address,
          restaurant_phone: settingsMap.restaurant_phone,
          gst_number: settingsMap.gst_number,
        },
        billNumber: bill.bill_number,
        tableNumber: bill.table_sessions?.restaurant_tables?.table_number?.toString() || null,
        orderType: bill.table_session_id ? "dine-in" : "takeaway",
        calculation: {
          items_with_taxes,
          subtotal: bill.subtotal,
          taxable_subtotal: bill.subtotal,
          total_gst: bill.total_tax_amount,
          subtotal_with_tax: bill.subtotal + bill.total_tax_amount,
          discount_amount: bill.discount_amount,
          final_amount: bill.final_amount,
        },
        paymentMethod: bill.payment_method || "Cash",
        discountPercentage: bill.discount_percentage,
        offerName: (bill as any).offer?.name || null,
        date: new Date(bill.created_at),
      });

      printHTMLReceipt(htmlReceipt);
    } catch (error) {
      console.error("Error printing receipt:", error);
      alert("Error printing receipt. Please try again.");
    }
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading pending bills...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRoute="/admin/billing">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bills & Payment (Manager Confirmation)
                </h1>
                <p className="text-gray-600">
                  Review and confirm payments processed by staff
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
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {billGroups.length === 0 && takeawayBills.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pending Bills
                </h3>
                <p className="text-gray-600">
                  All bills have been confirmed. New bills will appear here when staff process payments.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dine-in Bills */}
              {billGroups.map((group) =>
                group.bills.map((bill) => (
                  <Card key={bill.id} className="border-2 border-blue-200">
                    <div className="p-6">
                      {/* Bill Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              Table {bill.table_sessions?.restaurant_tables?.veg_only ? `V${group.tableNumber}` : group.tableNumber}
                            </h3>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                              Dine-In
                            </span>
                            {bill.table_sessions?.restaurant_tables?.veg_only && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold">
                                🟢 VEG-ONLY
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            Bill #{bill.bill_number}
                          </div>
                          {bill.staff && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <User className="w-3 h-3" />
                              <span>Processed by {bill.staff.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{getTimeSince(bill.generated_at)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(bill.final_amount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {bill.payment_method?.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Bill Items Preview */}
                      <div className="mb-4 space-y-1">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Items ({bill.bill_items.length})
                        </div>
                        {bill.bill_items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm text-gray-600"
                          >
                            <span>
                              {item.quantity}x {item.item_name}
                            </span>
                            <span>{formatCurrency(item.total_price)}</span>
                          </div>
                        ))}
                        {bill.bill_items.length > 3 && (
                          <div className="text-xs text-gray-500 italic">
                            +{bill.bill_items.length - 3} more items
                          </div>
                        )}
                      </div>

                      {/* Bill Summary */}
                      <div className="border-t pt-3 mb-4 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span>{formatCurrency(bill.subtotal)}</span>
                        </div>
                        {bill.discount_amount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Discount
                              {(bill as any).offer?.name && (
                                <span className="text-xs text-green-600 ml-1">
                                  ({(bill as any).offer.name})
                                </span>
                              )}:
                            </span>
                            <span className="text-red-600">
                              -{formatCurrency(bill.discount_amount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Taxes:</span>
                          <span>{formatCurrency(bill.total_tax_amount)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => printReceipt(bill)}
                          leftIcon={<Printer className="w-4 h-4" />}
                          className="flex-1"
                        >
                          Print
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => confirmPayment(bill)}
                          disabled={processing}
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {processing ? "Confirming..." : "Confirm Payment"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}

              {/* Takeaway Bills */}
              {takeawayBills.map((bill) => (
                <Card key={bill.id} className="border-2 border-purple-200">
                  <div className="p-6">
                    {/* Bill Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            Takeaway Order
                          </h3>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                            🥡 TAKEAWAY
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Bill #{bill.bill_number}
                        </div>
                        {bill.staff && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <User className="w-3 h-3" />
                            <span>Processed by {bill.staff.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{getTimeSince(bill.generated_at)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(bill.final_amount)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {bill.payment_method?.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Bill Items Preview */}
                    <div className="mb-4 space-y-1">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Items ({bill.bill_items.length})
                      </div>
                      {bill.bill_items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm text-gray-600"
                        >
                          <span>
                            {item.quantity}x {item.item_name}
                          </span>
                          <span>{formatCurrency(item.total_price)}</span>
                        </div>
                      ))}
                      {bill.bill_items.length > 3 && (
                        <div className="text-xs text-gray-500 italic">
                          +{bill.bill_items.length - 3} more items
                        </div>
                      )}
                    </div>

                    {/* Bill Summary */}
                    <div className="border-t pt-3 mb-4 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>{formatCurrency(bill.subtotal)}</span>
                      </div>
                      {bill.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Discount
                            {(bill as any).offer?.name && (
                              <span className="text-xs text-green-600 ml-1">
                                ({(bill as any).offer.name})
                              </span>
                            )}:
                          </span>
                          <span className="text-red-600">
                            -{formatCurrency(bill.discount_amount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Taxes:</span>
                        <span>{formatCurrency(bill.total_tax_amount)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => printReceipt(bill)}
                        leftIcon={<Printer className="w-4 h-4" />}
                        className="flex-1"
                      >
                        Print
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => confirmPayment(bill)}
                        disabled={processing}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {processing ? "Confirming..." : "Confirm Payment"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Success Modal */}
        {showSuccessModal && lastConfirmedBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="text-center">
                <div className="p-4 bg-green-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Payment Confirmed!
                </h3>
                <p className="text-gray-600 mb-1">
                  Bill: {lastConfirmedBill.bill_number}
                </p>
                <p className="text-2xl font-bold text-green-600 mb-6">
                  {formatCurrency(lastConfirmedBill.final_amount)}
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowSuccessModal(false);
                      setLastConfirmedBill(null);
                    }}
                    className="flex-1"
                  >
                    Done
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      printReceipt(lastConfirmedBill);
                      setShowSuccessModal(false);
                      setLastConfirmedBill(null);
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
    </RoleGuard>
  );
}
