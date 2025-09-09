"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ModernGuestHeader from "./ModernGuestHeader";

interface ModernGuestLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  requireAuth?: boolean;
}

export default function ModernGuestLayout({
  children,
  showHeader = true,
  requireAuth = false,
}: ModernGuestLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const tableCode = params?.tableCode as string;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [tableNumber, setTableNumber] = useState<number | undefined>(undefined);
  const [authLoading, setAuthLoading] = useState(requireAuth);

  useEffect(() => {
    if (tableCode) {
      fetchUserData();
      fetchCartCount();
      fetchTableInfo();

      // Set up real-time subscriptions for orders
      const subscription = supabase
        .channel("modern-guest-layout")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            fetchActiveOrders();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [tableCode]);

  useEffect(() => {
    // Listen for cart changes in localStorage
    const handleStorageChange = () => {
      fetchCartCount();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [tableCode]);

  const fetchTableInfo = async () => {
    try {
      const { data: table, error } = await supabase
        .from("restaurant_tables")
        .select("table_number")
        .eq("table_code", tableCode)
        .eq("is_active", true)
        .single();

      if (!error && table) {
        setTableNumber(table.table_number);
      }
    } catch (error) {
      console.error("Error fetching table info:", error);
    }
  };

  const fetchUserData = async () => {
    // Simplified for OTP-only flow
    setAuthLoading(false);
  };

  const fetchActiveOrders = async (email?: string) => {
    // Simplified for OTP-only flow - no need to track orders in header
    setActiveOrdersCount(0);
  };

  const fetchCartCount = () => {
    try {
      const savedCart = localStorage.getItem(`cart_${tableCode}`);
      if (savedCart) {
        const cart = JSON.parse(savedCart);
        const totalItems = cart.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0
        );
        setCartItemCount(totalItems);
      } else {
        setCartItemCount(0);
      }
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCartItemCount(0);
    }
  };

  const handleCartClick = () => {
    router.push(`/t/${tableCode}/cart`);
  };

  const handleOrdersClick = () => {
    router.push(`/t/${tableCode}/orders`);
  };

  // Show loading if auth is required and we're still checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <ModernGuestHeader
          tableCode={tableCode}
          tableNumber={tableNumber}
          activeOrdersCount={activeOrdersCount}
          cartItemCount={cartItemCount}
          onCartClick={handleCartClick}
          onOrdersClick={handleOrdersClick}
        />
      )}

      {/* Main content with proper spacing for header */}
      <main className={showHeader ? "pt-0" : ""}>{children}</main>
    </div>
  );
}
