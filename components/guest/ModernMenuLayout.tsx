"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Filter, Grid3X3, List, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  has_discount?: boolean;
  image_url?: string;
  is_veg?: boolean;
  category_id?: string;
}

interface ModernMenuLayoutProps {
  categories: Category[];
  menuItems: MenuItem[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  showVegOnly?: boolean;
  onVegFilterChange?: (vegOnly: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function ModernMenuLayout({
  categories,
  menuItems,
  activeCategory,
  onCategoryChange,
  searchTerm = "",
  onSearchChange,
  showVegOnly = false,
  onVegFilterChange,
  children,
  className
}: ModernMenuLayoutProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showSidebar, setShowSidebar] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Get item count per category
  const getCategoryItemCount = (categoryId: string) => {
    if (!categoryId) return menuItems.length;
    return menuItems.filter(item =>
      item.category_id === categoryId &&
      (!showVegOnly || item.is_veg)
    ).length;
  };

  // Auto-scroll to active category in sidebar
  useEffect(() => {
    if (sidebarRef.current && activeCategory) {
      const activeButton = sidebarRef.current.querySelector(`[data-sidebar-category="${activeCategory}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeCategory]);

  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      {/* Mobile Search & Filter Header */}
      <div className="lg:hidden bg-white sticky top-20 z-30 shadow-sm">
        {onSearchChange && (
          <div className="p-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
              />
            </div>
          </div>
        )}

        {/* Mobile Category Pills */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Categories</span>
            </div>

            <div className="flex items-center gap-2">
              {onVegFilterChange && (
                <button
                  onClick={() => onVegFilterChange(!showVegOnly)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                    showVegOnly
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600 hover:bg-green-50"
                  )}
                >
                  <span className="text-green-600">🟢</span>
                  Veg
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => onCategoryChange("")}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                activeCategory === ""
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200"
              )}
            >
              All ({getCategoryItemCount("")})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  activeCategory === category.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200"
                )}
              >
                {category.name} ({getCategoryItemCount(category.id)})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Desktop Sidebar */}
        <div className="w-80 bg-white shadow-sm sticky top-20 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
          {/* Search */}
          {onSearchChange && (
            <div className="p-6 pb-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search dishes, cuisines..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                />
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="p-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {onVegFilterChange && (
                <button
                  onClick={() => onVegFilterChange(!showVegOnly)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    showVegOnly
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600 hover:bg-green-50"
                  )}
                >
                  <span className="text-green-600">🟢</span>
                  Vegetarian Only
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex-1 overflow-y-auto" ref={sidebarRef}>
            <div className="p-6 pt-4">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => onCategoryChange("")}
                  data-sidebar-category=""
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 group",
                    activeCategory === ""
                      ? "bg-blue-50 text-blue-900 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50 border border-transparent"
                  )}
                >
                  <div>
                    <div className="font-medium">All Items</div>
                    <div className="text-sm text-gray-500">Browse everything</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      activeCategory === ""
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {getCategoryItemCount("")}
                    </span>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      activeCategory === "" ? "text-blue-600" : "text-gray-400",
                      activeCategory === "" && "transform rotate-90"
                    )} />
                  </div>
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    data-sidebar-category={category.id}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 group",
                      activeCategory === category.id
                        ? "bg-blue-50 text-blue-900 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50 border border-transparent"
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {category.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        activeCategory === category.id
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      )}>
                        {getCategoryItemCount(category.id)}
                      </span>
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform",
                        activeCategory === category.id ? "text-blue-600" : "text-gray-400",
                        activeCategory === category.id && "transform rotate-90"
                      )} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden">
        {children}
      </div>
    </div>
  );
}