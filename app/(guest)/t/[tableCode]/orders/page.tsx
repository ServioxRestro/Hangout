"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/msg91-widget";
import { formatCurrency } from "@/lib/utils";
import {
  Clock,
  CheckCircle,
  ChefHat,
  Utensils,
  Receipt,
  AlertCircle,
  User,
  FileText,
  Loader2
} from "lucide-react";
import type { Tables } from "@/types/database.types";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { calculateBill, type BillItem, type BillCalculation } from "@/lib/utils/billing";
import { useGuestOrders } from "@/hooks/useGuestOrders";

type Order = Tables<"orders"> & {
  order_items: Array<
    Tables<"order_items"> & {
      menu_items: Tables<"menu_items"> | null;
    }
  >;
};

export default function OrdersPage() {
  const params = useParams();
  const tableCode = params?.tableCode as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showBill, setShowBill] = useState(false);
  const [billSummary, setBillSummary] = useState<any>(null);
  const [processingBill, setProcessingBill] = useState(false);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [taxInclusive, setTaxInclusive] = useState(false);

  // Use React Query hook for auto-refreshing orders
  const {
    data: ordersData,
    isLoading,
    error: queryError
  } = useGuestOrders({
    tableCode,
    userPhone: currentUser?.phone || "",
    enabled: !!currentUser?.phone && !showBill
  });

  const orders = ordersData?.orders || [];
  const sessionOffer = ordersData?.sessionOffer || null;
  const loading = isLoading;
  const error = queryError ? (queryError as any).message : "";

  // Fetch tax settings and tax mode once on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch tax settings
        const { data: taxData, error: taxError } = await supabase
          .from("tax_settings")
          .select("*")
          .eq("is_active", true)
          .order("display_order");

        if (taxError) throw taxError;
        setTaxSettings(taxData || []);

        // Fetch tax mode
        const { data: taxModeData, error: taxModeError } = await supabase
          .from("restaurant_settings")
          .select("setting_value")
          .eq("setting_key", "tax_inclusive")
          .single();

        if (taxModeError && taxModeError.code !== "PGRST116") {
          console.error("Error fetching tax mode:", taxModeError);
        } else {
          setTaxInclusive(taxModeData?.setting_value === "true");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    const checkUser = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          return;
        }
        setCurrentUser(user);
      } catch (error) {
        console.error("Error checking user:", error);
      }
    };

    if (tableCode) {
      checkUser();
      fetchSettings();
    }
  }, [tableCode]);

  const handleGetBill = async () => {
    // If bill already generated in UI, just show it
    if (billSummary) {
      setShowBill(true);
      return;
    }

    setProcessingBill(true);
    try {
      // First, check if bill already exists in database (processed by staff)
      // Get table session ID from orders
      const sessionId = activeOrders[0]?.table_session_id;

      if (sessionId) {
        const { data: existingBills, error: billCheckError } = await supabase
          .from("bills")
          .select(`
            *,
            bill_items (
              id,
              item_name,
              quantity,
              unit_price,
              total_price
            )
          `)
          .eq("table_session_id", sessionId)
          .in("payment_status", ["pending", "paid"])
          .order("created_at", { ascending: false })
          .limit(1);

        if (billCheckError) {
          console.error("Error checking existing bills:", billCheckError);
        }

        // If bill exists, show it (view-only mode)
        if (existingBills && existingBills.length > 0) {
          const existingBill = existingBills[0];

          // Fetch offer information if this bill has a discount
          let offerName = null;
          if (existingBill.discount_amount && existingBill.discount_amount > 0) {
            console.log("🔍 Fetching offer for session:", sessionId);
            const { data: offerUsageData, error: offerError } = await supabase
              .from("offer_usage")
              .select(`
                offers (
                  name
                )
              `)
              .eq("table_session_id", sessionId)
              .maybeSingle();

            if (offerError) {
              console.error("❌ Error fetching offer:", offerError);
            } else if (offerUsageData && offerUsageData.offers) {
              offerName = (offerUsageData.offers as any).name;
              console.log("✅ Offer found:", offerName);
            } else {
              console.log("⚠️ No offer found for this session");
            }
          }

          // Convert database bill to new BillCalculation format
          const billItems: BillItem[] = (existingBill.bill_items || []).map(item => ({
            name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            is_manual: false,
          }));

          // Reconstruct items_with_taxes for old bills
          const totalTaxRate = (existingBill.cgst_rate || 0) + (existingBill.sgst_rate || 0) + (existingBill.service_charge_rate || 0);
          const items_with_taxes = billItems.map(item => {
            const base_price = item.total_price / (1 + totalTaxRate / 100);
            const item_taxes = [];

            if (existingBill.cgst_rate && existingBill.cgst_rate > 0) {
              item_taxes.push({
                name: "CGST",
                rate: existingBill.cgst_rate,
                amount: (base_price * existingBill.cgst_rate) / 100,
              });
            }
            if (existingBill.sgst_rate && existingBill.sgst_rate > 0) {
              item_taxes.push({
                name: "SGST",
                rate: existingBill.sgst_rate,
                amount: (base_price * existingBill.sgst_rate) / 100,
              });
            }
            if (existingBill.service_charge_rate && existingBill.service_charge_rate > 0) {
              item_taxes.push({
                name: "Service Charge",
                rate: existingBill.service_charge_rate,
                amount: (base_price * existingBill.service_charge_rate) / 100,
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

          const calculation: BillCalculation = {
            items_with_taxes,
            subtotal: existingBill.subtotal,
            taxable_subtotal: existingBill.subtotal,
            total_gst: existingBill.total_tax_amount || 0,
            subtotal_with_tax: existingBill.subtotal + (existingBill.total_tax_amount || 0),
            discount_amount: existingBill.discount_amount || 0,
            final_amount: existingBill.final_amount,
          };

          setBillSummary({
            items: billItems,
            calculation,
            orderIds: activeOrders.map(o => o.id),
            existingBill: true, // Flag to indicate this is from database
            billNumber: existingBill.bill_number,
            paymentStatus: existingBill.payment_status,
            offerName: offerName, // Include offer name if available
          });

          setShowBill(true);
          setProcessingBill(false);
          return;
        }
      }

      // No existing bill - generate UI-only bill preview
      // Get all active orders
      const activeOrdersList = orders.filter(o =>
        o.status !== 'completed' && o.status !== 'paid'
      );

      if (activeOrdersList.length === 0) {
        alert("No active orders to bill");
        setProcessingBill(false);
        return;
      }

      // Collect all items from active orders
      const allItems = activeOrdersList.flatMap(order => order.order_items);

      // Check if all items are ready
      const allReady = allItems.every(item =>
        (item as any).status === 'ready' || (item as any).status === 'served'
      );

      if (!allReady) {
        alert("Please wait until all items are ready before requesting the bill");
        setProcessingBill(false);
        return;
      }

      // Prepare bill items
      const billItems: BillItem[] = allItems.map(item => ({
        name: item.menu_items?.name || "Unknown Item",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_manual: false,
      }));

      // Calculate discount percentage from session offer if available
      let discountPercentage = 0;
      let offerName = null;

      if (sessionOffer && sessionOffer.discount > 0) {
        const subtotal = billItems.reduce((sum, item) => sum + item.total_price, 0);
        if (subtotal > 0) {
          discountPercentage = (sessionOffer.discount / subtotal) * 100;
          offerName = sessionOffer.name;
        }
      }

      // Calculate bill with discount and tax mode
      const calculation = calculateBill(
        billItems,
        discountPercentage,
        taxSettings.map(tax => ({ name: tax.name, rate: tax.rate })),
        taxInclusive
      );

      setBillSummary({
        items: billItems,
        calculation,
        orderIds: activeOrdersList.map(o => o.id),
        existingBill: false, // UI-generated preview
        offerName: offerName, // Include offer name
      });

      // Mark items as served if they're ready (guest is ready to pay)
      // Only mark items that are not already served
      const itemsToMarkServed = allItems.filter(item =>
        (item as any).status === 'ready'
      );

      if (itemsToMarkServed.length > 0) {
        const itemIds = itemsToMarkServed.map(item => item.id);

        const { error: updateError } = await supabase
          .from('order_items')
          .update({ status: 'served' })
          .in('id', itemIds);

        if (updateError) {
          console.error('Failed to mark items as served:', updateError);
          // Don't block showing the bill even if update fails
        } else {
          console.log('✅ Marked', itemIds.length, 'items as served');
        }
      }

      // Show the bill preview
      setShowBill(true);
    } catch (error) {
      console.error("Error generating bill:", error);
      alert("Failed to generate bill. Please try again.");
    } finally {
      setProcessingBill(false);
    }
  };

  // Check if all items are ready or served
  const activeOrders = orders.filter(o =>
    o.status !== 'completed' && o.status !== 'paid'
  );
  const allItems = activeOrders.flatMap(order => order.order_items);
  const allItemsReady = allItems.length > 0 && allItems.every(item =>
    (item as any).status === 'ready' || (item as any).status === 'served'
  );
  const allItemsServed = allItems.length > 0 && allItems.every(item =>
    (item as any).status === 'served'
  );
  const hasActiveOrders = activeOrders.length > 0;

  if (loading) {
    return (
      <GuestLayout showNavigation={false}>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading orders..." />
        </div>
      </GuestLayout>
    );
  }

  if (error && !currentUser) {
    return (
      <GuestLayout>
        <div className="p-4">
          <div className="text-center py-16">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sign In Required</h3>
            <p className="text-gray-500 mb-6">
              You need to sign in to view your order history
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = `/t/${tableCode}/cart`}
            >
              Go to Cart & Sign In
            </Button>
          </div>
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Your Order</h1>
          <p className="text-sm text-gray-600">
            Table {tableCode} • Updates automatically
          </p>
        </div>
      </div>

      <div className="p-4 pb-32">
        {currentUser && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <User className="w-4 h-4" />
              <span>Signed in as +91 {currentUser.phone}</span>
            </div>
          </div>
        )}

        {activeOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">
              Start browsing the menu and add items to your order
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = `/t/${tableCode}`}
            >
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Order Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-lg text-gray-900">Your Current Order</h2>
                  <p className="text-sm text-gray-600">
                    {allItems.length} item{allItems.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {allItemsReady ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle className="w-5 h-5" />
                    <span>Ready</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
                    <ChefHat className="w-5 h-5" />
                    <span>Preparing</span>
                  </div>
                )}
              </div>

              {/* All Items */}
              <div className="space-y-3">
                {allItems
                  .sort((a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime())
                  .map((item) => (
                    <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex-shrink-0">
                          {item.quantity}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {item.menu_items?.name || "Unknown Item"}
                            </span>
                            {item.menu_items?.is_veg && (
                              <span className="text-xs">🟢</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {(item as any).status === 'ready' ? (
                              <span className="text-green-600 font-medium">✓ Ready</span>
                            ) : (item as any).status === 'preparing' ? (
                              <span className="text-orange-600">Being prepared...</span>
                            ) : (
                              <span className="text-blue-600">Order placed</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-gray-900 font-medium ml-3">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Total */}
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">
                    {formatCurrency(activeOrders.reduce((sum, order) => sum + order.total_amount, 0))}
                  </span>
                </div>

                {sessionOffer && sessionOffer.discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600">
                      Discount
                      <span className="text-xs ml-1">({sessionOffer.name})</span>
                    </span>
                    <span className="text-green-600">
                      -{formatCurrency(sessionOffer.discount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-gray-900">
                    {formatCurrency(
                      activeOrders.reduce((sum, order) => sum + order.total_amount, 0) - (sessionOffer?.discount || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Card */}
            {!allItemsReady && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">Your food is being prepared</h3>
                    <p className="text-sm text-blue-700">
                      You can request the bill once all items are ready
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Get Bill Button - Fixed at bottom, above navigation */}
      {hasActiveOrders && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleGetBill}
            disabled={(!allItemsReady && !billSummary) || processingBill}
            leftIcon={processingBill ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          >
            {processingBill
              ? "Processing..."
              : billSummary
                ? "View Bill"
                : allItemsServed
                  ? "View Bill" // Waiter already marked as served
                  : allItemsReady
                    ? "Get Bill" // Guest can mark as served
                    : "Waiting for food to be ready..."}
          </Button>
        </div>
      )}

      {/* Bill Modal */}
      {showBill && billSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your Bill</h2>
                  {billSummary.existingBill && billSummary.billNumber && (
                    <p className="text-sm text-gray-600 mt-1">{billSummary.billNumber}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowBill(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Bill Status Indicator */}
              {billSummary.existingBill && (
                <div className={`mb-4 rounded-lg p-3 ${
                  billSummary.paymentStatus === 'paid'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-center gap-2 text-sm">
                    {billSummary.paymentStatus === 'paid' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-800 font-medium">Paid</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-800 font-medium">Pending Payment</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Bill Items */}
              <div className="space-y-2 mb-4">
                {billSummary.items.map((item: BillItem, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(item.total_price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                {/* Subtotal (Base Price) */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal (Base Price)</span>
                  <span className="text-gray-900">{formatCurrency(billSummary.calculation.subtotal)}</span>
                </div>

                {/* Total GST */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total GST</span>
                  <span className="text-gray-900">{formatCurrency(billSummary.calculation.total_gst)}</span>
                </div>

                {/* Total Before Discount */}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-700 font-medium">Total Before Discount</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(billSummary.calculation.subtotal_with_tax)}</span>
                </div>

                {/* Discount (if applicable) */}
                {billSummary.calculation.discount_amount > 0 && (
                  <div className="flex justify-between text-sm bg-green-50 -mx-1 px-1 py-1 rounded">
                    <span className="text-gray-700">
                      Discount
                      {billSummary.offerName && (
                        <span className="text-xs text-green-600 ml-1 font-medium">({billSummary.offerName})</span>
                      )}
                    </span>
                    <span className="text-green-600 font-medium">-{formatCurrency(billSummary.calculation.discount_amount)}</span>
                  </div>
                )}

                {/* Grand Total */}
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-bold text-lg text-gray-900">Grand Total</span>
                  <span className="font-bold text-2xl text-green-600">
                    {formatCurrency(billSummary.calculation.final_amount)}
                  </span>
                </div>
              </div>

              {/* Message based on bill status */}
              {billSummary.existingBill ? (
                <div className={`mt-6 rounded-lg p-4 ${
                  billSummary.paymentStatus === 'paid'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex gap-3">
                    {billSummary.paymentStatus === 'paid' ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-green-900 mb-1">Payment Complete</h3>
                          <p className="text-sm text-green-700">
                            Thank you for dining with us!
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Receipt className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-blue-900 mb-1">Bill Processed by Staff</h3>
                          <p className="text-sm text-blue-700">
                            Please proceed to the counter or wait for staff to collect payment
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-900 mb-1">Bill Preview</h3>
                      <p className="text-sm text-yellow-700">
                        This is an estimated bill. Please call a waiter to process your final bill.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setShowBill(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </GuestLayout>
  );
}