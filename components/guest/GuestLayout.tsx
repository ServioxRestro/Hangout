"use client";

import { useState, useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import {
  Menu as MenuIcon,
  ShoppingCart,
  Clock,
  Gift,
  User,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/msg91-widget";
import { useAutoLogout } from "@/hooks/useAutoLogout";

interface GuestLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export function GuestLayout({
  children,
  showNavigation = true,
}: GuestLayoutProps) {
  const [cartCount, setCartCount] = useState(0);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const pathname = usePathname();
  const params = useParams();
  const tableCode = params?.tableCode as string;
  const qrCode = params?.qrCode as string;

  // Determine if this is takeaway or dine-in
  const isTakeaway = pathname?.includes('/takeaway/');
  const code = isTakeaway ? qrCode : tableCode;

  // Auto-logout hook - works for both dine-in and takeaway
  // Dine-in: Logs out 15 min after table session ends
  // Takeaway: Logs out 15 min after latest order is paid
  useAutoLogout({
    tableCode,
    qrCode,
    customerPhone: customerPhone || undefined,
    enabled: !!customerPhone && (isTakeaway ? !!qrCode : !!tableCode),
    logoutDelayMinutes: 15,
    silentLogout: true,
    isTakeaway,
  });

  // Get current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCustomerPhone(user.phone);
      }
    };
    fetchCurrentUser();
  }, []);

  // Listen for cart updates from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      if (!code) return;

      try {
        const cartKey = isTakeaway ? `takeaway_cart_${code}` : `cart_${code}`;
        const cart = JSON.parse(
          localStorage.getItem(cartKey) || "[]"
        );
        const totalCount = cart.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0
        );
        setCartCount(totalCount);
      } catch (error) {
        console.error("Error parsing cart:", error);
      }
    };

    // Initial count
    updateCartCount();

    // Listen for storage events
    window.addEventListener("storage", updateCartCount);

    // Custom event for same-page updates
    const handleCartUpdate = () => updateCartCount();
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, [code, isTakeaway]);

  const getTabProps = (path: string) => ({
    isActive: pathname === path,
    href: code ? path : "#",
  });

  const basePath = isTakeaway ? `/takeaway/${qrCode}` : `/t/${tableCode}`;
  const menuTab = getTabProps(basePath);
  const cartTab = getTabProps(`${basePath}/cart`);
  const ordersTab = getTabProps(`${basePath}/orders`);
  const offersTab = getTabProps(`${basePath}/offers`);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content with bottom padding for navigation */}
      <div className={showNavigation ? "pb-20" : ""}>{children}</div>

      {/* Bottom Tab Navigation */}
      {showNavigation && code && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="grid grid-cols-4 h-16">
            {/* Offers Tab */}
            <Link
              href={offersTab.href}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                offersTab.isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Gift className="w-5 h-5" />
              <span className="text-xs font-medium">Offers</span>
            </Link>

            {/* Menu Tab */}
            <Link
              href={menuTab.href}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                menuTab.isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MenuIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Menu</span>
            </Link>

            {/* Cart Tab */}
            <Link
              href={cartTab.href}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors relative ${
                cartTab.isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">Cart</span>
            </Link>

            {/* Orders Tab */}
            <Link
              href={ordersTab.href}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                ordersTab.isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-xs font-medium">Orders</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
