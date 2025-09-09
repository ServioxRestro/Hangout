"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  sendEmailOTP,
  verifyEmailOTP,
  getCurrentUser,
} from "@/lib/auth/email-auth";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Tables } from "@/types/database.types";

type RestaurantTable = Tables<"restaurant_tables">;

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
  description?: string | null;
}

export default function UnifiedCartPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params?.tableCode as string;

  // State management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [authStep, setAuthStep] = useState<
    "none" | "email" | "otp" | "placing"
  >("none");
  const [authLoading, setAuthLoading] = useState(false);

  // Order state
  const [notes, setNotes] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    if (tableCode) {
      initializePage();
    }
  }, [tableCode]);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        setEmail(session.user.email || "");
        setAuthStep("none");
      } else {
        setCurrentUser(null);
        setEmail("");
        setAuthStep("none");
        setIsOrdering(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializePage = async () => {
    try {
      setLoading(true);

      // Check if user is already authenticated
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setEmail(user.email || "");
        setAuthStep("none");
      }

      // Fetch table details
      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("table_code", tableCode)
        .eq("is_active", true)
        .single();

      if (!tableError && tableData) {
        setTable(tableData);
      }

      // Load cart from localStorage
      const savedCart = localStorage.getItem(`cart_${tableCode}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Error initializing page:", error);
      setError("Failed to load page");
    } finally {
      setLoading(false);
    }
  };

  const updateCartInStorage = (newCart: CartItem[]) => {
    if (newCart.length > 0) {
      localStorage.setItem(`cart_${tableCode}`, JSON.stringify(newCart));
    } else {
      localStorage.removeItem(`cart_${tableCode}`);
    }
    window.dispatchEvent(new Event("storage"));
  };

  const addToCart = (itemId: string) => {
    const newCart = cart.map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
    setCart(newCart);
    updateCartInStorage(newCart);
  };

  const removeFromCart = (itemId: string) => {
    const newCart = cart
      .map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(0, item.quantity - 1) }
          : item
      )
      .filter((item) => item.quantity > 0);

    setCart(newCart);
    updateCartInStorage(newCart);
  };

  const removeItemCompletely = (itemId: string) => {
    const newCart = cart.filter((item) => item.id !== itemId);
    setCart(newCart);
    updateCartInStorage(newCart);
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(`cart_${tableCode}`);
    window.dispatchEvent(new Event("storage"));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handlePlaceOrder = () => {
    if (currentUser) {
      // User is already authenticated, proceed directly to order placement
      setAuthStep("placing");
      placeOrder();
    } else {
      // User needs to authenticate
      setIsOrdering(true);
      setAuthStep("email");
    }
  };

  const sendOTP = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setAuthLoading(true);
    setError("");

    try {
      const result = await sendEmailOTP(email);

      if (result.success) {
        setAuthStep("otp");
      } else {
        setError(result.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to send OTP. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOTPAndPlaceOrder = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setAuthLoading(true);
    setError("");
    setAuthStep("placing");

    try {
      const verifyResult = await verifyEmailOTP(email, otp);

      if (!verifyResult.success) {
        setError(verifyResult.error || "Invalid OTP");
        setAuthStep("otp");
        setAuthLoading(false);
        return;
      }

      setCurrentUser(verifyResult.user);
      await placeOrder();
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to verify OTP. Please try again.");
      setAuthStep("otp");
      setAuthLoading(false);
    }
  };

  const placeOrder = async () => {
    try {
      const total = getCartTotal();

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_id: table?.id,
          customer_email: currentUser?.email || email,
          total_amount: total,
          notes: notes || null,
          status: "placed",
        })
        .select()
        .single();

      if (orderError) {
        throw new Error("Failed to create order");
      }

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        throw new Error("Failed to save order items");
      }

      // Clear cart and redirect
      clearCart();
      router.push(`/t/${tableCode}/success?orderId=${orderData.id}`);
    } catch (error) {
      console.error("Error placing order:", error);
      setError("Failed to place order. Please try again.");
      setAuthStep(currentUser ? "none" : "otp");
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <GuestLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading cart..." />
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">My Cart</h1>
          <p className="text-sm text-gray-600">
            Table {table?.table_number} • {getCartItemCount()} item
            {getCartItemCount() !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="px-4 py-6">
        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🛒</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Browse our menu and add items to get started
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(`/t/${tableCode}`)}
            >
              🍽️ Browse Menu
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={item.is_veg ? "success" : "danger"}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <span>{item.is_veg ? "🟢" : "🔴"}</span>
                          {item.is_veg ? "VEG" : "NON-VEG"}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-green-600">
                          ₹{item.price.toFixed(2)}{" "}
                          <span className="text-sm text-gray-500">each</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="w-10 h-10 rounded-full p-0"
                      >
                        −
                      </Button>
                      <span className="font-bold text-lg min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => addToCart(item.id)}
                        className="w-10 h-10 rounded-full p-0"
                      >
                        +
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItemCompletely(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      🗑️ Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Order Summary
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear Cart
                </Button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    Items ({getCartItemCount()})
                  </span>
                  <span className="font-medium">
                    ₹{getCartTotal().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taxes & Charges</span>
                  <span className="font-medium text-green-600">₹0.00</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{getCartTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            {isOrdering && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Special Instructions (Optional)
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or dietary requirements..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Authentication Section - Only show when ordering */}
            {isOrdering && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                {currentUser && authStep === "none" ? (
                  /* User Already Authenticated */
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✅</span>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Ready to Order!
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Signed in as {currentUser.email}
                    </p>
                    <Button
                      variant="success"
                      size="lg"
                      fullWidth
                      onClick={() => {
                        setAuthStep("placing");
                        placeOrder();
                      }}
                      disabled={authLoading}
                    >
                      {authLoading ? "Placing Order..." : "🍽️ Place Order Now"}
                    </Button>
                  </div>
                ) : (
                  /* Authentication Required */
                  <>
                    {authStep === "email" && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          Enter Your Email Address
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">
                          We'll send you a verification code via email to
                          confirm your order
                        </p>
                        <div className="space-y-4">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          {error && (
                            <div className="text-red-600 text-sm">{error}</div>
                          )}
                          <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={sendOTP}
                            disabled={authLoading || !email.includes("@")}
                          >
                            {authLoading
                              ? "Sending OTP..."
                              : "Send Verification Code"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {authStep === "otp" && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          Verify OTP
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">
                          Enter the 6-digit OTP sent to {email}
                        </p>
                        <div className="space-y-4">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) =>
                              setOtp(
                                e.target.value.replace(/\D/g, "").slice(0, 6)
                              )
                            }
                            placeholder="Enter 6-digit OTP"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                            maxLength={6}
                          />
                          {error && (
                            <div className="text-red-600 text-sm">{error}</div>
                          )}
                          <div className="flex gap-3">
                            <Button
                              variant="secondary"
                              size="lg"
                              fullWidth
                              onClick={() => {
                                setAuthStep("email");
                                setOtp("");
                                setError("");
                              }}
                            >
                              Change Email
                            </Button>
                            <Button
                              variant="success"
                              size="lg"
                              fullWidth
                              onClick={verifyOTPAndPlaceOrder}
                              disabled={authLoading || otp.length !== 6}
                            >
                              {authLoading ? "Placing Order..." : "Place Order"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {authStep === "placing" && (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h3 className="text-lg font-semibold mb-2">
                          Placing Your Order...
                        </h3>
                        <p className="text-gray-600">
                          Please wait while we process your order
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {!isOrdering ? (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => router.push(`/t/${tableCode}`)}
                >
                  🍽️ Add More Items
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handlePlaceOrder}
                  className="font-bold"
                >
                  {currentUser ? "🍽️ Place Order" : "🍽️ Place Order"}
                </Button>
              </div>
            ) : (
              <div className="mb-6">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    setIsOrdering(false);
                    setAuthStep("none");
                    setError("");
                    setOtp("");
                  }}
                >
                  ← Back to Cart
                </Button>
              </div>
            )}

            {/* Help Text */}
            <div className="text-center text-sm text-gray-600">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-medium text-blue-800 mb-1">💡 Tip</p>
                <p className="text-blue-700">
                  {isOrdering
                    ? "Your order will be sent directly to the kitchen once placed"
                    : "You can modify quantities or remove items before ordering"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </GuestLayout>
  );
}
