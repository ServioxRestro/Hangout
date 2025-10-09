"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import FormField from "@/components/admin/FormField";
import Input from "@/components/admin/Input";
import { formatCurrency } from "@/lib/constants";
import { X, Plus, Search } from "lucide-react";

interface AddManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: {
    id: string;
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }) => void;
}

export function AddManualItemModal({
  isOpen,
  onClose,
  onAddItem,
}: AddManualItemModalProps) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchMenuData();
    }
  }, [isOpen]);

  const fetchMenuData = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (categoriesError) throw categoriesError;
      setMenuCategories(categoriesData || []);
      if (categoriesData && categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("display_order");

      if (itemsError) throw itemsError;
      setMenuItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const getFilteredMenuItems = () => {
    let filtered = menuItems;

    if (selectedCategory) {
      filtered = filtered.filter(
        (item) => item.category_id === selectedCategory
      );
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const handleAddItem = () => {
    if (!selectedMenuItem || quantity <= 0) {
      alert("Please select a menu item and quantity");
      return;
    }

    const menuItem = menuItems.find((item) => item.id === selectedMenuItem);
    if (!menuItem) {
      alert("Selected item not found");
      return;
    }

    const manualItem = {
      id: `manual_${Date.now()}`,
      menu_item_id: menuItem.id,
      name: menuItem.name,
      quantity: quantity,
      unit_price: menuItem.price,
      total_price: quantity * menuItem.price,
    };

    onAddItem(manualItem);
    setSelectedMenuItem("");
    setQuantity(1);
    setSearchTerm("");
    onClose();
  };

  if (!isOpen) return null;

  const filteredItems = getFilteredMenuItems();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Add Manual Item
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <FormField label="Search Items">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </FormField>

          {/* Category Filter */}
          <FormField label="Category">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {menuCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* Menu Items List */}
          <FormField label="Select Item">
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No items found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedMenuItem(item.id)}
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedMenuItem === item.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatCurrency(item.price)}
                          </div>
                        </div>
                        {item.is_veg && (
                          <span className="text-green-600 text-sm">🟢 Veg</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          {/* Quantity */}
          <FormField label="Quantity">
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </FormField>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddItem}
              disabled={!selectedMenuItem || quantity <= 0}
              leftIcon={<Plus className="w-4 h-4" />}
              className="flex-1"
            >
              Add Item
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
