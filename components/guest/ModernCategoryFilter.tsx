"use client";

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  itemCount?: number;
}

interface ModernCategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export default function ModernCategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
}: ModernCategoryFilterProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);

  const displayCategories = showAllCategories ? categories : categories.slice(0, 6);

  return (
    <div className="bg-white sticky top-0 z-30 border-b border-gray-100 pb-4">
      {/* Search Bar */}
      <div className="px-4 pt-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search for dishes..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Categories</span>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {/* All Categories */}
          <button
            onClick={() => onCategoryChange('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === ''
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>

          {/* Category Buttons */}
          {displayCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{category.name}</span>
              {category.itemCount && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedCategory === category.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {category.itemCount}
                </span>
              )}
            </button>
          ))}

          {/* Show More/Less Button */}
          {categories.length > 6 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="px-4 py-2 rounded-full text-sm font-medium border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all duration-200"
            >
              {showAllCategories ? 'Show Less' : `+${categories.length - 6} More`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}