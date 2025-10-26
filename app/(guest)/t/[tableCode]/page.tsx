"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser, signOut } from "@/lib/auth/msg91-widget";
import type { Tables } from "@/types/database.types";
import { formatCurrency } from "@/lib/utils";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { CleanMenuLayout } from "@/components/guest/CleanMenuLayout";
import { MenuItemCard } from "@/components/guest/MenuItemCard";
import { CartSummary } from "@/components/guest/CartSummary";
import { FeaturedOffersCarousel } from "@/components/guest/FeaturedOffersCarousel";
import { GuestLoginModal } from "@/components/guest/GuestLoginModal";
import { AddToCartToast } from "@/components/guest/AddToCartToast";
import { SmartOfferBanner } from "@/components/guest/SmartOfferBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Search, User, LogOut } from "lucide-react";

type RestaurantTable = Tables<"restaurant_tables">;
type MenuCategory = Tables<"menu_categories">;
type MenuItem = Tables<"menu_items"> & {
  menu_categories: MenuCategory | null;
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

export default function TablePage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params?.tableCode as string;

  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Filter states - both can be toggled independently
  const [showVegOnly, setShowVegOnly] = useState(false);
  const [showNonVegOnly, setShowNonVegOnly] = useState(false);
  const [activeOrders, setActiveOrders] = useState<number>(0);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [tableOccupied, setTableOccupied] = useState<boolean>(false);
  const [occupiedByDifferentUser, setOccupiedByDifferentUser] =
    useState<boolean>(false);
  const [featuredOffers, setFeaturedOffers] = useState<any[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState({ itemName: "", quantity: 0 });

  useEffect(() => {
    if (tableCode) {
      // Load cart from localStorage immediately (no async needed)
      const savedCart = localStorage.getItem(`cart_${tableCode}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      // Execute all async operations in parallel
      Promise.all([
        fetchTableAndMenu(),
        fetchFeaturedOffers()
      ]).catch(error => {
        console.error("Error loading initial data:", error);
      });
    }
  }, [tableCode]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (tableCode && cart.length > 0) {
      localStorage.setItem(`cart_${tableCode}`, JSON.stringify(cart));
      // Trigger cart update events
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("cartUpdated"));
    } else if (tableCode && cart.length === 0) {
      localStorage.removeItem(`cart_${tableCode}`);
      // Trigger cart update events
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [cart, tableCode]);

  const fetchFeaturedOffers = async () => {
    try {
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select("id, name, description, image_url, offer_type")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .order("priority", { ascending: false })
        .limit(3);

      if (!offersError && offersData) {
        setFeaturedOffers(offersData);
      }
    } catch (error) {
      console.error("Error fetching featured offers:", error);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserPhone(user.phone || null);

        // Get active orders count for this user at this table
        const { data, error } = await supabase
          .from("orders")
          .select("id, restaurant_tables!inner(table_code)")
          .eq("customer_phone", user.phone || "")
          .eq("restaurant_tables.table_code", tableCode)
          .in("status", ["placed", "preparing", "served"]);

        if (!error && data) {
          setActiveOrders(data.length);
        }
      }

      // Check if table has active session
      if (table) {
        const { data: activeSession, error: sessionError } = await supabase
          .from("table_sessions")
          .select("customer_phone")
          .eq("table_id", table.id)
          .eq("status", "active")
          .maybeSingle();

        if (!sessionError && activeSession) {
          setTableOccupied(true);

          // Check if occupied by different user
          const currentUserPhone = userPhone || (await getCurrentUser())?.phone;
          if (currentUserPhone) {
            setOccupiedByDifferentUser(
              activeSession.customer_phone !== currentUserPhone
            );
          } else {
            setOccupiedByDifferentUser(true);
          }
        } else {
          setTableOccupied(false);
          setOccupiedByDifferentUser(false);
        }
      }
    } catch (error) {
      console.error("Error fetching active orders:", error);
    }
  };

  const fetchTableAndMenu = async () => {
    try {
      const startTime = performance.now();
      console.log("🚀 Starting menu fetch...");

      // First fetch table details to check if it's veg-only
      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("table_code", tableCode)
        .eq("is_active", true)
        .single();

      if (tableError) throw tableError;
      if (!tableData) {
        setError("Table not found");
        setLoading(false);
        return;
      }

      setTable(tableData);

      // Now fetch menu with filtering based on table type
      const [
        { data: categoriesData, error: categoriesError },
        { data: itemsData, error: itemsError }
      ] = await Promise.all([
        // Fetch menu categories
        supabase
          .from("menu_categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),

        // Fetch menu items - filter by veg_only if table is veg-only
        (async () => {
          const query = supabase
            .from("menu_items")
            .select(`
              id,
              name,
              description,
              price,
              original_price,
              discount_percentage,
              has_discount,
              image_url,
              is_veg,
              category_id,
              display_order,
            menu_categories!inner (
              id,
              name
            )
          `)
          .eq("is_available", true)
          .eq("menu_categories.is_active", true)
          .order("display_order", { ascending: true });

          // If this is a veg-only table, only show vegetarian items
          if (tableData.veg_only) {
            query.eq("is_veg", true);
          }

          return await query;
        })()
      ]);

      // Check for errors
      if (tableError || !tableData) {
        setError("Table not found or inactive");
        setLoading(false);
        return;
      }

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        setError("Failed to load menu");
        setLoading(false);
        return;
      }

      if (itemsError) {
        console.error("Error fetching menu items:", itemsError);
        setError("Failed to load menu");
        setLoading(false);
        return;
      }

      // Set all data
      setTable(tableData);
      setCategories(categoriesData || []);
      setMenuItems((itemsData as MenuItem[]) || []);

      const endTime = performance.now();
      console.log(`✅ Menu loaded in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 Data loaded: ${itemsData?.length} items, ${categoriesData?.length} categories`);

      // Only fetch active orders if we have a table (async, don't wait)
      if (tableData) {
        fetchActiveOrders().catch(error => {
          console.error("Error fetching active orders:", error);
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: { id: string; name: string; price: number; is_veg?: boolean | null }) => {
    setCart((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        // Show toast with updated quantity
        setToastData({ itemName: item.name, quantity: newQuantity });
        setShowToast(true);
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        );
      } else {
        // Show toast for new item
        setToastData({ itemName: item.name, quantity: 1 });
        setShowToast(true);
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            is_veg: item.is_veg || true,
          },
        ];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map((cartItem) =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      } else {
        return prev.filter((cartItem) => cartItem.id !== itemId);
      }
    });
  };

  const handleCheckout = () => {
    router.push(`/t/${tableCode}/cart`);
  };

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      // Clear user phone and refresh active orders
      setUserPhone(null);
      setActiveOrders(0);
      // Optionally clear cart
      setCart([]);
      localStorage.removeItem(`cart_${tableCode}`);
      // Trigger cart update events
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("cartUpdated"));
    } else {
      alert('Failed to sign out: ' + result.message);
    }
  };

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = async () => {
    // Refresh user state and active orders after successful login
    await fetchActiveOrders();
    setShowLoginModal(false);
  };

  // Debug: Log data to check what we're getting
  console.log("Main page - categories:", categories);
  console.log("Main page - menuItems:", menuItems);
  console.log("Main page - showVegOnly:", showVegOnly);

  if (loading) {
    return (
      <GuestLayout showNavigation={false}>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading menu..." />
        </div>
      </GuestLayout>
    );
  }

  if (error) {
    return (
      <GuestLayout showNavigation={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      {/* Restaurant Header - Non-sticky, Compact */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              {process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Hangout Restaurant"}
            </h1>
            <p className="text-xs text-gray-600">
              Table {table?.veg_only ? `V${table.table_number}` : table?.table_number}
            </p>
          </div>

          {/* Login/Logout Button */}
          <div className="flex-shrink-0">
            {userPhone ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Logout</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleLogin}
                className="flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Login</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Veg-Only Table Banner */}
      {table?.veg_only && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mx-4 mt-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🟢</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                <span className="font-medium">Veg-Only Table:</span> This table displays only vegetarian menu items.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table Occupation Warning */}
      {occupiedByDifferentUser && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Table Occupied:</span> This table is currently being used by another customer. You can browse the menu, but ordering may not be available until their order is completed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Orders Info */}
      {activeOrders > 0 && !occupiedByDifferentUser && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-4 mt-4 rounded-r-lg">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Your Active Orders:</span> You have {activeOrders} active order{activeOrders !== 1 ? 's' : ''} at this table.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Featured Offers Carousel */}
      <div className="mt-4">
        <FeaturedOffersCarousel
          offers={featuredOffers}
          onViewOffers={() => router.push(`/t/${tableCode}/offers`)}
        />
      </div>

      {/* Smart Offer Banner */}
      {cart.length > 0 && (
        <div className="px-4 mt-4">
          <SmartOfferBanner
            cartItems={cart}
            cartTotal={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
            onViewOffers={() => router.push(`/t/${tableCode}/offers`)}
          />
        </div>
      )}

      {/* Clean Menu Layout */}
      <CleanMenuLayout
        categories={categories}
        menuItems={menuItems}
        showVegOnly={showVegOnly}
        showNonVegOnly={showNonVegOnly}
        onVegFilterToggle={() => {
          if (showVegOnly) {
            // If veg is already active, turn it off
            setShowVegOnly(false);
          } else {
            // Turn on veg and turn off non-veg
            setShowVegOnly(true);
            setShowNonVegOnly(false);
          }
        }}
        onNonVegFilterToggle={() => {
          if (showNonVegOnly) {
            // If non-veg is already active, turn it off
            setShowNonVegOnly(false);
          } else {
            // Turn on non-veg and turn off veg
            setShowNonVegOnly(true);
            setShowVegOnly(false);
          }
        }}
        renderMenuItem={(item) => {
          const cartItem = cart.find((cartItem) => cartItem.id === item.id);
          return (
            <MenuItemCard
              key={item.id}
              item={item}
              cartQuantity={cartItem?.quantity || 0}
              onAdd={() => {
                addToCart(item);
                // Trigger both storage and custom cart events
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new Event("cartUpdated"));
              }}
              onRemove={() => {
                removeFromCart(item.id);
                // Trigger both storage and custom cart events
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new Event("cartUpdated"));
              }}
            />
          );
        }}
      />

      {/* Original Cart Summary */}
      <CartSummary
        cart={cart}
        onCheckout={handleCheckout}
        onViewCart={() => router.push(`/t/${tableCode}/cart`)}
        disabled={occupiedByDifferentUser}
        disabledMessage="Table is occupied by another customer"
      />

      {/* Guest Login Modal */}
      <GuestLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Add to Cart Toast */}
      <AddToCartToast
        show={showToast}
        itemName={toastData.itemName}
        quantity={toastData.quantity}
        tableCode={tableCode}
        onClose={() => setShowToast(false)}
      />
    </GuestLayout>
  );
}
