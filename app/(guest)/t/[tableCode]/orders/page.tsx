"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { calculateBill, type BillItem } from "@/lib/utils/billing";

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

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showBill, setShowBill] = useState(false);
  const [billSummary, setBillSummary] = useState<any>(null);
  const [processingBill, setProcessingBill] = useState(false);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);

  // Define fetchOrders first with useCallback
  const fetchOrders = useCallback(async (userPhone: string) => {
    try {
      // Get table info first
      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("table_code", tableCode)
        .single();

      if (tableError || !tableData) {
        setError("Table not found");
        return;
      }

      // Fetch orders for this user at this table
      // Note: We need to handle both phone formats (with and without country code)
      // Normalize phone to 10 digits for comparison
      const normalizedPhone = userPhone.replace(/\D/g, '');
      const phoneWithoutCode = normalizedPhone.length === 12 && normalizedPhone.startsWith('91')
        ? normalizedPhone.substring(2)
        : normalizedPhone;
      const phoneWithCode = normalizedPhone.length === 10
        ? `91${normalizedPhone}`
        : normalizedPhone;

      // First, get the current active session for this table (try both phone formats)
      const { data: sessionData, error: sessionError } = await supabase
        .from("table_sessions")
        .select("id")
        .eq("table_id", tableData.id)
        .in("customer_phone", [phoneWithoutCode, phoneWithCode])
        .eq("status", "active")
        .maybeSingle();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      // If there's an active session, fetch all orders from that session
      if (sessionData) {
        const { data: sessionOrders, error: sessionOrdersError } = await supabase
          .from("orders")
          .select(`
            *,
            order_items (
              *,
              menu_items (*)
            )
          `)
          .eq("table_session_id", sessionData.id)
          .order("created_at", { ascending: false });

        if (sessionOrdersError) {
          throw new Error(sessionOrdersError.message);
        }

        setOrders((sessionOrders as Order[]) || []);
        return;
      }

      // If no active session, fetch all historical orders for this user at this table
      // Try both phone formats
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `)
        .eq("table_id", tableData.id)
        .in("customer_phone", [phoneWithoutCode, phoneWithCode])
        .order("created_at", { ascending: false });

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      setOrders((ordersData as Order[]) || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      setError(error.message || "Failed to load orders");
    }
  }, [tableCode]);

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

  const checkUserAndFetchOrders = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setError("Please sign in to view your orders");
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      if (user.phone) {
        await fetchOrders(user.phone);
      }
    } catch (error) {
      console.error("Error checking user:", error);
      setError("Failed to load user session");
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (tableCode) {
      checkUserAndFetchOrders();
      fetchTaxSettings();
    }
  }, [tableCode, fetchOrders]);

  // Separate effect for auto-refresh
  useEffect(() => {
    if (!currentUser?.phone || showBill) return;

    const interval = setInterval(() => {
      fetchOrders(currentUser.phone);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser?.phone, showBill, fetchOrders]);

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
            const { data: offerUsageData } = await supabase
              .from("offer_usage")
              .select(`
                offers (
                  name
                )
              `)
              .eq("table_session_id", sessionId)
              .single();

            if (offerUsageData && offerUsageData.offers) {
              offerName = (offerUsageData.offers as any).name;
            }
          }

          // Convert database bill to UI format
          const billItems: BillItem[] = (existingBill.bill_items || []).map(item => ({
            name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            is_manual: false,
          }));

          const calculation = {
            subtotal: existingBill.subtotal,
            discount_amount: existingBill.discount_amount || 0,
            taxes: [
              ...(existingBill.cgst_rate && existingBill.cgst_rate > 0 ? [{
                name: 'CGST',
                rate: existingBill.cgst_rate,
                amount: existingBill.cgst_amount || 0,
              }] : []),
              ...(existingBill.sgst_rate && existingBill.sgst_rate > 0 ? [{
                name: 'SGST',
                rate: existingBill.sgst_rate,
                amount: existingBill.sgst_amount || 0,
              }] : []),
              ...(existingBill.service_charge_rate && existingBill.service_charge_rate > 0 ? [{
                name: 'Service Charge',
                rate: existingBill.service_charge_rate,
                amount: existingBill.service_charge_amount || 0,
              }] : []),
            ],
            tax_amount: existingBill.total_tax_amount || 0,
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

      // Calculate bill
      const calculation = calculateBill(
        billItems,
        0, // No discount for guest orders
        taxSettings
      );

      setBillSummary({
        items: billItems,
        calculation,
        orderIds: activeOrdersList.map(o => o.id),
        existingBill: false, // UI-generated preview
      });

      // DON'T mark items as served - that's done by waiters from table sessions
      // Just show the bill preview
      setShowBill(true);
    } catch (error) {
      console.error("Error generating bill:", error);
      alert("Failed to generate bill. Please try again.");
    } finally {
      setProcessingBill(false);
    }
  };

  // Check if all items are ready
  const activeOrders = orders.filter(o =>
    o.status !== 'completed' && o.status !== 'paid'
  );
  const allItems = activeOrders.flatMap(order => order.order_items);
  const allItemsReady = allItems.length > 0 && allItems.every(item =>
    (item as any).status === 'ready' || (item as any).status === 'served'
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
              <div className="border-t pt-3 mt-3 flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-xl text-gray-900">
                  {formatCurrency(activeOrders.reduce((sum, order) => sum + order.total_amount, 0))}
                </span>
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
                : allItemsReady
                  ? "Get Bill"
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
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(billSummary.calculation.subtotal)}</span>
                </div>

                {billSummary.calculation.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Discount
                      {billSummary.offerName && (
                        <span className="text-xs text-green-600 ml-1">({billSummary.offerName})</span>
                      )}
                    </span>
                    <span className="text-green-600">-{formatCurrency(billSummary.calculation.discount_amount)}</span>
                  </div>
                )}

                {billSummary.calculation.taxes.map((tax: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{tax.name} ({tax.rate}%)</span>
                    <span className="text-gray-900">{formatCurrency(tax.amount)}</span>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-bold text-lg text-gray-900">Total</span>
                  <span className="font-bold text-2xl text-gray-900">
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