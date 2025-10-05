"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Filter, X } from "lucide-react";
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

interface ScrollableCategoryMenuProps {
  categories: Category[];
  menuItems: MenuItem[];
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  showVegOnly?: boolean;
  onVegFilterChange?: (vegOnly: boolean) => void;
  children: (categoryId: string, items: MenuItem[]) => React.ReactNode;
  className?: string;
}

export function ScrollableCategoryMenu({
  categories,
  menuItems,
  searchTerm = "",
  onSearchChange,
  showVegOnly = false,
  onVegFilterChange,
  children,
  className
}: ScrollableCategoryMenuProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const navRef = useRef<HTMLDivElement>(null);

  // Filter items based on search and veg filter
  const filteredItems = menuItems.filter((item) => {
    const vegMatch = showVegOnly ? item.is_veg === true : true;
    const searchMatch = searchTerm
      ? item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    return vegMatch && searchMatch;
  });

  // Group filtered items by category
  const groupedItems = categories.reduce((acc, category) => {
    const categoryItems = filteredItems.filter(item => item.category_id === category.id);
    if (categoryItems.length > 0) {
      acc[category.id] = categoryItems;
    }
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  // Add uncategorized items
  const uncategorizedItems = filteredItems.filter(item => !item.category_id || !categories.find(cat => cat.id === item.category_id));
  if (uncategorizedItems.length > 0) {
    groupedItems['uncategorized'] = uncategorizedItems;
  }

  // Scroll to category
  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  // Handle intersection observer for active category
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategoryId(entry.target.getAttribute('data-category-id') || '');
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0.1
      }
    );

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [Object.keys(groupedItems)]);

  // Auto-scroll active category button into view
  useEffect(() => {
    if (navRef.current && activeCategoryId) {
      const activeButton = navRef.current.querySelector(`[data-nav-category="${activeCategoryId}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [activeCategoryId]);

  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      {/* Fixed Header with Search and Filters */}
      <div className="bg-white sticky top-20 z-30 shadow-sm border-b border-gray-200">
        {/* Search */}
        {onSearchChange && (
          <div className="px-4 pt-4 pb-3">
            <div className={cn(
              "relative transition-all duration-200",
              isSearchFocused && "transform scale-[1.02]"
            )}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={cn(
                  "w-full pl-10 pr-10 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm",
                  isSearchFocused
                    ? "bg-white border-blue-200 shadow-lg"
                    : "bg-gray-50 border-gray-200"
                )}
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Filters */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
            </div>

            {onVegFilterChange && (
              <div className="flex gap-2">
                <button
                  onClick={() => onVegFilterChange(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                    !showVegOnly
                      ? "bg-red-50 text-red-800 border-red-200"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-red-50"
                  )}
                >
                  <span className="text-red-600">🔴</span>
                  <span>All Items</span>
                </button>
                <button
                  onClick={() => onVegFilterChange(true)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                    showVegOnly
                      ? "bg-green-50 text-green-800 border-green-200"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-green-50"
                  )}
                >
                  <span className="text-green-600">🟢</span>
                  <span>Veg Only</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Category Navigation */}
        <div className="px-4 pb-4">
          <div
            ref={navRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {Object.keys(groupedItems).map((categoryId) => {
              const category = categories.find(cat => cat.id === categoryId);
              const categoryName = category?.name || (categoryId === 'uncategorized' ? 'Other Items' : 'Unknown');
              const itemCount = groupedItems[categoryId].length;

              return (
                <button
                  key={categoryId}
                  onClick={() => scrollToCategory(categoryId)}
                  data-nav-category={categoryId}
                  className={cn(
                    "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap",
                    activeCategoryId === categoryId
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200"
                  )}
                >
                  {categoryName} ({itemCount})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="pb-20">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{showVegOnly ? "🌱" : "📭"}</span>
            </div>
            <div className="text-gray-500 text-lg mb-2">
              {searchTerm
                ? `No items found for "${searchTerm}"`
                : showVegOnly
                ? "No vegetarian items found"
                : "No items found"}
            </div>
            <p className="text-gray-400 text-sm">
              {searchTerm
                ? "Try a different search term"
                : showVegOnly
                ? "Try viewing all items"
                : "Check back later for new items"}
            </p>
          </div>
        ) : (
          Object.keys(groupedItems).map((categoryId) => {
            const category = categories.find(cat => cat.id === categoryId);
            const categoryName = category?.name || (categoryId === 'uncategorized' ? 'Other Items' : 'Unknown');
            const items = groupedItems[categoryId];

            return (
              <div
                key={categoryId}
                ref={(el) => { categoryRefs.current[categoryId] = el; }}
                data-category-id={categoryId}
                className="px-4 py-6 first:pt-4"
              >
                {/* Category Header */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {categoryName}
                  </h2>
                  {category?.description && (
                    <p className="text-sm text-gray-600">
                      {category.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Category Items */}
                <div className="space-y-4">
                  {children(categoryId, items)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}