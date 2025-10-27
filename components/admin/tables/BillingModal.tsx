"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import FormField from "@/components/admin/FormField";
import Input from "@/components/admin/Input";
import { formatCurrency } from "@/lib/constants";
import {
  generateHTMLReceipt,
  printHTMLReceipt,
  calculateBill,
  type BillItem,
} from "@/lib/utils/billing";
import { X, Printer, CheckCircle, Loader2 } from "lucide-react";
import type { TableWithSession } from "@/hooks/useTableSessions";

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: TableWithSession;
  manualItems: Array<{
    id: string;
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  onPaymentComplete: () => void;
}

export function BillingModal({
  isOpen,
  onClose,
  selectedTable,
  manualItems,
  onPaymentComplete,
}: BillingModalProps) {
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  const [processing, setProcessing] = useState(false);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [billSummary, setBillSummary] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTaxSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTable?.session) {
      calculateBillSummary();
    }
  }, [selectedTable, discountPercentage, manualItems, taxSettings]);

  const fetchTaxSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("tax_settings")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setTaxSettings(data || []);
    } catch (error) {
      console.error("Error fetching tax settings:", error);
    }
  };

  const calculateBillSummary = () => {
    if (!selectedTable?.session) return;

    // Prepare all bill items (orders + manual)
    const orderItems: BillItem[] = (selectedTable.session.orders || []).flatMap(order =>
      (order.order_items || []).map(item => ({
        name: item.menu_items?.name || "Unknown Item",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))
    );

    const manualBillItems: BillItem[] = manualItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      is_manual: true,
    }));

    const allItems = [...orderItems, ...manualBillItems];

    // Use the new utility function
    const calculation = calculateBill(
      allItems,
      discountPercentage,
      taxSettings.map(tax => ({ name: tax.name, rate: tax.rate })),
      false // TODO: Fetch tax_inclusive setting
    );

    // Aggregate taxes for compatibility
    const aggregatedTaxes = calculation.items_with_taxes.reduce((acc, item) => {
      item.item_taxes.forEach(tax => {
        const existing = acc.find(t => t.name === tax.name);
        if (existing) {
          existing.amount += tax.amount;
        } else {
          acc.push({ name: tax.name, rate: tax.rate, amount: tax.amount });
        }
      });
      return acc;
    }, [] as Array<{ name: string; rate: number; amount: number }>);

    // Convert to old format for compatibility
    setBillSummary({
      subtotal: calculation.subtotal,
      discountPercentage,
      discountAmount: calculation.discount_amount,
      taxableAmount: calculation.taxable_subtotal,
      taxAmount: calculation.total_gst,
      finalAmount: calculation.final_amount,
      taxes: aggregatedTaxes,
    });
  };

  const handlePrint = async () => {
    if (!selectedTable?.session || !billSummary) return;

    const sessionOrders = selectedTable.session.orders || [];
    const allOrderItems = sessionOrders.flatMap((order) => order.order_items);

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

    // Reconstruct items_with_taxes from billSummary (assumes all items have same tax rates)
    const items_with_taxes = billItems.map(item => {
      const totalTaxRate = billSummary.taxes.reduce((sum: number, tax: any) => sum + tax.rate, 0);
      const base_price = item.total_price / (1 + totalTaxRate / 100);
      const item_taxes = billSummary.taxes.map((tax: any) => ({
        name: tax.name,
        rate: tax.rate,
        amount: (base_price * tax.rate) / 100,
      }));

      return {
        ...item,
        base_price: Math.round(base_price * 100) / 100,
        item_taxes: item_taxes.map((t: any) => ({
          ...t,
          amount: Math.round(t.amount * 100) / 100,
        })),
      };
    });

    const htmlReceipt = generateHTMLReceipt({
      tableNumber: String(selectedTable.table.table_number),
      orderType: "dine-in",
      customerName: selectedTable.session.guest_users?.name || "Guest",
      customerPhone: selectedTable.session.customer_phone || undefined,
      calculation: {
        items_with_taxes,
        subtotal: billSummary.subtotal,
        taxable_subtotal: billSummary.taxableAmount,
        total_gst: billSummary.taxAmount,
        subtotal_with_tax: billSummary.subtotal + billSummary.taxAmount,
        discount_amount: billSummary.discountAmount,
        final_amount: billSummary.finalAmount,
      },
      paymentMethod,
      discountPercentage,
    });

    printHTMLReceipt(htmlReceipt);
  };

  const handlePayment = async () => {
    if (!selectedTable?.session || !billSummary) return;

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

      // Generate bill number (format: BILL-YYYYMMDD-XXX)
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const billNumber = `BILL-${today}-${randomSuffix}`;

      // Prepare tax breakdown
      const cgst = billSummary.taxes.find((t: any) => t.name.toLowerCase().includes('cgst'));
      const sgst = billSummary.taxes.find((t: any) => t.name.toLowerCase().includes('sgst'));
      const igst = billSummary.taxes.find((t: any) => t.name.toLowerCase().includes('igst'));
      const serviceCharge = billSummary.taxes.find((t: any) => t.name.toLowerCase().includes('service'));

      // Create bill record
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert({
          bill_number: billNumber,
          table_session_id: selectedTable.session.id,
          subtotal: billSummary.subtotal,
          discount_amount: billSummary.discountAmount,
          discount_percentage: discountPercentage,
          cgst_rate: cgst?.rate || null,
          cgst_amount: cgst?.amount || null,
          sgst_rate: sgst?.rate || null,
          sgst_amount: sgst?.amount || null,
          igst_rate: igst?.rate || null,
          igst_amount: igst?.amount || null,
          service_charge_rate: serviceCharge?.rate || null,
          service_charge_amount: serviceCharge?.amount || null,
          total_tax_amount: billSummary.taxAmount,
          final_amount: billSummary.finalAmount,
          payment_method: paymentMethod,
          payment_status: "paid",
          generated_by: user.id,
          payment_received_by: user.id,
          generated_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill_items records
      const sessionOrders = selectedTable.session.orders || [];
      const allOrderItems = sessionOrders.flatMap((order) => order.order_items);

      const billItemsData = [
        // Order items from orders
        ...allOrderItems.map((item) => ({
          bill_id: billData.id,
          order_item_id: item.id,
          item_name: item.menu_items?.name || "Unknown",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          is_cancelled: false,
        })),
        // Manual items
        ...manualItems.map((item) => ({
          bill_id: billData.id,
          order_item_id: null, // Manual items don't have order_item_id
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          is_cancelled: false,
        })),
      ];

      if (billItemsData.length > 0) {
        const { error: billItemsError } = await supabase
          .from("bill_items")
          .insert(billItemsData);

        if (billItemsError) throw billItemsError;
      }

      // Update session
      const { error: sessionError } = await supabase
        .from("table_sessions")
        .update({
          status: "completed",
          session_ended_at: new Date().toISOString(),
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          payment_received_by: user.id,
        })
        .eq("id", selectedTable.session.id);

      if (sessionError) throw sessionError;

      // Update all orders to paid (not completed, paid is the final status)
      const orderIds = selectedTable.session.orders?.map((o) => o.id) || [];
      if (orderIds.length > 0) {
        const { error: ordersError } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .in("id", orderIds);

        if (ordersError) throw ordersError;
      }

      onPaymentComplete();
      onClose();
    } catch (error: any) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Process Payment - Table {selectedTable.table.table_number}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={processing}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {billSummary && (
            <>
              {/* Bill Summary */}
              <Card className="mb-4">
                <div className="p-4">
                  <h3 className="font-semibold mb-3">Bill Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">
                        {formatCurrency(billSummary.subtotal)}
                      </span>
                    </div>

                    <FormField label="Discount %">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercentage}
                        onChange={(e) =>
                          setDiscountPercentage(Number(e.target.value))
                        }
                        disabled={processing}
                      />
                    </FormField>

                    {billSummary.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({discountPercentage}%)</span>
                        <span>-{formatCurrency(billSummary.discountAmount)}</span>
                      </div>
                    )}

                    {billSummary.taxes.map((tax: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-600">
                          {tax.name} ({tax.rate}%)
                        </span>
                        <span>{formatCurrency(tax.amount)}</span>
                      </div>
                    ))}

                    <div className="flex justify-between pt-3 border-t border-gray-200">
                      <span className="font-bold text-lg">Total</span>
                      <span className="font-bold text-lg text-blue-600">
                        {formatCurrency(billSummary.finalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Method */}
              <FormField label="Payment Method">
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "upi", "card"] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      disabled={processing}
                      className={`py-2 px-4 rounded border capitalize ${
                        paymentMethod === method
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  disabled={processing}
                  leftIcon={<Printer className="w-4 h-4" />}
                  className="flex-1"
                >
                  Print Bill
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePayment}
                  disabled={processing}
                  leftIcon={
                    processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )
                  }
                  className="flex-1"
                >
                  {processing ? "Processing..." : "Complete Payment"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
