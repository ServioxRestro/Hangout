"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  Eye,
  EyeOff,
  Leaf,
  Beef,
} from "lucide-react";
import Button from "./Button";
import type { Tables } from "@/types/database.types";
import { formatCurrency } from "@/lib/constants";

type MenuCategory = Tables<"menu_categories">;
type MenuItem = Tables<"menu_items"> & {
  menu_categories: MenuCategory | null;
};

// Sortable Menu Item Component
interface SortableMenuItemProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string, itemName: string) => void;
  onToggleAvailability: (itemId: string, isAvailable: boolean) => void;
}

function SortableMenuItem({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
}: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasDiscount = (item as any).has_discount;
  const originalPrice = (item as any).original_price;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-3 ${
        isDragging ? "opacity-50 shadow-2xl ring-2 ring-blue-400" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none flex-shrink-0"
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {item.is_veg ? (
              <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
            ) : (
              <Beef className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
            )}
            <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
              {item.name}
            </span>
          </div>
          {item.description && (
            <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
              {item.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex flex-col items-end flex-shrink-0">
          {hasDiscount && originalPrice > item.price ? (
            <>
              <div className="text-green-600 font-semibold text-sm sm:text-base">
                {formatCurrency(item.price)}
              </div>
              <div className="text-gray-400 text-xs line-through">
                {formatCurrency(originalPrice)}
              </div>
            </>
          ) : (
            <div className="text-green-600 font-semibold text-sm sm:text-base">
              {formatCurrency(item.price)}
            </div>
          )}
        </div>

        {/* Actions - Desktop */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => onToggleAvailability(item.id, item.is_available || false)}
            className={`p-1.5 rounded transition-colors ${
              item.is_available
                ? "text-yellow-600 hover:bg-yellow-50"
                : "text-green-600 hover:bg-green-50"
            }`}
            title={item.is_available ? "Disable" : "Enable"}
          >
            {item.is_available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id, item.name)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Actions - Mobile */}
        <div className="flex sm:hidden items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id, item.name)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Items List Component (separate DndContext for items)
interface ItemsListProps {
  categoryId: string;
  items: MenuItem[];
  onAddItem: (categoryId: string) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
  onToggleItemAvailability: (itemId: string, isAvailable: boolean) => void;
  onReorderItems: (categoryId: string, newOrder: MenuItem[]) => void;
}

function ItemsList({
  categoryId,
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleItemAvailability,
  onReorderItems,
}: ItemsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log("ItemsList drag end:", { activeId: active.id, overId: over?.id, categoryId });

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      console.log("Item indices:", { oldIndex, newIndex });

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(items, oldIndex, newIndex);
        console.log("Calling onReorderItems with:", {
          categoryId,
          oldIndex,
          newIndex,
          newOrder: newOrder.map(i => ({ id: i.id, name: i.name }))
        });
        onReorderItems(categoryId, newOrder);
      }
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm mb-3">No items in this category</p>
        <Button
          size="sm"
          variant="primary"
          onClick={() => onAddItem(categoryId)}
          leftIcon={<Plus className="w-3 h-3" />}
        >
          Add First Item
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
        <GripVertical className="w-3 h-3" />
        Drag items to reorder within this category
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <SortableMenuItem
                key={item.id}
                item={item}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
                onToggleAvailability={onToggleItemAvailability}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Sortable Category Component
interface SortableCategoryProps {
  category: MenuCategory;
  items: MenuItem[];
  itemCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
  onAddItem: (categoryId: string) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
  onToggleItemAvailability: (itemId: string, isAvailable: boolean) => void;
  onReorderItems: (categoryId: string, newOrder: MenuItem[]) => void;
}

function SortableCategory({
  category,
  items,
  itemCount,
  isExpanded,
  onToggle,
  onEditCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleItemAvailability,
  onReorderItems,
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg overflow-hidden ${
        isDragging ? "opacity-50 shadow-2xl ring-2 ring-purple-400" : "border-gray-200 shadow-sm"
      }`}
    >
      {/* Category Header */}
      <div className="bg-gradient-to-r from-purple-50 to-white border-b border-gray-200">
        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none flex-shrink-0"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={onToggle}
            className="text-gray-600 hover:text-gray-900 flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
              {category.name}
            </h3>
            {category.description && (
              <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">
                {category.description}
              </p>
            )}
          </div>

          {/* Item Count */}
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
            {itemCount}
          </span>

          {/* Actions - Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onAddItem(category.id)}
              leftIcon={<Plus className="w-3 h-3" />}
            >
              Add Item
            </Button>
            <button
              onClick={() => onEditCategory(category)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              title="Edit Category"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteCategory(category.id, category.name)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Delete Category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Actions - Mobile */}
          <div className="flex lg:hidden items-center gap-1">
            <button
              onClick={() => onAddItem(category.id)}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded"
              title="Add Item"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEditCategory(category)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Items List */}
      {isExpanded && (
        <div className="p-3 sm:p-4 bg-gray-50">
          <ItemsList
            categoryId={category.id}
            items={items}
            onAddItem={onAddItem}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
            onToggleItemAvailability={onToggleItemAvailability}
            onReorderItems={onReorderItems}
          />
        </div>
      )}
    </div>
  );
}

// Main Component
interface AccordionCategoryMenuProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
  onReorderCategories: (newOrder: MenuCategory[]) => void;
  onAddItem: (categoryId: string) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
  onToggleItemAvailability: (itemId: string, isAvailable: boolean) => void;
  onReorderItems: (categoryId: string, newOrder: MenuItem[]) => void;
}

export default function AccordionCategoryMenu({
  categories,
  menuItems,
  onEditCategory,
  onDeleteCategory,
  onReorderCategories,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleItemAvailability,
  onReorderItems,
}: AccordionCategoryMenuProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getItemsForCategory = (categoryId: string) => {
    return menuItems
      .filter((item) => item.category_id === categoryId)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(categories, oldIndex, newIndex);
        console.log("Categories reordered:", { oldIndex, newIndex });
        onReorderCategories(newOrder);
      }
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((cat) => cat.id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((category) => {
            const items = getItemsForCategory(category.id);
            // Create a unique key that changes when items order changes
            const itemsKey = items.map(i => i.id).join('-');
            return (
              <SortableCategory
                key={`${category.id}-${itemsKey}`}
                category={category}
                items={items}
                itemCount={items.length}
                isExpanded={expandedCategories.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
                onEditCategory={onEditCategory}
                onDeleteCategory={onDeleteCategory}
                onAddItem={onAddItem}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                onToggleItemAvailability={onToggleItemAvailability}
                onReorderItems={onReorderItems}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
