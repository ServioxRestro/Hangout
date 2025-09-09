"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/email-auth";
import type { Tables } from "@/types/database.types";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { CategoryTabs } from "@/components/guest/CategoryTabs";
import { MenuItemCard } from "@/components/guest/MenuItemCard";
import { CartSummary } from "@/components/guest/CartSummary";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

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
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showVegOnly, setShowVegOnly] = useState(false);
  const [activeOrders, setActiveOrders] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (tableCode) {
      fetchTableAndMenu();
      fetchActiveOrders();
      // Load cart from localStorage
      const savedCart = localStorage.getItem(`cart_${tableCode}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    }
  }, [tableCode]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (tableCode && cart.length > 0) {
      localStorage.setItem(`cart_${tableCode}`, JSON.stringify(cart));
    } else if (tableCode && cart.length === 0) {
      localStorage.removeItem(`cart_${tableCode}`);
    }
  }, [cart, tableCode]);

  const fetchActiveOrders = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserEmail(user.email || null);

        // Get active orders count for this user at this table
        const { data, error } = await supabase
          .from("orders")
          .select("id, restaurant_tables!inner(table_code)")
          .eq("customer_email", user.email || "")
          .eq("restaurant_tables.table_code", tableCode)
          .in("status", ["placed", "preparing", "served"]);

        if (!error && data) {
          setActiveOrders(data.length);
        }
      }
    } catch (error) {
      console.error("Error fetching active orders:", error);
    }
  };

  const fetchTableAndMenu = async () => {
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

      // Fetch menu categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        setError("Failed to load menu");
        setLoading(false);
        return;
      }

      // Fetch menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from("menu_items")
        .select(
          `
          *,
          menu_categories (*)
        `
        )
        .eq("is_available", true)
        .order("display_order", { ascending: true });

      if (itemsError) {
        console.error("Error fetching menu items:", itemsError);
        setError("Failed to load menu");
        setLoading(false);
        return;
      }

      setTable(tableData);
      setCategories(categoriesData || []);
      setMenuItems((itemsData as MenuItem[]) || []);
      if (categoriesData && categoriesData.length > 0) {
        setActiveCategory(categoriesData[0].id);
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
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

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const filteredItems = menuItems.filter((item) => {
    const categoryMatch = activeCategory
      ? item.category_id === activeCategory
      : true;
    const vegMatch = showVegOnly ? item.is_veg === true : true;
    return categoryMatch && vegMatch;
  });

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
      {/* Restaurant Header - Mobile */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">
            {process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Hangout Restaurant"}
          </h1>
          <p className="text-sm text-gray-600">Table {table?.table_number}</p>
        </div>
      </div>

      {/* Veg Filter */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Menu</h2>
          <Button
            variant={showVegOnly ? "success" : "secondary"}
            size="sm"
            onClick={() => setShowVegOnly(!showVegOnly)}
          >
            🟢 Veg Only
          </Button>
        </div>
      </div>

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        className="border-b-0"
      />

      {/* Menu Items */}
      <div className="px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{showVegOnly ? "🌱" : "📭"}</span>
            </div>
            <div className="text-gray-500 text-lg mb-2">
              {showVegOnly
                ? "No vegetarian items found"
                : "No items found in this category"}
            </div>
            <p className="text-gray-400 text-sm">
              {showVegOnly
                ? "Turn off veg filter to see all items"
                : "Try selecting a different category"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const cartItem = cart.find((cartItem) => cartItem.id === item.id);
              return (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  cartQuantity={cartItem?.quantity || 0}
                  onAdd={() => {
                    addToCart(item);
                    // Trigger storage event for layout
                    window.dispatchEvent(new Event("storage"));
                  }}
                  onRemove={() => {
                    removeFromCart(item.id);
                    // Trigger storage event for layout
                    window.dispatchEvent(new Event("storage"));
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <CartSummary
        cart={cart}
        onCheckout={() => router.push(`/t/${tableCode}/cart`)}
        onViewCart={() => router.push(`/t/${tableCode}/cart`)}
      />
    </GuestLayout>
  );
}
