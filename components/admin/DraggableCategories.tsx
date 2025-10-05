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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Trash2, Utensils } from "lucide-react";
import Button from "./Button";
import type { Tables } from "@/types/database.types";

type MenuCategory = Tables<"menu_categories">;

interface SortableCategoryItemProps {
  category: MenuCategory;
  itemCount: number;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string, categoryName: string) => void;
}

function SortableCategoryItem({
  category,
  itemCount,
  onEdit,
  onDelete,
}: SortableCategoryItemProps) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Category Icon */}
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Utensils className="w-5 h-5 text-purple-600" />
        </div>

        {/* Category Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">{category.name}</div>
          {category.description && (
            <div className="text-sm text-gray-500 truncate">
              {category.description}
            </div>
          )}
        </div>

        {/* Item Count */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${
            category.is_active
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {category.is_active ? "Active" : "Inactive"}
        </span>

        {/* Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onEdit(category)}
            leftIcon={<Edit className="w-3 h-3" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDelete(category.id, category.name)}
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DraggableCategoriesProps {
  categories: MenuCategory[];
  menuItems: any[];
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string, categoryName: string) => void;
  onReorder: (newOrder: MenuCategory[]) => void;
}

export default function DraggableCategories({
  categories,
  menuItems,
  onEdit,
  onDelete,
  onReorder,
}: DraggableCategoriesProps) {
  const [items, setItems] = useState(categories);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update items when categories prop changes
  useState(() => {
    if (categories.length !== items.length ||
        !categories.every((cat, idx) => cat.id === items[idx]?.id)) {
      setItems(categories);
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Call the onReorder callback with the new order
        onReorder(newOrder);

        return newOrder;
      });
    }
  };

  const getItemCount = (categoryId: string) => {
    return menuItems.filter((item) => item.category_id === categoryId).length;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <GripVertical className="w-4 h-4 text-blue-600" />
        <span>Drag and drop categories to reorder them</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((category) => (
            <SortableCategoryItem
              key={category.id}
              category={category}
              itemCount={getItemCount(category.id)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
