"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Button from "../Button";
import { formatCurrency } from "@/lib/constants";
import { X, Receipt, Printer } from "lucide-react";
import {
  generateHTMLReceipt,
  printHTMLReceipt,
  type BillItem,
} from "@/lib/utils/billing";

interface TakeawayBillModalProps {
  customer: {
    customerName: string;
    customerPhone: string | null;
    orders: any[];
    totalAmount: number;
    earliestOrderTime?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface TaxSetting {
  id: string;
  name: string;
  rate: number;
  is_active: boolean | null;
  display_order?: number | null;
  applies_to?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export function TakeawayBillModal({
  customer,
  onClose,
  onSuccess,
}: TakeawayBillModalProps) {
  const [taxSettings, setTaxSettings] = useState<TaxSetting[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">(
    "cash"
  );
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTaxSettings();
  }, []);

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
    const subtotal = customer.orders.reduce(
      (sum, order) => sum + order.total_amount,
      0
    );

    const discountAmount = (subtotal * discountPercentage) / 100;
    const taxableAmount = subtotal - discountAmount;

    const taxes = taxSettings.map((tax) => ({
      name: tax.name,
      rate: tax.rate,
      amount: (taxableAmount * tax.rate) / 100,
    }));

    const taxAmount = taxes.reduce((sum, tax) => sum + tax.amount, 0);
    const finalAmount = taxableAmount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxes,
      taxAmount,
      finalAmount,
    };
  };

  const bill = calculateBill();

  const handleProcessBill = async () => {
    setProcessing(true);
    setError("");

    try {
      // Get current user
      const response = await fetch("/api/admin/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to verify user");
      const { user } = await response.json();

      // Generate bill number
      const billNumber = `BILL-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-6)}`;

      // Create bill with pending status (staff processed, awaiting manager confirmation)
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert({
          bill_number: billNumber,
          table_session_id: null, // Takeaway has no session
          subtotal: bill.subtotal,
          discount_percentage: discountPercentage,
          discount_amount: bill.discountAmount,
          cgst_rate:
            bill.taxes.find((t) => t.name.includes("CGST"))?.rate || 0,
          cgst_amount:
            bill.taxes.find((t) => t.name.includes("CGST"))?.amount || 0,
          sgst_rate:
            bill.taxes.find((t) => t.name.includes("SGST"))?.rate || 0,
          sgst_amount:
            bill.taxes.find((t) => t.name.includes("SGST"))?.amount || 0,
          service_charge_rate:
            bill.taxes.find((t) => t.name.includes("Service"))?.rate || 0,
          service_charge_amount:
            bill.taxes.find((t) => t.name.includes("Service"))?.amount || 0,
          total_tax_amount: bill.taxAmount,
          final_amount: bill.finalAmount,
          payment_status: "pending", // Staff processed, awaiting manager confirmation
          payment_method: paymentMethod,
          generated_by: user.id, // Staff member who generated the bill
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill items from all order items
      const allOrderItems = customer.orders.flatMap((order) =>
        order.order_items.map((item: any) => ({
          bill_id: billData.id,
          order_item_id: item.id,
          item_name: item.menu_items?.name || "Unknown Item",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))
      );

      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(allOrderItems);

      if (itemsError) throw itemsError;

      // Update all orders to pending_payment (awaiting manager confirmation)
      const orderIds = customer.orders.map((o) => o.id);
      const { error: ordersError } = await supabase
        .from("orders")
        .update({
          status: "pending_payment",
          updated_at: new Date().toISOString(),
        })
        .in("id", orderIds);

      if (ordersError) throw ordersError;

      onSuccess();
    } catch (err: any) {
      console.error("Error processing bill:", err);
      setError(err.message || "Failed to process bill");
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    // Prepare bill items for receipt
    const billItems: BillItem[] = customer.orders.flatMap((order) =>
      order.order_items.map((item: any) => ({
        name: item.menu_items?.name || "Unknown",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_manual: false,
      }))
    );

    const htmlReceipt = generateHTMLReceipt({
      orderType: "takeaway",
      items: billItems,
      calculation: {
        subtotal: bill.subtotal,
        discount_amount: bill.discountAmount,
        taxable_amount: bill.subtotal - bill.discountAmount,
        taxes: bill.taxes,
        tax_amount: bill.taxAmount,
        final_amount: bill.finalAmount,
      },
      paymentMethod,
      discountPercentage,
    });

    printHTMLReceipt(htmlReceipt);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Process Takeaway Bill
              </h2>
              <p className="text-gray-600">
                {customer.customerName} • {customer.orders.length} order(s)
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

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Bill Summary */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(bill.subtotal)}
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
                    -{formatCurrency(bill.discountAmount)}
                  </span>
                </div>
              </div>

              {/* Taxes */}
              {bill.taxes.map((tax) => (
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
                    {formatCurrency(bill.finalAmount)}
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
              variant="primary"
              onClick={handleProcessBill}
              leftIcon={<Receipt className="w-4 h-4" />}
              loading={processing}
              className="flex-1"
            >
              Confirm Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
