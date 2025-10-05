"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  showVegOnly?: boolean;
  onVegFilterChange?: (vegOnly: boolean) => void;
  className?: string;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  searchTerm = "",
  onSearchChange,
  showVegOnly = false,
  onVegFilterChange,
  className
}: CategoryTabsProps) {
  if (categories.length === 0) return null;

  return (
    <div className={cn("bg-white border-b border-gray-200 sticky top-20 z-30", className)}>
      {/* Search Bar */}
      {onSearchChange && (
        <div className="px-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm"
            />
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="overflow-x-auto scrollbar-hide flex-1">
          <div className="flex space-x-2 min-w-max">
            {/* All Categories Button */}
            <button
              onClick={() => onCategoryChange("")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                activeCategory === ""
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              )}
            >
              All
            </button>

            {/* Category Buttons */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                  activeCategory === category.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Veg Filter */}
        {onVegFilterChange && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => onVegFilterChange(!showVegOnly)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
                showVegOnly
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              )}
            >
              <span className="text-green-600">🟢</span>
              <span className="hidden sm:inline">Veg Only</span>
            </button>
          </div>
        )}
      </div>

      {/* Subtle shadow for sticky effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </div>
  );
}