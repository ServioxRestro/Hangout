"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser, sendPhoneOTP, verifyPhoneOTP } from "@/lib/auth/msg91-widget";
import { getGuestUserByPhone, updateLastVisitedTable } from "@/lib/guest-user";
import type { Tables } from "@/types/database.types";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  ShoppingCart
} from "lucide-react";

type RestaurantTable = Tables<"restaurant_tables">;

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params?.tableCode as string;

  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Checkout State
  const [step, setStep] = useState<"cart" | "phone" | "otp" | "placing" | "success">("cart");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isAddingToExisting, setIsAddingToExisting] = useState(false);

  // Table occupation state
  const [occupiedByDifferentUser, setOccupiedByDifferentUser] = useState(false);

  useEffect(() => {
    if (tableCode) {
      fetchTableAndCart();
      checkCurrentUser();
    }
  }, [tableCode]);

  const checkCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setPhone(user.phone || "");
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const fetchTableAndCart = async () => {
    try {
      // Fetch table details
      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("table_code", tableCode)
        .eq("is_active", true)
        .single();

      if (tableError || !tableData) {
        setError("Table not found or inactive");
        setLoading(false);
        return;
      }

      // Load cart from localStorage
      const savedCart = localStorage.getItem(`cart_${tableCode}`);
      const cartItems = savedCart ? JSON.parse(savedCart) : [];

      // Check table session occupation
      const { data: activeSession, error: sessionError } = await supabase
        .from("table_sessions")
        .select("customer_phone")
        .eq("table_id", tableData.id)
        .eq("status", "active")
        .maybeSingle();

      if (!sessionError && activeSession) {
        const currentUserPhone = (await getCurrentUser())?.phone;
        if (currentUserPhone) {
          setOccupiedByDifferentUser(activeSession.customer_phone !== currentUserPhone);
        } else {
          setOccupiedByDifferentUser(true);
        }
      }

      setTable(tableData);
      setCart(cartItems);
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart);
    if (newCart.length > 0) {
      localStorage.setItem(`cart_${tableCode}`, JSON.stringify(newCart));
    } else {
      localStorage.removeItem(`cart_${tableCode}`);
    }
    // Trigger cart update event for layout
    window.dispatchEvent(new Event("storage"));
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    const newCart = cart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    updateCart(newCart);
  };

  const removeItem = (itemId: string) => {
    const newCart = cart.filter(item => item.id !== itemId);
    updateCart(newCart);
  };

  const clearCart = () => {
    updateCart([]);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleSendOTP = async () => {
    // Validate phone number (must be 10 digits)
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned || cleaned.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setOtpSending(true);
    setError("");

    try {
      const result = await sendPhoneOTP(phone);
      if (result.success) {
        setStep("otp");
      } else {
        setError(result.message || "Failed to send OTP");
      }
    } catch (error) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    setOtpVerifying(true);
    setError("");

    try {
      const result = await verifyPhoneOTP(phone, otp.trim());
      if (result.success) {
        // Update both currentUser and phone state with formatted phone number
        const formattedPhone = result.data.phone;
        setCurrentUser({ phone: formattedPhone });
        setPhone(formattedPhone); // Update phone state to use formatted phone
        await placeOrder();
      } else {
        setError(result.message || "Invalid OTP");
      }
    } catch (error) {
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const placeOrder = async () => {
    if (!table || cart.length === 0) return;

    setOrderPlacing(true);
    setStep("placing");
    setError("");

    try {
      // Check for existing active table session
      const { data: existingSession, error: sessionCheckError } = await supabase
        .from("table_sessions")
        .select("*")
        .eq("table_id", table.id)
        .eq("status", "active")
        .maybeSingle();

      if (sessionCheckError) {
        throw new Error("Failed to check table session");
      }

      // Get guest user to link with order
      const guestUser = await getGuestUserByPhone(phone);
      const guestUserId = guestUser?.id || null;

      // Update last visited table
      if (guestUserId && tableCode) {
        await updateLastVisitedTable(phone, tableCode);
      }

      let sessionId: string;

      if (existingSession) {
        // Check if session belongs to different customer
        if (existingSession.customer_phone !== phone) {
          throw new Error("This table is currently occupied by another customer. Please wait until their session is completed.");
        }
        sessionId = existingSession.id;

        // Update session with guest_user_id if not set
        if (!existingSession.guest_user_id && guestUserId) {
          await supabase
            .from("table_sessions")
            .update({ guest_user_id: guestUserId })
            .eq("id", sessionId);
        }
      } else {
        // Create new table session
        const { data: newSession, error: sessionError} = await supabase
          .from("table_sessions")
          .insert({
            table_id: table.id,
            customer_phone: phone,
            guest_user_id: guestUserId,
            status: "active",
            session_started_at: new Date().toISOString(),
            total_orders: 0,
            total_amount: 0
          })
          .select()
          .single();

        if (sessionError || !newSession) {
          throw new Error(sessionError?.message || "Failed to create table session");
        }
        sessionId = newSession.id;
      }

      // Check if there's already an active order in this session
      const { data: existingOrder, error: orderCheckError } = await supabase
        .from("orders")
        .select("id, total_amount")
        .eq("table_session_id", sessionId)
        .not("status", "in", "(completed,paid,cancelled)")
        .maybeSingle();

      if (orderCheckError) {
        throw new Error("Failed to check existing order");
      }

      let orderId: string;
      const cartTotal = getTotalAmount();

      if (existingOrder) {
        // ADD items to existing order
        orderId = existingOrder.id;
        setIsAddingToExisting(true);

        // Get next KOT number for this batch
        const { data: kotData, error: kotError } = await supabase
          .rpc('get_next_kot_number');

        if (kotError) {
          throw new Error("Failed to generate KOT number");
        }

        const kotNumber = kotData as number;
        const kotBatchId = crypto.randomUUID();

        // Create order items for the new cart items with KOT info
        const orderItems = cart.map(item => ({
          order_id: orderId,
          menu_item_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          kot_number: kotNumber,
          kot_batch_id: kotBatchId
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          throw new Error(itemsError.message || "Failed to add items to order");
        }

        // Update order total amount and timestamp
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({
            total_amount: existingOrder.total_amount + cartTotal,
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId);

        if (orderUpdateError) {
          throw new Error(orderUpdateError.message || "Failed to update order total");
        }

      } else {
        // CREATE new order (first order in session)
        setIsAddingToExisting(false);
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            table_id: table.id,
            table_session_id: sessionId,
            customer_phone: phone,
            guest_user_id: guestUserId,
            total_amount: cartTotal,
            status: "placed",
            order_type: "dine-in",
            notes: `Order placed via QR code for table ${table.table_number}`
          })
          .select()
          .single();

        if (orderError || !orderData) {
          throw new Error(orderError?.message || "Failed to create order");
        }

        orderId = orderData.id;

        // Get next KOT number for this batch
        const { data: kotData, error: kotError } = await supabase
          .rpc('get_next_kot_number');

        if (kotError) {
          throw new Error("Failed to generate KOT number");
        }

        const kotNumber = kotData as number;
        const kotBatchId = crypto.randomUUID();

        // Create order items with KOT info
        const orderItems = cart.map(item => ({
          order_id: orderId,
          menu_item_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          kot_number: kotNumber,
          kot_batch_id: kotBatchId
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          throw new Error(itemsError.message || "Failed to add order items");
        }
      }

      // Update session totals
      const { error: updateSessionError } = await supabase
        .from("table_sessions")
        .update({
          // Only increment total_orders if we CREATED a new order (not when adding to existing)
          total_orders: existingOrder ? (existingSession?.total_orders || 1) : (existingSession?.total_orders || 0) + 1,
          total_amount: (existingSession?.total_amount || 0) + cartTotal,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (updateSessionError) {
        console.error("Failed to update session totals:", updateSessionError);
        // Don't throw error as order is already placed successfully
      }

      // Clear cart
      updateCart([]);
      setOrderId(orderId);
      setStep("success");

    } catch (error: any) {
      console.error("Order placement error:", error);
      setError(error.message || "Failed to place order. Please try again.");
      setStep("cart");
    } finally {
      setOrderPlacing(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (occupiedByDifferentUser) {
      setError("Table is currently occupied by another customer");
      return;
    }

    if (currentUser) {
      await placeOrder();
    } else {
      setStep("phone");
    }
  };

  if (loading) {
    return (
      <GuestLayout showNavigation={false}>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading cart..." />
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {(step === "phone" || step === "otp") && (
            <button
              onClick={() => {
                if (step === "otp") setStep("phone");
                else setStep("cart");
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              {step === "success" ? "Order Placed!" :
               step === "placing" ? "Placing Order..." :
               step === "phone" ? "Enter Phone Number" :
               step === "otp" ? "Verify OTP" : "Your Cart"}
            </h1>
            <p className="text-sm text-gray-600">
              Table {table?.table_number}
            </p>
          </div>
          {step === "cart" && cart.length > 0 && (
            <button
              onClick={clearCart}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Cart View */}
        {step === "cart" && (
          <>
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-6">Add items from the menu to get started</p>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/t/${tableCode}`)}
                >
                  Browse Menu
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cart Items */}
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            {item.is_veg && <span className="text-green-600 text-sm">🟢</span>}
                          </div>
                          <div className="text-gray-600 text-sm">
                            {formatCurrency(item.price)} each
                          </div>
                          <div className="font-bold text-gray-900 mt-1">
                            {formatCurrency(item.price * item.quantity)}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-semibold text-lg min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Items ({getTotalItems()})</span>
                      <span>{formatCurrency(getTotalAmount())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxes & Fees</span>
                      <span>Included</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(getTotalAmount())}</span>
                    </div>
                  </div>
                </div>

                {/* Table Occupation Warning */}
                {occupiedByDifferentUser && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm text-yellow-800">
                          <span className="font-medium">Table Occupied:</span> This table is currently being used by another customer. Please wait until their order is completed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Info */}
                {currentUser && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Signed in as +91 {currentUser.phone}</span>
                    </div>
                  </div>
                )}

                {/* Place Order Button */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={orderPlacing || occupiedByDifferentUser}
                  className="w-full"
                >
                  {occupiedByDifferentUser ? "Table Occupied" :
                   orderPlacing ? "Placing Order..." :
                   `Place Order • ${formatCurrency(getTotalAmount())}`}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Phone Step */}
        {step === "phone" && (
          <div className="space-y-6">
            <div className="text-center">
              <Smartphone className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Enter Your Mobile Number
              </h2>
              <p className="text-gray-600">
                We'll send you an OTP to confirm your order
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full pl-14"
                  maxLength={10}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleSendOTP}
                disabled={otpSending || phone.length !== 10}
                className="w-full"
              >
                {otpSending ? "Sending OTP..." : "Send OTP"}
              </Button>
            </div>
          </div>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Enter OTP
              </h2>
              <p className="text-gray-600">
                We've sent a 6-digit code to +91 {phone}
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full text-center text-lg tracking-widest"
                maxLength={6}
              />

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleVerifyOTP}
                disabled={otpVerifying}
                className="w-full"
              >
                {otpVerifying ? "Verifying..." : "Verify & Place Order"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleSendOTP}
                disabled={otpSending}
                className="w-full"
              >
                {otpSending ? "Resending..." : "Resend OTP"}
              </Button>
            </div>
          </div>
        )}

        {/* Placing Order */}
        {step === "placing" && (
          <div className="text-center py-16">
            <LoadingSpinner size="lg" />
            <div className="mt-4 text-lg font-medium text-gray-900">
              Placing your order...
            </div>
            <div className="text-gray-600">
              Please don't close this page
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="text-center py-16 space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isAddingToExisting ? "Items Added Successfully!" : "Order Placed Successfully!"}
              </h2>
              <p className="text-gray-600">
                {isAddingToExisting
                  ? "New items have been added to your order and sent to the kitchen"
                  : "Your order has been sent to the kitchen"
                }
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Order ID</div>
              <div className="font-mono text-lg font-semibold">{orderId}</div>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => router.push(`/t/${tableCode}`)}
                className="w-full"
              >
                Order More Items
              </Button>

              <Button
                variant="secondary"
                onClick={() => router.push(`/t/${tableCode}/orders`)}
                className="w-full"
              >
                View My Orders
              </Button>
            </div>
          </div>
        )}
      </div>
    </GuestLayout>
  );
}