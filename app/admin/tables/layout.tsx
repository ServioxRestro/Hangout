"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Table2, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { canAccessRoute, AuthUser } from "@/lib/auth";

export default function TablesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/admin/verify", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const allTabs = [
    {
      name: "Sessions",
      href: "/admin/tables/sessions",
      icon: Users,
      current: pathname === "/admin/tables/sessions",
    },
    {
      name: "Tables",
      href: "/admin/tables",
      icon: Table2,
      current: pathname === "/admin/tables",
    },
  ];

  // Filter tabs based on user role
  const tabs = allTabs.filter((tab) =>
    currentUser ? canAccessRoute(currentUser.role, tab.href) : false
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tab Navigation - Only show if there are multiple accessible tabs */}
      {tabs.length > 1 && (
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    tab.current
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon
                    className={`-ml-0.5 mr-2 h-5 w-5 ${
                      tab.current
                        ? "text-blue-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      <div>{children}</div>
    </div>
  );
}
