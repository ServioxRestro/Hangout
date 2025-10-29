"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import Button from "../Button";
import { formatCurrency } from "@/lib/constants";
import { X, Plus, Trash2, Receipt, AlertCircle } from "lucide-react";
import type { TableWithSession } from "@/hooks/useTableSessions";
import {
  calculateBill as calculateBillUtil,
  type BillItem,
} from "@/lib/utils/billing";
import { useBillCalculation } from "@/hooks/useBillCalculation";
import { BillSummary } from "@/components/billing/BillSummary";

interface ManualItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface BillProcessingModalProps {
  table: TableWithSession;
  manualItems: ManualItem[];
  onAddManualItem: () => void;
  onRemoveManualItem: (id: string) => void;
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

export function BillProcessingModal({
  table,
  manualItems,
  onAddManualItem,
  onRemoveManualItem,
  onClose,
  onSuccess,
}: BillProcessingModalProps) {
  const [taxSettings, setTaxSettings] = useState<TaxSetting[]>([]);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [offerInfo, setOfferInfo] = useState<{
    id: string;
    name: string;
    discount: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">(
    "cash"
  );
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [existingBill, setExistingBill] = useState<any>(null);
  const [loadingBill, setLoadingBill] = useState(true);

  useEffect(() => {
    fetchExistingBill();
    fetchTaxSettings();
    fetchOfferInfo();
    fetchTaxMode();
  }, []);

  const fetchExistingBill = async () => {
    if (!table.session) {
      setLoadingBill(false);
      return;
    }

    try {
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .select(
          `
          *,
          bill_items (
            id,
            item_name,
            quantity,
            unit_price,
            total_price
          )
        `
        )
        .eq("table_session_id", table.session.id)
        .in("payment_status", ["pending", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (billError && billError.code !== "PGRST116") {
        console.error("Error fetching existing bill:", billError);
      }

      if (billData) {
        setExistingBill(billData);
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
    } finally {
      setLoadingBill(false);
    }
  };

  const fetchOfferInfo = async () => {
    try {
      if (!table.session) return;

      // First try to fetch from offer_usage table (guest orders)
      const { data: offerUsage, error: offerUsageError } = await supabase
        .from("offer_usage")
        .select(
          `
          discount_amount,
          offers (
            id,
            name,
            offer_type,
            benefits,
            conditions
          )
        `
        )
        .eq("table_session_id", table.session.id)
        .maybeSingle();

      if (offerUsageError) {
        console.error("Error fetching offer usage:", offerUsageError);
      }

      let offer: any = null;

      // If found in offer_usage, use it
      if (offerUsage && offerUsage.offers) {
        offer = offerUsage.offers as any;
      } else {
        // Fallback: Check session's locked_offer_data (admin orders)
        if (table.session.locked_offer_data) {
          const lockedOffer = table.session.locked_offer_data as any;
          offer = {
            id: lockedOffer.offer_id,
            name: lockedOffer.name,
            offer_type: lockedOffer.offer_type,
            benefits: lockedOffer.benefits,
            conditions: lockedOffer.conditions,
          };
        }
      }

      if (offer) {
        // Calculate discount based on offer type and current subtotal
        const subtotal =
          (table.session.orders || []).reduce(
            (sum, order) => sum + (order.total_amount || 0),
            0
          ) + manualItems.reduce((sum, item) => sum + item.total_price, 0);

        let discount = 0;
        const benefits = offer.benefits as any;

        if (
          offer.offer_type === "cart_percentage" &&
          benefits?.discount_percentage
        ) {
          // Round to nearest whole number
          discount = Math.round(
            (subtotal * benefits.discount_percentage) / 100
          );
        } else if (
          offer.offer_type === "cart_flat_amount" &&
          benefits?.discount_amount
        ) {
          discount = Math.round(benefits.discount_amount);
        } else if (offer.offer_type === "min_order_discount") {
          const conditions = offer.conditions as any;
          if (
            subtotal >= conditions?.min_order_amount &&
            benefits?.discount_percentage
          ) {
            discount = Math.round(
              (subtotal * benefits.discount_percentage) / 100
            );
          }
        } else if (
          offer.offer_type === "promo_code" ||
          offer.offer_type === "time_based" ||
          offer.offer_type === "customer_based"
        ) {
          if (benefits?.discount_percentage) {
            discount = Math.round(
              (subtotal * benefits.discount_percentage) / 100
            );
          } else if (benefits?.discount_amount) {
            discount = Math.round(benefits.discount_amount);
          }
        }

        setOfferInfo({
          id: offer.id,
          name: offer.name,
          discount: discount,
        });

        // Set the discount percentage to 0 since offer handles it
        setDiscountPercentage(0);
      }
    } catch (error) {
      console.error("Error fetching offer info:", error);
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

  const fetchTaxMode = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("setting_value")
        .eq("setting_key", "tax_inclusive")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching tax mode:", error);
        return;
      }

      setTaxInclusive(data?.setting_value === "true");
    } catch (error) {
      console.error("Error fetching tax mode:", error);
    }
  };

  const calculateBill = () => {
    if (!table.session?.orders) {
      return {
        items_with_taxes: [],
        subtotal: 0,
        taxable_subtotal: 0,
        total_gst: 0,
        subtotal_with_tax: 0,
        discount_amount: 0,
        final_amount: 0,
      };
    }

    // Build bill items from order items (always use original prices from items)
    const orderItems: BillItem[] = (table.session.orders || []).flatMap(
      (order) =>
        (order.order_items || []).map((item) => ({
          name: item.menu_items?.name || "Unknown Item",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))
    );

    const manualBillItems: BillItem[] = manualItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      is_manual: true,
    }));

    const allItems = [...orderItems, ...manualBillItems];

    // Calculate actual discount for combo/BOGO orders
    // Discount = (sum of item prices) - (order total)
    let actualDiscountAmount = 0;

    // Check if any order has combo or BOGO offer
    const comboOrBogoOrder = (table.session.orders || []).find(
      (order) =>
        order.session_offer?.offer_type === "combo_meal" ||
        order.session_offer?.offer_type === "item_buy_get_free"
    );

    if (comboOrBogoOrder) {
      // Sum of all items in the combo/BOGO order at original prices
      const itemsSum = (comboOrBogoOrder.order_items || []).reduce(
        (sum, item) => sum + item.total_price,
        0
      );
      // The difference is the discount
      actualDiscountAmount = itemsSum - comboOrBogoOrder.total_amount;
    }

    // Calculate discount percentage for the billing utility
    const itemsTotal = allItems.reduce(
      (sum, item) => sum + item.total_price,
      0
    );

    let effectiveDiscountPercentage = discountPercentage;

    if (actualDiscountAmount > 0) {
      // Use actual discount from combo/BOGO
      effectiveDiscountPercentage = (actualDiscountAmount / itemsTotal) * 100;
    } else if (offerInfo?.discount) {
      // Use offer discount from session offers
      effectiveDiscountPercentage = (offerInfo.discount / itemsTotal) * 100;
    }

    // Use the utility function with tax_inclusive parameter
    const calculation = calculateBillUtil(
      allItems,
      effectiveDiscountPercentage,
      taxSettings.map((tax) => ({ name: tax.name, rate: tax.rate })),
      taxInclusive
    );

    return calculation;
  };

  // Use existing bill if it exists, otherwise calculate preview
  const billSummary = existingBill
    ? {
        items_with_taxes: (existingBill.bill_items || []).map((item: any) => ({
          name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          base_price: item.unit_price,
          item_taxes: [],
        })),
        subtotal: Number(existingBill.subtotal || 0),
        taxable_subtotal: Number(existingBill.subtotal || 0),
        total_gst: Number(existingBill.total_tax_amount || 0),
        subtotal_with_tax:
          Number(existingBill.subtotal || 0) +
          Number(existingBill.total_tax_amount || 0),
        discount_amount: Number(existingBill.discount_amount || 0),
        final_amount: Number(existingBill.final_amount || 0),
      }
    : calculateBill();

  const handleProcessBill = async () => {
    if (!table.session) return;

    setProcessing(true);
    setError("");

    try {
      // Check if bill already exists for this session
      const { data: existingBills, error: checkError } = await supabase
        .from("bills")
        .select("id, bill_number, payment_status")
        .eq("table_session_id", table.session.id)
        .in("payment_status", ["pending", "paid"]);

      if (checkError) throw checkError;

      if (existingBills && existingBills.length > 0) {
        const existingBill = existingBills[0];
        throw new Error(
          `Bill already exists for this table (${existingBill.bill_number}). ` +
            `Status: ${existingBill.payment_status}. ` +
            `Please check the Bills & Payment page.`
        );
      }

      // Get current user (staff member)
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

      // Create offer usage record if offer was applied
      if (offerInfo) {
        await supabase.from("offer_usage").insert({
          offer_id: offerInfo.id,
          table_session_id: table.session.id,
          customer_phone: table.session.customer_phone,
          discount_amount: offerInfo.discount,
          used_at: new Date().toISOString(),
        });
      }

      // Aggregate taxes from all items for bill table
      const aggregatedTaxes = billSummary.items_with_taxes.reduce(
        (acc, item) => {
          item.item_taxes.forEach((tax) => {
            const existing = acc.find((t) => t.name === tax.name);
            if (existing) {
              existing.amount += tax.amount;
            } else {
              acc.push({ name: tax.name, rate: tax.rate, amount: tax.amount });
            }
          });
          return acc;
        },
        [] as Array<{ name: string; rate: number; amount: number }>
      );

      // Create bill with pending status
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert({
          bill_number: billNumber,
          table_session_id: table.session.id,
          subtotal: billSummary.subtotal,
          discount_percentage: offerInfo ? 0 : discountPercentage, // Set to 0 if offer, otherwise manual %
          discount_amount: billSummary.discount_amount,
          cgst_rate:
            aggregatedTaxes.find((t) => t.name.includes("CGST"))?.rate || 0,
          cgst_amount:
            aggregatedTaxes.find((t) => t.name.includes("CGST"))?.amount || 0,
          sgst_rate:
            aggregatedTaxes.find((t) => t.name.includes("SGST"))?.rate || 0,
          sgst_amount:
            aggregatedTaxes.find((t) => t.name.includes("SGST"))?.amount || 0,
          service_charge_rate:
            aggregatedTaxes.find((t) => t.name.includes("Service"))?.rate || 0,
          service_charge_amount:
            aggregatedTaxes.find((t) => t.name.includes("Service"))?.amount ||
            0,
          total_tax_amount: billSummary.total_gst,
          final_amount: billSummary.final_amount,
          payment_status: "pending", // Staff processed, awaiting manager confirmation
          payment_method: paymentMethod,
          generated_by: user.id, // Staff member who generated the bill
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill items from orders
      const orderBillItems = (table.session.orders || []).flatMap((order) =>
        (order.order_items || []).map((item) => ({
          bill_id: billData.id,
          order_item_id: item.id,
          item_name: item.menu_items?.name || "Unknown Item",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))
      );

      // Create bill items from manual items
      const manualBillItems = manualItems.map((item) => ({
        bill_id: billData.id,
        order_item_id: null,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const allBillItems = [...orderBillItems, ...manualBillItems];

      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(allBillItems);

      if (itemsError) throw itemsError;

      // Update orders status to pending_payment
      const orderIds = (table.session.orders || []).map((o) => o.id);
      const { error: ordersError } = await supabase
        .from("orders")
        .update({
          status: "pending_payment",
          updated_at: new Date().toISOString(),
        })
        .in("id", orderIds);

      if (ordersError) throw ordersError;

      onSuccess();
    } catch (error: any) {
      console.error("Error processing bill:", error);
      setError(error.message || "Failed to process bill");
    } finally {
      setProcessing(false);
    }
  };

  if (!table.session) return null;

  const isExistingBill = !!existingBill;
  const billTitle = isExistingBill ? "View Bill" : "Process Bill";

  if (loadingBill) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bill...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {billTitle} - Table {table.table.table_number}
            </h3>
            {isExistingBill && (
              <p className="text-sm text-gray-600 mt-1">
                Bill #{existingBill.bill_number} •{" "}
                <span className="capitalize">
                  {existingBill.payment_status}
                </span>
              </p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              Bill will be sent to manager for confirmation
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Bill Items */}
        <div className="p-6 space-y-4">
          {/* Order Items */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              {isExistingBill ? "Bill Items" : "Order Items"}
            </h4>
            <div className="space-y-2">
              {isExistingBill
                ? // Show items from existing bill
                  (existingBill.bill_items || []).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {item.quantity}x {item.item_name}
                        </span>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(item.unit_price)} each
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  ))
                : // Show items from orders (preview mode)
                  (table.session.orders || []).map((order) =>
                    (order.order_items || []).map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {item.quantity}x {item.menu_items?.name}
                          </span>
                          <div className="text-sm text-gray-600">
                            {formatCurrency(item.unit_price)} each
                          </div>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                    ))
                  )}
            </div>
          </div>

          {/* Manual Items - Only show in preview mode */}
          {!isExistingBill && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  Additional Items
                </h4>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onAddManualItem}
                  leftIcon={<Plus className="w-3 h-3" />}
                >
                  Add Item
                </Button>
              </div>
              {manualItems.length > 0 ? (
                <div className="space-y-2">
                  {manualItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {item.quantity}x {item.name}
                        </span>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(item.unit_price)} each
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(item.total_price)}
                        </span>
                        <button
                          onClick={() => onRemoveManualItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No additional items
                </p>
              )}
            </div>
          )}

          {/* Bill Summary */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal (Base Price):</span>
              <span className="font-medium">
                {formatCurrency(billSummary.subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Total GST:</span>
              <span>{formatCurrency(billSummary.total_gst)}</span>
            </div>

            <div className="flex justify-between text-gray-700 border-t pt-2">
              <span>Total Before Discount:</span>
              <span className="font-medium">
                {formatCurrency(billSummary.subtotal_with_tax)}
              </span>
            </div>

            {offerInfo ? (
              <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                <span className="text-gray-700">
                  Discount{" "}
                  <span className="text-xs text-green-600 font-medium">
                    ({offerInfo.name})
                  </span>
                  :
                </span>
                <span className="text-sm font-medium text-green-600">
                  -{formatCurrency(billSummary.discount_amount)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Discount:</span>
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
                  />
                  <span className="text-sm">%</span>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(billSummary.discount_amount)}
                  </span>
                </div>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Grand Total:</span>
              <span className="text-green-600">
                {formatCurrency(billSummary.final_amount)}
              </span>
            </div>
          </div>

          {/* Payment Method - Only show in preview mode */}
          {!isExistingBill && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                Payment Method
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {(["cash", "upi", "card"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-4 text-center border-2 rounded-lg transition-all ${
                      paymentMethod === method
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-3xl mb-2">
                      {method === "cash"
                        ? "💵"
                        : method === "upi"
                        ? "📱"
                        : "💳"}
                    </div>
                    <div className="text-sm font-medium capitalize">
                      {method}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          {!isExistingBill && (
            <Button
              variant="primary"
              onClick={handleProcessBill}
              disabled={processing}
              className="flex-1"
              leftIcon={
                processing ? undefined : <Receipt className="w-4 h-4" />
              }
            >
              {processing ? "Processing..." : "Generate Bill"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
