"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronLeft, Menu, X, Bell, Search, User } from "lucide-react";
import { canAccessRoute, UserRole, AuthUser } from "@/lib/auth";
import DynamicNavbar from "./DynamicNavbar";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationPanel from "./NotificationPanel";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Navigation is now handled by DynamicNavbar component

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Fetch current user session
    const fetchCurrentUser = async (retryCount = 0) => {
      try {
        console.log("AdminLayout: Verifying authentication...");
        const response = await fetch("/api/admin/verify", {
          method: "GET",
          credentials: "include",
        });

        console.log("AdminLayout: Verify response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("AdminLayout: Authentication successful:", data.user);
          setCurrentUser(data.user);
          setLoading(false);
        } else {
          // Retry once in case of timing issues
          if (retryCount < 1) {
            console.log("AdminLayout: Authentication failed, retrying...");
            setTimeout(() => fetchCurrentUser(retryCount + 1), 500);
            return;
          }

          // If not authenticated after retry, redirect to login
          console.log("AdminLayout: Not authenticated, redirecting to login");
          setLoading(false);
          router.push("/admin/login");
        }
      } catch (error) {
        console.error("AdminLayout: Error fetching user session:", error);
        // Retry once in case of network issues
        if (retryCount < 1) {
          setTimeout(() => fetchCurrentUser(retryCount + 1), 500);
          return;
        }
        setLoading(false);
        router.push("/admin/login");
      }
    };

    fetchCurrentUser();
  }, [router]);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      try {
        const response = await fetch("/api/admin/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          router.push("/admin/login");
        } else {
          console.error("Logout failed");
          // Still redirect to login page even if API fails
          router.push("/admin/login");
        }
      } catch (error) {
        console.error("Logout error:", error);
        // Still redirect to login page even if API fails
        router.push("/admin/login");
      }
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render anything if no user (will redirect)
  if (!currentUser) {
    return null;
  }

  return (
    <NotificationProvider enabled={true}>
      <div className="h-screen flex bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ${
          collapsed ? "md:w-16" : "md:w-64"
        }`}
      >
        <div className="flex flex-col w-full">
          <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 shadow-sm">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4 pb-4 border-b border-gray-200">
              {!collapsed ? (
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <span className="ml-3 text-xl font-semibold text-gray-900">
                    Hangout
                  </span>
                </div>
              ) : (
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
              )}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft
                  className={`w-4 h-4 transition-transform ${
                    collapsed ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Navigation */}
            <div className="mt-5 flex-grow flex flex-col">
              <DynamicNavbar currentUser={currentUser} collapsed={collapsed} />

              {/* Logout Button */}
              <div className="px-2 pb-4">
                <button
                  onClick={handleLogout}
                  className={`group flex items-center w-full px-2 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all duration-200 ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <LogOut className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-red-500" />
                  {!collapsed && <span className="ml-3">Logout</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-5 pb-4 bg-white border-r border-gray-200 shadow-lg">
          {/* Mobile Header */}
          <div className="flex items-center justify-between flex-shrink-0 px-4 pb-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="ml-3 text-xl font-semibold text-gray-900">
                Hangout
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="mt-5 flex-1">
            <DynamicNavbar
              currentUser={currentUser}
              collapsed={false}
              onMobileNavigate={() => setSidebarOpen(false)}
            />
          </div>

          {/* Mobile Logout */}
          <div className="px-2 pb-4">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-2 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            >
              <LogOut className="mr-3 flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-red-500" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top Navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200 shadow-sm">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              <div className="w-full flex md:max-w-xs">
                <label htmlFor="search-field" className="sr-only">
                  Search
                </label>
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <Search className="h-5 w-5" />
                  </div>
                  <input
                    id="search-field"
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent"
                    placeholder="Search..."
                    type="search"
                  />
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center space-x-4">
              {/* Notifications */}
              <NotificationPanel />

              {/* Profile */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">
                    {currentUser?.name || currentUser?.email || "User"}
                  </div>
                  {currentUser?.role && (
                    <div className="text-xs text-gray-500 capitalize">
                      {currentUser.role.replace("_", " ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50">
          {children}
        </main>
      </div>
    </div>
    </NotificationProvider>
  );
}
