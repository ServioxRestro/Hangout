"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Table2,
  MenuIcon,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Bell,
  Search,
  User,
  ClipboardList,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navigation: NavigationItem[] = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Orders History", href: "/admin/orders", icon: ClipboardList },
    { name: "Tables", href: "/admin/tables", icon: Table2 },
    { name: "Menu", href: "/admin/menu", icon: MenuIcon },
  ];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  return (
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
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <item.icon
                        className={`flex-shrink-0 w-5 h-5 ${
                          isActive
                            ? "text-blue-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        }`}
                      />
                      {!collapsed && <span className="ml-3">{item.name}</span>}
                    </a>
                  );
                })}
              </nav>

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
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 w-5 h-5 ${
                      isActive
                        ? "text-blue-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </a>
              );
            })}
          </nav>

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
              <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="h-5 w-5" />
              </button>

              {/* Profile */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">Admin</div>
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
  );
}
