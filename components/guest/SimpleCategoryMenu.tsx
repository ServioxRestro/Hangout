"use client";

import { useState, useEffect, useRef } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
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

interface SimpleCategoryMenuProps {
  categories: Category[];
  menuItems: MenuItem[];
  showVegOnly?: boolean;
  onVegFilterChange?: (vegOnly: boolean) => void;
  children: (categoryId: string, items: MenuItem[]) => React.ReactNode;
  className?: string;
}

export function SimpleCategoryMenu({
  categories,
  menuItems,
  showVegOnly = false,
  onVegFilterChange,
  children,
  className
}: SimpleCategoryMenuProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Filter items based on veg filter only
  const filteredItems = menuItems.filter((item) => {
    return showVegOnly ? item.is_veg === true : true;
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
  const uncategorizedItems = filteredItems.filter(item =>
    !item.category_id || !categories.find(cat => cat.id === item.category_id)
  );
  if (uncategorizedItems.length > 0) {
    groupedItems['uncategorized'] = uncategorizedItems;
  }

  // Get available categories (only those with items)
  const availableCategories = categories.filter(cat => groupedItems[cat.id]);
  if (uncategorizedItems.length > 0) {
    availableCategories.push({ id: 'uncategorized', name: 'Other Items' });
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
      setShowCategoryModal(false);
    }
  };

  // Handle intersection observer for active category
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveCategoryId(entry.target.getAttribute('data-category-id') || '');
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0.1, 0.5, 0.9]
      }
    );

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [Object.keys(groupedItems)]);

  return (
    <div className={cn("relative", className)}>
      {/* Fixed Header with Filters and Category Button */}
      <div className="bg-white sticky top-20 z-30 shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Category Selection Button */}
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {activeCategoryId
                  ? availableCategories.find(cat => cat.id === activeCategoryId)?.name || 'Categories'
                  : 'Categories'
                }
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Veg/Non-Veg Filter */}
            {onVegFilterChange && (
              <div className="flex gap-2">
                <button
                  onClick={() => onVegFilterChange(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                    !showVegOnly
                      ? "bg-red-50 text-red-800 border-red-200 shadow-sm"
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
                      ? "bg-green-50 text-green-800 border-green-200 shadow-sm"
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
      </div>

      {/* Scrollable Content */}
      <div className="pb-20">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{showVegOnly ? "🌱" : "📭"}</span>
            </div>
            <div className="text-gray-500 text-lg mb-2">
              {showVegOnly
                ? "No vegetarian items found"
                : "No items found"}
            </div>
            <p className="text-gray-400 text-sm">
              {showVegOnly
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
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {categoryName}
                  </h2>
                  {category?.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {category.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500">
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

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-xl max-h-[70vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select Category</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Categories List */}
            <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
              <div className="p-4 space-y-2">
                {availableCategories.map((category) => {
                  const itemCount = groupedItems[category.id]?.length || 0;
                  return (
                    <button
                      key={category.id}
                      onClick={() => scrollToCategory(category.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-lg text-left transition-all duration-200 border",
                        activeCategoryId === category.id
                          ? "bg-blue-50 text-blue-900 border-blue-200"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {category.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          activeCategoryId === category.id
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        )}>
                          {itemCount} items
                        </span>
                        {activeCategoryId === category.id && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}