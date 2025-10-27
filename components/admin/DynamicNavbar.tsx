"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Table2,
  MenuIcon,
  ClipboardList,
  Gift,
  User,
  Plus,
  Users,
  History,
  ChevronDown,
  ChevronRight,
  Receipt,
  Settings,
  ChefHat,
  Package,
  QrCode,
  TrendingUp,
} from "lucide-react";
import { canAccessRoute, UserRole, AuthUser } from "@/lib/auth";
import { useAdminBadges } from "@/hooks/useAdminBadges";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
  subItems?: SubNavigationItem[];
  badge?: number; // Badge count for notifications
  badgeColor?: "red" | "blue" | "green" | "orange"; // Badge color
}

interface SubNavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

interface DynamicNavbarProps {
  currentUser: AuthUser | null;
  collapsed: boolean;
  onMobileNavigate?: () => void; // Optional callback for mobile navigation
}

export default function DynamicNavbar({
  currentUser,
  collapsed,
  onMobileNavigate,
}: DynamicNavbarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Fetch real-time badge counts
  const badgeCounts = useAdminBadges({
    enabled: !!currentUser,
    userRole: currentUser?.role,
  });

  // Define all navigation items with their sub-items
  const allNavigation: NavigationItem[] = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },

    {
      name: "Tables",
      href: "/admin/tables",
      icon: Table2,
      subItems: [
        {
          name: "Table Overview",
          href: "/admin/tables",
          icon: Users,
        },
        {
          name: "Table Management",
          href: "/admin/tables/management",
          icon: Table2,
        },
      ],
    },
    {
      name: "Kitchen",
      href: "/admin/kitchen",
      icon: ChefHat,
      badge: badgeCounts.kitchenKOTs,
      badgeColor: "orange",
    },
    {
      name: "Takeaway",
      href: "/admin/takeaway/orders",
      icon: Package,
      badge: badgeCounts.takeawayOrders,
      badgeColor: "blue",
      subItems: [
        {
          name: "Takeaway Orders",
          href: "/admin/takeaway/orders",
          icon: Package,
        },
        {
          name: "QR Management",
          href: "/admin/takeaway/qr-management",
          icon: QrCode,
        },
      ],
    },
    {
      name: "Bills & Payments",
      href: "/admin/billing",
      icon: Receipt,
      badge: badgeCounts.pendingBills,
      badgeColor: "red",
    },
    {
      name: "Orders",
      href: "/admin/orders",
      icon: ClipboardList,
      badge: badgeCounts.activeOrders,
      badgeColor: "green",
      subItems: [
        {
          name: "Active Orders",
          href: "/admin/orders",
          icon: ClipboardList,
        },
        {
          name: "Create Order",
          href: "/admin/orders/create",
          icon: Plus,
        },
        {
          name: "Order History",
          href: "/admin/orders/history",
          icon: History,
        },
      ],
    },

    {
      name: "Menu",
      href: "/admin/menu",
      icon: MenuIcon,
    },

    {
      name: "Offers",
      href: "/admin/offers",
      icon: Gift,
      subItems: [
        {
          name: "All Offers",
          href: "/admin/offers",
          icon: Gift,
        },
        {
          name: "Create Offer",
          href: "/admin/offers/create",
          icon: Plus,
        },
      ],
    },

    {
      name: "Staff",
      href: "/admin/staff",
      icon: User,
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: TrendingUp,
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  // Filter navigation based on user role and determine which items should be expanded
  // This handles complex role-based access where users might access sub-items but not main items
  const navigation = allNavigation
    .filter((item) => {
      if (!currentUser) return false;

      // If the item has sub-items, filter them based on role access first
      let filteredSubItems = item.subItems?.filter((subItem) =>
        canAccessRoute(currentUser.role, subItem.href)
      );

      // Check if user can access the main route
      const canAccessMain = canAccessRoute(currentUser.role, item.href);

      // Show the item if:
      // 1. User can access the main route, OR
      // 2. User can access at least one sub-item (even if not the main route)
      const hasAccessibleSubItems =
        filteredSubItems && filteredSubItems.length > 0;
      const shouldShowItem = canAccessMain || hasAccessibleSubItems;

      if (!shouldShowItem) return false;

      // If user can't access main route but has sub-items, set href to first accessible sub-item
      let effectiveHref = item.href;
      if (!canAccessMain && hasAccessibleSubItems) {
        effectiveHref = filteredSubItems[0].href;
      }

      // Update the item with filtered sub-items and effective href
      item.subItems = filteredSubItems;
      item.href = effectiveHref;

      return true;
    })
    .map((item) => {
      const isMainRouteActive = pathname === item.href;
      const isSubRouteActive =
        item.subItems?.some((subItem) => pathname === subItem.href) || false;
      const isActive = isMainRouteActive || isSubRouteActive;

      // Auto-expand if current path matches any sub-item
      if (
        isSubRouteActive &&
        item.subItems &&
        !expandedItems.includes(item.name)
      ) {
        setExpandedItems((prev) => [...prev, item.name]);
      }

      return {
        ...item,
        current: isActive,
        subItems: item.subItems?.map((subItem) => ({
          ...subItem,
          current: pathname === subItem.href,
        })),
      };
    });

  const toggleExpanded = (itemName: string) => {
    if (collapsed) return; // Don't expand when sidebar is collapsed

    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isExpanded = (itemName: string) => expandedItems.includes(itemName);

  const getBadgeColorClass = (color?: "red" | "blue" | "green" | "orange") => {
    switch (color) {
      case "red":
        return "bg-red-500 text-white";
      case "blue":
        return "bg-blue-500 text-white";
      case "green":
        return "bg-green-500 text-white";
      case "orange":
        return "bg-orange-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <nav className="flex-1 px-2 space-y-1">
      {navigation.map((item) => {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const expanded = isExpanded(item.name);

        return (
          <div key={item.name}>
            {/* Main Navigation Item */}
            <div className="flex items-center">
              <a
                href={item.href}
                onClick={onMobileNavigate}
                className={`flex-1 group flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative ${
                  item.current
                    ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon
                  className={`flex-shrink-0 w-5 h-5 ${
                    item.current
                      ? "text-blue-500"
                      : "text-gray-400 group-hover:text-gray-500"
                  }`}
                />
                {!collapsed && (
                  <>
                    <span className="ml-3 flex-1">{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <span
                        className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${getBadgeColorClass(
                          item.badgeColor
                        )}`}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && item.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${getBadgeColorClass(
                      item.badgeColor
                    )}`}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </a>

              {/* Expand/Collapse Button for items with sub-items */}
              {!collapsed && hasSubItems && (
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={`ml-1 p-1 rounded transition-all duration-200 ${
                    item.current
                      ? "text-blue-500 hover:bg-blue-100"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {expanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* Sub Navigation Items */}
            {!collapsed && hasSubItems && expanded && (
              <div className="ml-6 mt-1 space-y-1">
                {item.subItems!.map((subItem) => (
                  <a
                    key={subItem.name}
                    href={subItem.href}
                    onClick={onMobileNavigate}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      subItem.current
                        ? "bg-blue-100 text-blue-700 border-l-2 border-blue-600"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    <subItem.icon
                      className={`flex-shrink-0 w-4 h-4 ${
                        subItem.current
                          ? "text-blue-600"
                          : "text-gray-400 group-hover:text-gray-500"
                      }`}
                    />
                    <span className="ml-3">{subItem.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
