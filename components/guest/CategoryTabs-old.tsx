'use client'

interface MenuCategory {
  id: string
  name: string
  description?: string | null
}

interface CategoryTabsProps {
  categories: MenuCategory[]
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
  className?: string
}

export function CategoryTabs({ 
  categories, 
  activeCategory, 
  onCategoryChange, 
  className = '' 
}: CategoryTabsProps) {
  return (
    <div className={`bg-white border-b sticky top-0 md:top-16 z-30 ${className}`}>
      <div className="px-4">
        <div className="flex space-x-2 overflow-x-auto py-4 scrollbar-hide smooth-scroll">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-6 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}