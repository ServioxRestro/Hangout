"use client";

import { useState, useEffect, useRef } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { guestColors, getButtonStyles } from "@/lib/guest-colors";

interface Category {
  id: string;
  name: string;
  description?: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  original_price?: number | null;
  discount_percentage?: number | null;
  has_discount?: boolean | null;
  image_url?: string | null;
  is_veg?: boolean | null;
  category_id?: string | null;
  display_order?: number | null;
}

interface CleanMenuLayoutProps {
  categories: Category[];
  menuItems: MenuItem[];
  showVegOnly: boolean;
  showNonVegOnly: boolean;
  onVegFilterToggle: () => void;
  onNonVegFilterToggle: () => void;
  renderMenuItem: (item: MenuItem) => React.ReactNode;
}

export function CleanMenuLayout({
  categories,
  menuItems,
  showVegOnly,
  showNonVegOnly,
  onVegFilterToggle,
  onNonVegFilterToggle,
  renderMenuItem
}: CleanMenuLayoutProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  console.log("CleanMenuLayout - filters:", { showVegOnly, showNonVegOnly });

  // Filter items based on mutually exclusive filters
  const filteredItems = menuItems.filter((item) => {
    // If no filters are active, show all items
    if (!showVegOnly && !showNonVegOnly) {
      return true;
    }

    // If veg filter is on, show only veg items
    if (showVegOnly) {
      return item.is_veg === true;
    }

    // If non-veg filter is on, show only non-veg items
    if (showNonVegOnly) {
      return item.is_veg === false;
    }

    return true;
  });

  console.log("Filter results:", {
    showVegOnly,
    showNonVegOnly,
    totalItems: menuItems.length,
    filteredItems: filteredItems.length
  });

  console.log("CleanMenuLayout - filteredItems:", filteredItems);

  // Group items by category and maintain display_order
  const itemsByCategory: { [key: string]: MenuItem[] } = {};

  // Initialize all categories
  categories.forEach(category => {
    itemsByCategory[category.id] = [];
  });

  // Group filtered items
  filteredItems.forEach(item => {
    if (item.category_id && itemsByCategory[item.category_id]) {
      itemsByCategory[item.category_id].push(item);
    } else {
      // Handle uncategorized items
      if (!itemsByCategory['uncategorized']) {
        itemsByCategory['uncategorized'] = [];
      }
      itemsByCategory['uncategorized'].push(item);
    }
  });

  // Sort items within each category by display_order
  Object.keys(itemsByCategory).forEach(categoryId => {
    itemsByCategory[categoryId].sort((a, b) =>
      (a.display_order || 0) - (b.display_order || 0)
    );
  });

  // Get categories that have items
  const categoriesWithItems = categories.filter(cat =>
    itemsByCategory[cat.id] && itemsByCategory[cat.id].length > 0
  );

  // Add uncategorized if it has items
  if (itemsByCategory['uncategorized'] && itemsByCategory['uncategorized'].length > 0) {
    categoriesWithItems.push({ id: 'uncategorized', name: 'Other Items' });
  }

  console.log("CleanMenuLayout - categoriesWithItems:", categoriesWithItems);
  console.log("CleanMenuLayout - itemsByCategory:", itemsByCategory);

  // Scroll to category
  const scrollToCategory = (categoryId: string) => {
    console.log("Scrolling to category:", categoryId);
    const element = categoryRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      setShowCategoryModal(false);
    } else {
      console.log("Category element not found for:", categoryId);
    }
  };

  // Set up intersection observer for active category tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const categoryId = entry.target.getAttribute('data-category-id');
            if (categoryId) {
              setActiveCategory(categoryId);
            }
          }
        });
      },
      {
        rootMargin: '-100px 0px -60% 0px',
        threshold: [0.1, 0.3, 0.5]
      }
    );

    // Observe all category sections
    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [categoriesWithItems]);

  const getCurrentCategoryName = () => {
    if (!activeCategory) return "Categories";
    const category = categoriesWithItems.find(cat => cat.id === activeCategory);
    return category?.name || "Categories";
  };

  return (
    <div className="relative">
      {/* Fixed Header */}
      <div className="bg-white sticky top-20 z-30 shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Category Button */}
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors min-w-0 flex-1 max-w-xs"
            >
              <Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">
                {getCurrentCategoryName()}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
            </button>

            {/* Veg Filter Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  console.log("Non-Veg filter toggled, current state:", showNonVegOnly);
                  onNonVegFilterToggle();
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
                  showNonVegOnly
                    ? "bg-red-500 text-white border-red-500 shadow-md ring-2 ring-red-200"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-red-50"
                )}
              >
                <span className={showNonVegOnly ? "text-white" : "text-red-600"}>🔴</span>
                <span className="hidden sm:inline">Non-Veg</span>
              </button>
              <button
                onClick={() => {
                  console.log("Veg filter toggled, current state:", showVegOnly);
                  onVegFilterToggle();
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
                  showVegOnly
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md ring-2 ring-emerald-200"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-emerald-50"
                )}
              >
                <span className={showVegOnly ? "text-white" : "text-emerald-600"}>🟢</span>
                <span className="hidden sm:inline">Veg</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="pb-20">
        {categoriesWithItems.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{showVegOnly ? "🌱" : "📭"}</span>
            </div>
            <div className="text-gray-500 text-lg mb-2">
              {showVegOnly ? "No vegetarian items available" : "No items available"}
            </div>
            <p className="text-gray-400 text-sm">
              {showVegOnly ? "Try viewing all items" : "Check back later"}
            </p>
          </div>
        ) : (
          <div>
            {categoriesWithItems.map((category) => {
              const items = itemsByCategory[category.id] || [];
              if (items.length === 0) return null;

              return (
                <div
                  key={category.id}
                  ref={(el) => { categoryRefs.current[category.id] = el; }}
                  data-category-id={category.id}
                  className="px-4 py-6"
                >
                  {/* Category Header */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {category.description}
                      </p>
                    )}
                    <div className="text-xs text-gray-500">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-4">
                    {items.map((item) => renderMenuItem(item))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-end pb-20"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="bg-white w-full rounded-t-xl max-h-[calc(100vh-160px)] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Category ({categoriesWithItems.length})
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(100vh - 240px)' }}>
              {categoriesWithItems.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500">No categories available</div>
                </div>
              ) : (
                <div className="p-4 space-y-2 pb-6">
                  {categoriesWithItems.map((category) => {
                    const itemCount = itemsByCategory[category.id]?.length || 0;
                    const isActive = activeCategory === category.id;

                    return (
                      <button
                        key={category.id}
                        onClick={() => scrollToCategory(category.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-lg text-left transition-all duration-200 border",
                          isActive
                            ? "bg-blue-50 text-blue-900 border-blue-200 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                              {category.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            isActive
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                          {isActive && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}