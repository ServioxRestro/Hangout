"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GuestAuth } from "./GuestAuth";

interface GuestNavigationProps {
  tableCode: string;
  tableNumber?: number;
  activeOrdersCount?: number;
  cartItemCount?: number;
  userEmail?: string | null;
}

const navigationIcons = {
  menu: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  ),
  cart: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v8a2 2 0 002 2h6a2 2 0 002-2v-8"
      />
    </svg>
  ),
  orders: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  ),
  restaurant: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  ),
};

export function GuestNavigation({
  tableCode,
  tableNumber,
  activeOrdersCount = 0,
  cartItemCount = 0,
  userEmail,
}: GuestNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAuthChange = (user: any) => {
    setCurrentUser(user);
  };

  const navItems = [
    {
      id: "menu",
      label: "Menu",
      icon: navigationIcons.menu,
      path: `/t/${tableCode}`,
      badge: null,
      badgeVariant: "default" as const,
    },
    {
      id: "cart",
      label: "Cart",
      icon: navigationIcons.cart,
      path: `/t/${tableCode}/cart`,
      badge: cartItemCount > 0 ? cartItemCount : null,
      badgeVariant: "primary" as const,
    },
    {
      id: "orders",
      label: "Orders",
      icon: navigationIcons.orders,
      path: `/t/${tableCode}/orders`,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
      badgeVariant: "success" as const,
    },
  ];

  const isActive = (path: string) => {
    if (path === `/t/${tableCode}`) {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  const restaurantName =
    process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Hangout Restaurant";

  return (
    <>
      {/* Desktop Navigation - Top Bar */}
      <nav
        className={`
          hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${
            isScrolled
              ? "bg-white/95 backdrop-blur-lg shadow-lg border-b border-border-light"
              : "bg-white/90 backdrop-blur-md border-b border-border"
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left - Restaurant Branding */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-brand-primary rounded-lg text-white">
                {navigationIcons.restaurant}
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary">
                  {restaurantName}
                </h1>
                <p className="text-sm text-text-secondary">
                  Table {tableNumber || tableCode}
                </p>
              </div>
            </div>

            {/* Center - Navigation Items */}
            <div className="flex items-center bg-surface rounded-full p-1 border border-border shadow-sm">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={isActive(item.path) ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => router.push(item.path)}
                  className={`
                    relative rounded-full transition-all duration-200
                    ${
                      isActive(item.path)
                        ? "shadow-md"
                        : "hover:bg-interactive-hover"
                    }
                  `}
                  leftIcon={item.icon}
                >
                  {item.label}
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant}
                      size="xs"
                      className="ml-2 min-w-[18px] h-[18px] text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Right - User Authentication */}
            <div className="flex items-center">
              <GuestAuth onAuthChange={handleAuthChange} />
            </div>
          </div>
        </div>
      </nav>
      {/* Mobile Navigation - Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-border-light">
        <div className="safe-area-bottom">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-w-[64px]
                  ${
                    isActive(item.path)
                      ? "bg-brand-primary text-white shadow-lg"
                      : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                  }
                `}
              >
                <div className="relative">
                  <div className={`${isActive(item.path) ? "text-white" : ""}`}>
                    {item.icon}
                  </div>
                  {item.badge && (
                    <Badge
                      variant={
                        isActive(item.path) ? "warning" : item.badgeVariant
                      }
                      size="xs"
                      className="absolute -top-2 -right-2 min-w-[18px] h-[18px] text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span
                  className={`
                    text-xs font-medium mt-1
                    ${
                      isActive(item.path) ? "text-white" : "text-text-secondary"
                    }
                  `}
                >
                  {item.label}
                </span>
              </button>
            ))}

            {/* Mobile Auth Button */}
            <div className="flex flex-col items-center justify-center min-w-[64px]">
              <GuestAuth onAuthChange={handleAuthChange} compact />
            </div>
          </div>
        </div>
      </nav>
      {/* Spacers to prevent content from being hidden */}
      <div className="hidden md:block h-16" /> {/* Desktop spacer */}
      <div className="md:hidden h-20" /> {/* Mobile spacer */}
    </>
  );
}
