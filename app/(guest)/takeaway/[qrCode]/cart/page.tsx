"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser, sendPhoneOTP, verifyPhoneOTP } from "@/lib/auth/msg91-widget";
import { getGuestUserByPhone } from "@/lib/guest-user";
import type { Tables } from "@/types/database.types";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OfferSelector } from "@/components/guest/OfferSelector";
import { SmartOfferBanner } from "@/components/guest/SmartOfferBanner";
import OrderConfirmationModal from "@/components/guest/OrderConfirmationModal";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Package
} from "lucide-react";

type TakeawayQR = Tables<"takeaway_qr_codes">;

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

export default function TakeawayCartPage() {
  const params = useParams();
  const router = useRouter();
  const qrCode = params?.qrCode as string;

  const [takeawayQR, setTakeawayQR] = useState<TakeawayQR | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Checkout State
  const [step, setStep] = useState<"cart" | "phone" | "otp" | "confirming" | "placing" | "success">("cart");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Offer state
  const [selectedOffer, setSelectedOffer] = useState<Tables<"offers"> | null>(null);

  useEffect(() => {
    if (qrCode) {
      fetchQRAndCart();
      checkCurrentUser();
    }
  }, [qrCode]);

  const checkCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user && user.phone) {
        setCurrentUser(user);
        setPhone(user.phone || "");

        // Fetch guest user to get name
        const { data: guestData } = await supabase
          .from("guest_users")
          .select("name")
          .eq("phone", user.phone)
          .single();

        if (guestData?.name) {
          setName(guestData.name);
        }
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const fetchQRAndCart = async () => {
    try {
      // Fetch takeaway QR details
      const { data: qrData, error: qrError } = await supabase
        .from("takeaway_qr_codes")
        .select("*")
        .eq("qr_code", qrCode)
        .single();

      if (qrError || !qrData) {
        setError("Invalid takeaway QR code");
        setLoading(false);
        return;
      }

      if (!qrData.is_active) {
        setError("This takeaway QR code is currently inactive");
        setLoading(false);
        return;
      }

      // Load cart from localStorage
      const savedCart = localStorage.getItem(`takeaway_cart_${qrCode}`);
      const cartItems = savedCart ? JSON.parse(savedCart) : [];

      setTakeawayQR(qrData);
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
      localStorage.setItem(`takeaway_cart_${qrCode}`, JSON.stringify(newCart));
    } else {
      localStorage.removeItem(`takeaway_cart_${qrCode}`);
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

  const calculateDiscount = () => {
    if (!selectedOffer) return 0;

    const benefits = selectedOffer.benefits as any;
    let discount = 0;
    const cartTotal = getTotalAmount();

    if (selectedOffer.offer_type === "cart_percentage") {
      discount = (cartTotal * (benefits.discount_percentage || 0)) / 100;
      if (benefits.max_discount_amount) {
        discount = Math.min(discount, benefits.max_discount_amount);
      }
    } else if (selectedOffer.offer_type === "cart_flat_amount") {
      discount = benefits.discount_amount || 0;
    } else if (selectedOffer.offer_type === "min_order_discount") {
      const conditions = selectedOffer.conditions as any;
      if (cartTotal >= (conditions?.threshold_amount || 0)) {
        discount = benefits.discount_amount || 0;
      }
    } else if (selectedOffer.offer_type === "promo_code" || selectedOffer.offer_type === "time_based" || selectedOffer.offer_type === "customer_based") {
      if (benefits.discount_percentage) {
        discount = (cartTotal * benefits.discount_percentage) / 100;
        if (benefits.max_discount_amount) {
          discount = Math.min(discount, benefits.max_discount_amount);
        }
      } else if (benefits.discount_amount) {
        discount = benefits.discount_amount;
      }
    }

    return discount;
  };

  const getFinalAmount = () => {
    return getTotalAmount() - calculateDiscount();
  };

  const handleSendOTP = async () => {
    // Validate name
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

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

        // Show confirmation modal instead of placing order immediately
        setStep("confirming");
        setShowConfirmModal(true);
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
    if (!takeawayQR || cart.length === 0) return;

    setOrderPlacing(true);
    setStep("placing");
    setError("");

    try {
      // Get or create guest user with name
      let guestUser = await getGuestUserByPhone(phone);
      let guestUserId = guestUser?.id || null;

      // If guest user doesn't exist, create one
      if (!guestUser) {
        const { data: newGuest, error: guestError } = await supabase
          .from("guest_users")
          .insert({
            phone: phone,
            name: name.trim(),
          })
          .select()
          .single();

        if (!guestError && newGuest) {
          guestUserId = newGuest.id;
        }
      } else if (!guestUser.name || guestUser.name.trim() === "") {
        // Update existing guest user with name if they don't have one
        await supabase
          .from("guest_users")
          .update({ name: name.trim() })
          .eq("id", guestUser.id);
      }

      // Calculate discount amount if offer selected
      let discountAmount = 0;
      if (selectedOffer) {
        const cartTotal = getTotalAmount();
        const benefits = selectedOffer.benefits as any;

        switch (selectedOffer.offer_type) {
          case "cart_percentage":
          case "promo_code":
            const percentage = benefits?.discount_percentage || 0;
            discountAmount = (cartTotal * percentage) / 100;
            break;

          case "cart_flat_amount":
            discountAmount = benefits?.discount_amount || 0;
            break;

          case "item_percentage":
            const itemDiscount = benefits?.discount_percentage || 0;
            discountAmount = (cartTotal * itemDiscount) / 100;
            break;

          default:
            if (benefits?.discount_percentage) {
              discountAmount = (cartTotal * benefits.discount_percentage) / 100;
            } else if (benefits?.discount_amount) {
              discountAmount = benefits.discount_amount;
            }
        }
      }

      // Prepare cart items for the database function
      const cartItems = cart.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      // Call optimized database function (reduces multiple queries to 1!)
      const { data, error: rpcError } = await supabase
        .rpc('place_order_optimized', {
          p_table_code: '', // Not needed for takeaway
          p_customer_phone: phone,
          p_cart_items: cartItems,
          p_cart_total: getTotalAmount(),
          p_guest_user_id: guestUserId || undefined,
          p_order_type: 'takeaway',
          p_offer_id: selectedOffer?.id || undefined,
          p_offer_discount: discountAmount
        });

      if (rpcError) {
        throw new Error(rpcError.message || "Failed to place order");
      }

      const result = data as any;

      if (!result || !result.success) {
        throw new Error("Order placement failed");
      }

      console.log("✅ Takeaway order placed successfully:", result);

      setOrderId(result.order_id);

      // Clear cart
      updateCart([]);
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
    if (currentUser) {
      // Show confirmation modal for logged-in users
      setStep("confirming");
      setShowConfirmModal(true);
    } else {
      setStep("phone");
    }
  };

  const handleConfirmOrder = async () => {
    // Prevent cancellation once order is being placed
    setOrderPlacing(true);
    setShowConfirmModal(false);
    await placeOrder();
  };

  const handleCancelConfirmation = () => {
    // Prevent cancellation if order is already being placed
    if (orderPlacing) {
      return;
    }
    setShowConfirmModal(false);
    setStep("cart");
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
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <Package className="w-3 h-3" />
                TAKEAWAY
              </span>
            </div>
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
                  onClick={() => router.push(`/takeaway/${qrCode}`)}
                >
                  Browse Menu
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Smart Offer Banner */}
                {!selectedOffer && (
                  <SmartOfferBanner
                    cartItems={cart}
                    cartTotal={getTotalAmount()}
                    onViewOffers={() => router.push(`/takeaway/${qrCode}/offers`)}
                  />
                )}

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
                            className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Offer Selector */}
                <OfferSelector
                  cartItems={cart}
                  cartTotal={getTotalAmount()}
                  customerPhone={currentUser?.phone}
                  tableId={undefined} // No table for takeaway
                  onOfferSelect={setSelectedOffer}
                  selectedOffer={selectedOffer}
                />

                {/* Order Summary */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Items ({getTotalItems()})</span>
                      <span>{formatCurrency(getTotalAmount())}</span>
                    </div>
                    {selectedOffer && calculateDiscount() > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({selectedOffer.name})</span>
                        <span>-{formatCurrency(calculateDiscount())}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Taxes & Fees</span>
                      <span>Included</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(getFinalAmount())}</span>
                    </div>
                  </div>
                </div>

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
                  disabled={orderPlacing}
                  className="w-full"
                >
                  {orderPlacing ? "Placing Order..." : `Place Order • ${formatCurrency(getFinalAmount())}`}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Phone Step */}
        {step === "phone" && (
          <div className="space-y-6">
            <div className="text-center">
              <Smartphone className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Enter Your Details
              </h2>
              <p className="text-gray-600">
                We need your name and phone number for the order
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
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
                disabled={otpSending || phone.length !== 10 || !name.trim()}
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
                Takeaway Order Placed!
              </h2>
              <p className="text-gray-600">
                Your order has been sent to the kitchen. You'll be notified when it's ready for pickup.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Order ID</div>
              <div className="font-mono text-lg font-semibold">{orderId}</div>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => router.push(`/takeaway/${qrCode}`)}
                className="w-full"
              >
                Order More Items
              </Button>

              <Button
                variant="secondary"
                onClick={() => router.push(`/takeaway/${qrCode}/orders`)}
                className="w-full"
              >
                View My Orders
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Confirmation Modal */}
      <OrderConfirmationModal
        isOpen={showConfirmModal}
        cartItems={cart}
        totalAmount={getTotalAmount()}
        discount={calculateDiscount()}
        finalAmount={getFinalAmount()}
        onConfirm={handleConfirmOrder}
        onCancel={handleCancelConfirmation}
        countdownSeconds={30}
        isPlacingOrder={orderPlacing}
      />
    </GuestLayout>
  );
}
