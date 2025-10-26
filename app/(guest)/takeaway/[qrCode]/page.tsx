"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/msg91-widget";
import type { Tables } from "@/types/database.types";
import { formatCurrency } from "@/lib/utils";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { CleanMenuLayout } from "@/components/guest/CleanMenuLayout";
import { MenuItemCard } from "@/components/guest/MenuItemCard";
import { CartSummary } from "@/components/guest/CartSummary";
import { GuestLoginModal } from "@/components/guest/GuestLoginModal";
import { AddToCartToast } from "@/components/guest/AddToCartToast";
import Modal from "@/components/admin/Modal";
import FormField from "@/components/admin/FormField";
import Input from "@/components/admin/Input";
import Button from "@/components/admin/Button";
import { User, AlertCircle, Package } from "lucide-react";

type MenuCategory = Tables<"menu_categories">;
type MenuItem = Tables<"menu_items"> & {
  menu_categories: MenuCategory | null;
};
type TakeawayQR = Tables<"takeaway_qr_codes">;
type GuestUser = Tables<"guest_users">;

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

export default function TakeawayMenuPage() {
  const params = useParams();
  const router = useRouter();
  const qrCode = params.qrCode as string;

  const [takeawayQR, setTakeawayQR] = useState<TakeawayQR | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showVegOnly, setShowVegOnly] = useState(false);
  const [showNonVegOnly, setShowNonVegOnly] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState({ itemName: "", quantity: 0 });

  useEffect(() => {
    if (qrCode) {
      // Load cart from localStorage
      const savedCart = localStorage.getItem(`takeaway_cart_${qrCode}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      // Fetch data
      initializePage();
    }
  }, [qrCode]);

  // Save cart to localStorage
  useEffect(() => {
    if (qrCode && cart.length > 0) {
      localStorage.setItem(`takeaway_cart_${qrCode}`, JSON.stringify(cart));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("cartUpdated"));
    } else if (qrCode && cart.length === 0) {
      localStorage.removeItem(`takeaway_cart_${qrCode}`);
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [cart, qrCode]);

  const initializePage = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Verify takeaway QR code
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

      setTakeawayQR(qrData);

      // If veg-only QR, automatically enable veg filter
      if (qrData.is_veg_only) {
        setShowVegOnly(true);
      }

      // 2. Check authentication (but don't block menu loading)
      const user = await getCurrentUser();

      if (user && user.phone) {
        // 3. Get or check guest user if logged in
        const { data: guestData } = await supabase
          .from("guest_users")
          .select("*")
          .eq("phone", user.phone)
          .single();

        if (guestData) {
          setGuestUser(guestData);
        }
      }

      // 4. Fetch menu items (filtered by veg_only if needed)
      let menuQuery = supabase
        .from("menu_items")
        .select("*, menu_categories(*)")
        .eq("is_available", true)
        .order("display_order", { ascending: true });

      if (qrData.is_veg_only) {
        menuQuery = menuQuery.eq("is_veg", true);
      }

      const { data: itemsData, error: itemsError } = await menuQuery;

      if (itemsError) {
        console.error("Error fetching menu items:", itemsError);
        setError("Failed to load menu");
        setLoading(false);
        return;
      }

      setMenuItems(itemsData || []);

      // 5. Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
      } else {
        setCategories(categoriesData || []);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error initializing page:", error);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      alert("Please enter your name");
      return;
    }

    setSavingName(true);

    try {
      const user = await getCurrentUser();
      if (!user || !user.phone) {
        alert("Session expired. Please login again.");
        setShowLoginModal(true);
        setSavingName(false);
        return;
      }

      if (guestUser) {
        // Update existing guest user
        const { error } = await supabase
          .from("guest_users")
          .update({ name: guestName.trim() })
          .eq("id", guestUser.id);

        if (error) {
          console.error("Error updating guest user:", error);
          alert("Failed to save name");
          setSavingName(false);
          return;
        }

        setGuestUser({ ...guestUser, name: guestName.trim() });
      } else {
        // Create new guest user
        const { data, error } = await supabase
          .from("guest_users")
          .insert({
            phone: user.phone,
            name: guestName.trim(),
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating guest user:", error);
          alert("Failed to save name");
          setSavingName(false);
          return;
        }

        setGuestUser(data);
      }

      setShowNameModal(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to save name");
    } finally {
      setSavingName(false);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    initializePage();
  };

  const addToCart = (item: MenuItem, quantity: number = 1) => {
    // No login check - allow adding to cart without login
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity,
          is_veg: item.is_veg || false,
        },
      ];
    });

    // Show toast
    setToastData({ itemName: item.name, quantity });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== itemId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(`takeaway_cart_${qrCode}`);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <div className="text-gray-600">Loading menu...</div>
        </div>
      </div>
    );
  }

  if (error || !takeawayQR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load Menu
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "Invalid takeaway QR code"}
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/")}
            className="w-full"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <GuestLayout>
      {/* Takeaway Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Takeaway Order</h1>
            <p className="text-xs text-gray-600">{guestUser?.name || "Guest"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              TAKEAWAY
            </span>
            {takeawayQR.is_veg_only && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold border border-green-200">
                🟢 VEG-ONLY
              </span>
            )}
          </div>
        </div>
      </div>

      <CleanMenuLayout
        categories={categories}
        menuItems={menuItems}
        showVegOnly={takeawayQR.is_veg_only ? true : showVegOnly}
        showNonVegOnly={showNonVegOnly}
        onVegFilterToggle={() => !takeawayQR.is_veg_only && setShowVegOnly((prev) => !prev)}
        onNonVegFilterToggle={() => setShowNonVegOnly((prev) => !prev)}
        hideNonVegFilter={takeawayQR.is_veg_only}
        renderMenuItem={(item) => {
          const cartItem = cart.find((i) => i.id === item.id);
          const currentQuantity = cartItem?.quantity || 0;
          // Find the full menu item from our state
          const fullItem = menuItems.find((mi) => mi.id === item.id);

          return (
            <MenuItemCard
              key={item.id}
              item={item}
              onAdd={() => fullItem && addToCart(fullItem, 1)}
              onRemove={() => updateCartQuantity(item.id, currentQuantity - 1)}
              cartQuantity={currentQuantity}
            />
          );
        }}
      />

      {/* Cart Summary */}
      {cart.length > 0 && (
        <CartSummary
          cart={cart}
          onCheckout={() => router.push(`/takeaway/${qrCode}/cart`)}
          onViewCart={() => router.push(`/takeaway/${qrCode}/cart`)}
        />
      )}

      {/* Login Modal */}
      <GuestLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Name Collection Modal */}
      <Modal
        isOpen={showNameModal}
        onClose={() => {}}
        title="Welcome to Takeaway!"
        size="sm"
      >
        <form onSubmit={handleSaveName} className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-gray-600">
              Please enter your name so we can identify your order when you come to pick it up.
            </p>
          </div>

          <FormField
            label="Your Name"
            required
            description="This will help us identify your order"
          >
            <Input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g., John Doe"
              required
              autoFocus
            />
          </FormField>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="primary"
              loading={savingName}
              className="w-full"
            >
              Continue to Menu
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add to Cart Toast */}
      <AddToCartToast
        show={showToast}
        itemName={toastData.itemName}
        quantity={toastData.quantity}
        qrCode={qrCode}
        onClose={() => setShowToast(false)}
      />
    </GuestLayout>
  );
}
