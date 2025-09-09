"use client";

interface MenuCategory {
  id: string;
  name: string;
  description?: string | null;
}

interface CategoryTabsProps {
  categories: MenuCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  className = "",
}: CategoryTabsProps) {
  return (
    <div
      className={`bg-white/80 backdrop-blur-xl border-b border-border sticky top-0 md:top-16 z-30 shadow-sm ${className}`}
    >
      <div className="px-4">
        <div className="flex space-x-3 overflow-x-auto py-4 scrollbar-hide smooth-scroll">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`
                relative px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap 
                transition-all duration-300 ease-in-out transform
                ${
                  activeCategory === category.id
                    ? "bg-gradient-to-r from-brand-orange to-brand-orange-light text-white shadow-lg shadow-brand-orange/30 scale-105 translate-y-[-1px]"
                    : "bg-surface text-foreground hover:bg-surface-variant hover:scale-102 hover:shadow-md border border-border"
                }
                focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:ring-offset-2
                active:scale-95
              `}
            >
              {/* Active indicator dot */}
              {activeCategory === category.id && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-green rounded-full border-2 border-white shadow-md animate-pulse" />
              )}

              {/* Category name */}
              <span className="relative z-10">{category.name}</span>

              {/* Hover background effect */}
              <div
                className={`
                absolute inset-0 rounded-full transition-opacity duration-300
                ${
                  activeCategory === category.id
                    ? "bg-gradient-to-r from-brand-orange to-brand-orange-light opacity-100"
                    : "bg-gradient-to-r from-brand-orange/10 to-brand-orange-light/10 opacity-0 hover:opacity-100"
                }
              `}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-orange/20 to-transparent" />
    </div>
  );
}
