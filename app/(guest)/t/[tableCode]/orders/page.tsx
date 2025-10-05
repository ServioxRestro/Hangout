"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/email-auth";
import { formatCurrency } from "@/lib/utils";
import {
  Clock,
  CheckCircle,
  ChefHat,
  Utensils,
  Receipt,
  AlertCircle,
  User
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
      return <Clock className="w-5 h-5 text-blue-600" />;
    case "preparing":
      return <ChefHat className="w-5 h-5 text-orange-600" />;
    case "served":
      return <Utensils className="w-5 h-5 text-green-600" />;
    case "completed":
    case "paid":
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    default:
      return <Receipt className="w-5 h-5 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "placed":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "preparing":
      return "bg-orange-50 text-orange-800 border-orange-200";
    case "served":
      return "bg-green-50 text-green-800 border-green-200";
    case "completed":
    case "paid":
      return "bg-gray-50 text-gray-800 border-gray-200";
    default:
      return "bg-gray-50 text-gray-800 border-gray-200";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "placed":
      return "Order Placed";
    case "preparing":
      return "Being Prepared";
    case "served":
      return "Served";
    case "completed":
      return "Completed";
    case "paid":
      return "Paid";
    default:
      return status;
  }
};

export default function OrdersPage() {
  const params = useParams();
  const tableCode = params?.tableCode as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (tableCode) {
      checkUserAndFetchOrders();
    }
  }, [tableCode]);

  const checkUserAndFetchOrders = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setError("Please sign in to view your orders");
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      await fetchOrders(user.email);
    } catch (error) {
      console.error("Error checking user:", error);
      setError("Failed to load user session");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (userEmail: string, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

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
        .eq("customer_email", userEmail)
        .order("created_at", { ascending: false });

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      setOrders((ordersData as Order[]) || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      setError(error.message || "Failed to load orders");
    } finally {
      if (showRefresh) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (currentUser) {
      fetchOrders(currentUser.email, true);
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Your Orders</h1>
            <p className="text-sm text-gray-600">
              Orders for Table {tableCode}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="p-4">
        {currentUser && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <User className="w-4 h-4" />
              <span>Signed in as {currentUser.email}</span>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">
              Your order history will appear here once you place an order
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
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-4">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status || "placed")}
                    <div>
                      <div className="font-semibold text-gray-900">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(order.created_at || "")}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      order.status || "placed"
                    )}`}
                  >
                    {getStatusText(order.status || "placed")}
                  </span>
                </div>

                {/* Order Items */}
                <div className="space-y-2 mb-3">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {item.quantity}x {item.menu_items?.name || "Unknown Item"}
                        </span>
                        {item.menu_items?.is_veg && (
                          <span className="text-green-600 text-xs">🟢</span>
                        )}
                      </div>
                      <span className="text-gray-600">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Order Total */}
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                {/* Order Notes */}
                {order.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500 mb-1">Notes:</div>
                    <div className="text-sm text-gray-700">{order.notes}</div>
                  </div>
                )}

                {/* Status Timeline */}
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs text-gray-500 mb-2">Order Status:</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      ["placed", "preparing", "served", "completed", "paid"].includes(order.status || "")
                        ? "bg-blue-600" : "bg-gray-300"
                    }`} />
                    <span className="text-xs text-gray-600">Placed</span>

                    <div className={`w-4 h-0.5 ${
                      ["preparing", "served", "completed", "paid"].includes(order.status || "")
                        ? "bg-orange-600" : "bg-gray-300"
                    }`} />
                    <div className={`w-2 h-2 rounded-full ${
                      ["preparing", "served", "completed", "paid"].includes(order.status || "")
                        ? "bg-orange-600" : "bg-gray-300"
                    }`} />
                    <span className="text-xs text-gray-600">Preparing</span>

                    <div className={`w-4 h-0.5 ${
                      ["served", "completed", "paid"].includes(order.status || "")
                        ? "bg-green-600" : "bg-gray-300"
                    }`} />
                    <div className={`w-2 h-2 rounded-full ${
                      ["served", "completed", "paid"].includes(order.status || "")
                        ? "bg-green-600" : "bg-gray-300"
                    }`} />
                    <span className="text-xs text-gray-600">Served</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GuestLayout>
  );
}