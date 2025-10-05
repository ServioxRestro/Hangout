"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface ModernCategoryNavigationProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  showVegOnly?: boolean;
  onVegFilterChange?: (vegOnly: boolean) => void;
  className?: string;
}

export function ModernCategoryNavigation({
  categories,
  activeCategory,
  onCategoryChange,
  searchTerm = "",
  onSearchChange,
  showVegOnly = false,
  onVegFilterChange,
  className
}: ModernCategoryNavigationProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active category
  useEffect(() => {
    if (scrollRef.current && activeCategory) {
      const activeButton = scrollRef.current.querySelector(`[data-category-id="${activeCategory}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [activeCategory]);

  const visibleCategories = showAllCategories ? categories : categories.slice(0, 6);

  return (
    <div className={cn("bg-white sticky top-20 z-30 shadow-sm", className)}>
      {/* Search Section */}
      {onSearchChange && (
        <div className="px-4 pt-4 pb-3">
          <div className={cn(
            "relative transition-all duration-200",
            isSearchFocused && "transform scale-[1.02]"
          )}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search for dishes, cuisines..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "w-full pl-10 pr-10 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm",
                isSearchFocused
                  ? "bg-white border-blue-200 shadow-lg"
                  : "bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300"
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

      {/* Category Navigation */}
      <div className="px-4 pb-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Categories</span>
            <span className="text-xs text-gray-500">({categories.length})</span>
          </div>

          {/* Veg Filter Toggle */}
          {onVegFilterChange && (
            <button
              onClick={() => onVegFilterChange(!showVegOnly)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                showVegOnly
                  ? "bg-green-100 text-green-800 border-green-200 shadow-sm"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-green-50 hover:border-green-200"
              )}
            >
              <span className="text-green-600">🟢</span>
              <span>Veg Only</span>
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Categories */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* All Categories Button */}
            <button
              onClick={() => onCategoryChange("")}
              data-category-id=""
              className={cn(
                "flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap",
                activeCategory === ""
                  ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
              )}
            >
              All Items
            </button>

            {/* Category Buttons */}
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                data-category-id={category.id}
                className={cn(
                  "flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap relative",
                  activeCategory === category.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                )}
              >
                {category.name}
                {/* Active indicator dot */}
                {activeCategory === category.id && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
                )}
              </button>
            ))}

            {/* Show More Button */}
            {categories.length > 6 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all duration-200 whitespace-nowrap"
              >
                {showAllCategories ? (
                  <>Show Less</>
                ) : (
                  <>+{categories.length - 6} More</>
                )}
              </button>
            )}
          </div>

          {/* Scroll Indicators */}
          <div className="absolute left-0 top-0 bottom-2 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-2 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
        </div>

        {/* Active Category Description */}
        {activeCategory && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="text-sm text-blue-800">
              {categories.find(cat => cat.id === activeCategory)?.description ||
               `Browsing ${categories.find(cat => cat.id === activeCategory)?.name || 'category'}`}
            </div>
          </div>
        )}
      </div>

      {/* Bottom shadow separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
    </div>
  );
}