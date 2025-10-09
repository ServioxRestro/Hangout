"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Button from "@/components/admin/Button";
import { formatCurrency } from "@/lib/constants";
import { CheckCircle, Printer, X } from "lucide-react";
import {
  generateHTMLReceipt,
  printHTMLReceipt,
  type BillItem,
} from "@/lib/utils/billing";
import type { OrderWithDetails } from "@/hooks/useBilling";

interface ManualItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: OrderWithDetails[];
  manualItems: ManualItem[];
  taxSettings: any[];
  onPaymentComplete: (billData: any) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  selectedOrders,
  manualItems,
  taxSettings,
  onPaymentComplete,
}: PaymentModalProps) {
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  const [processing, setProcessing] = useState(false);
  const [billSummary, setBillSummary] = useState<BillSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      calculateBill();
    }
  }, [isOpen, selectedOrders, manualItems, discountPercentage, taxSettings]);

  const calculateBill = () => {
    const ordersSubtotal = selectedOrders.reduce(
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

  const handlePrint = () => {
    if (!billSummary) return;

    const allOrderItems = selectedOrders.flatMap((order) => order.order_items);

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

    // Determine order type and table info
    const firstOrder = selectedOrders[0];
    const orderType = firstOrder?.order_type || "dine-in";
    const tableNumber = firstOrder?.table_sessions?.restaurant_tables
      ?.table_number
      ? String(firstOrder.table_sessions.restaurant_tables.table_number)
      : undefined;

    const htmlReceipt = generateHTMLReceipt({
      tableNumber,
      orderType: orderType as "dine-in" | "takeaway",
      items: billItems,
      calculation: {
        subtotal: billSummary.subtotal,
        discount_amount: billSummary.discountAmount,
        taxable_amount: billSummary.subtotal - billSummary.discountAmount,
        taxes: billSummary.taxes,
        tax_amount: billSummary.taxAmount,
        final_amount: billSummary.finalAmount,
      },
      paymentMethod,
      discountPercentage,
    });

    printHTMLReceipt(htmlReceipt);
  };

  const handlePayment = async () => {
    if (!billSummary || selectedOrders.length === 0) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to verify admin");
      }

      const { user } = await response.json();

      // Create bill number
      const billNumber = `BILL-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-6)}`;

      // Determine if this is a session or standalone orders
      const firstOrder = selectedOrders[0];
      const tableSessionId = firstOrder?.table_session_id || null;

      // Create bill
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert({
          bill_number: billNumber,
          table_session_id: tableSessionId,
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

      // Create bill items
      const allOrderItems = selectedOrders.flatMap((order) =>
        order.order_items.map((item) => ({
          bill_id: billData.id,
          order_item_id: item.id,
          item_name: item.menu_items?.name || "Unknown Item",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))
      );

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

      // Update orders to paid
      const orderIds = selectedOrders.map((o) => o.id);
      const { error: ordersError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .in("id", orderIds);

      if (ordersError) throw ordersError;

      // If session exists, mark it as completed
      if (tableSessionId) {
        await supabase
          .from("table_sessions")
          .update({
            status: "completed",
            payment_method: paymentMethod,
            paid_at: new Date().toISOString(),
            session_ended_at: new Date().toISOString(),
          })
          .eq("id", tableSessionId);
      }

      onPaymentComplete({
        ...billData,
        billNumber,
        finalAmount: billSummary.finalAmount,
      });
    } catch (error: any) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !billSummary) return null;

  return (
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
                {selectedOrders.length} order(s) selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={processing}
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
                      setDiscountPercentage(parseFloat(e.target.value) || 0)
                    }
                    className="w-16 px-2 py-1 border rounded text-center text-sm"
                    disabled={processing}
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
                    disabled={processing}
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
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
              disabled={processing}
            >
              Print
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePayment}
              className="flex-1"
              disabled={processing}
              leftIcon={
                processing ? undefined : <CheckCircle className="w-4 h-4" />
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
  );
}
