"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/msg91-widget";
import { formatCurrency } from "@/lib/utils";
import {
  Clock,
  CheckCircle,
  ChefHat,
  Package,
  Receipt,
  AlertCircle,
  Loader2
} from "lucide-react";
import type { Tables } from "@/types/database.types";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

type Order = Tables<"orders"> & {
  order_items: Array<
    Tables<"order_items"> & {
      menu_items: Tables<"menu_items"> | null;
    }
  >;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "placed":
      return <Clock className="w-5 h-5 text-orange-500" />;
    case "preparing":
      return <ChefHat className="w-5 h-5 text-blue-500" />;
    case "ready":
      return <Package className="w-5 h-5 text-green-500" />;
    case "completed":
    case "paid":
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case "cancelled":
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "placed":
      return "bg-orange-50 border-orange-200 text-orange-900";
    case "preparing":
      return "bg-blue-50 border-blue-200 text-blue-900";
    case "ready":
      return "bg-green-50 border-green-200 text-green-900";
    case "completed":
    case "paid":
      return "bg-green-50 border-green-300 text-green-900";
    case "cancelled":
      return "bg-red-50 border-red-200 text-red-900";
    default:
      return "bg-gray-50 border-gray-200 text-gray-900";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "placed":
      return "Order Placed";
    case "preparing":
      return "Being Prepared";
    case "ready":
      return "Ready for Pickup!";
    case "completed":
      return "Completed";
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export default function TakeawayOrdersPage() {
  const params = useParams();
  const qrCode = params?.qrCode as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchOrders = useCallback(async (userPhone: string) => {
    try {
      // Normalize phone to both formats for comparison
      const normalizedPhone = userPhone.replace(/\D/g, '');
      const phoneWithoutCode = normalizedPhone.length === 12 && normalizedPhone.startsWith('91')
        ? normalizedPhone.substring(2)
        : normalizedPhone;
      const phoneWithCode = normalizedPhone.length === 10
        ? `91${normalizedPhone}`
        : normalizedPhone;

      // Fetch all takeaway orders for this user
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `)
        .eq("order_type", "takeaway")
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
  }, []);

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
    if (qrCode) {
      checkUserAndFetchOrders();
    }
  }, [qrCode]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!currentUser?.phone) return;

    const interval = setInterval(() => {
      fetchOrders(currentUser.phone);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser?.phone, fetchOrders]);

  const activeOrders = orders.filter((o) =>
    o.status && ["placed", "preparing", "ready"].includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    o.status && ["completed", "paid", "cancelled"].includes(o.status)
  );

  if (loading) {
    return (
      <GuestLayout showNavigation={false}>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading orders..." />
        </div>
      </GuestLayout>
    );
  }

  if (error) {
    return (
      <GuestLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">{error}</h2>
            <Button variant="primary" onClick={checkUserAndFetchOrders}>
              Try Again
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-600">
              {currentUser?.phone ? `+91 ${currentUser.phone}` : ""}
            </p>
          </div>
          <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Package className="w-3 h-3" />
            TAKEAWAY
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Active Orders */}
        {activeOrders.length > 0 ? (
          <div className="space-y-4">
            {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden shadow-md"
                >
                  {/* Order Header */}
                  <div className={`px-4 py-3 border-b ${getStatusColor(order.status || "placed")}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status || "placed")}
                        <div>
                          <div className="font-bold text-sm">
                            {getStatusText(order.status || "placed")}
                          </div>
                          <div className="text-xs opacity-75">
                            {order.created_at ? formatDate(order.created_at) : "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs opacity-75">Order ID</div>
                        <div className="font-mono text-sm font-semibold">
                          {order.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4">
                    <div className="space-y-3">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {item.menu_items?.name || "Unknown Item"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatCurrency(item.unit_price)} × {item.quantity}
                            </div>
                          </div>
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(item.total_price)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-lg text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>

                    {/* Status Message */}
                    {order.status === "ready" && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-800">
                          <Package className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">Ready for Pickup!</div>
                            <div className="text-sm">
                              Your order is ready. Please collect it from the counter.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No active orders
            </h3>
            <p className="text-gray-500 mb-6">
              Place a takeaway order to track it here
            </p>
            <Button
              variant="primary"
              onClick={() => (window.location.href = `/takeaway/${qrCode}`)}
            >
              Browse Menu
            </Button>
          </div>
        )}
      </div>
    </GuestLayout>
  );
}
