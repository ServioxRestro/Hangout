"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import Modal from "@/components/admin/Modal";
import FormField from "@/components/admin/FormField";
import RoleGuard from "@/components/admin/RoleGuard";
import Input from "@/components/admin/Input";
import AccordionCategoryMenu from "@/components/admin/AccordionCategoryMenu";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Image,
  DollarSign,
  Tag,
  Utensils,
  Leaf,
  Beef,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import ImageUpload from "@/components/admin/ImageUpload";

type MenuCategory = Tables<"menu_categories">;
type MenuItem = Tables<"menu_items"> & {
  menu_categories: MenuCategory | null;
};

export default function MenuManagement() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  // Category form state
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null
  );
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Menu item form state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    original_price: "",
    discounted_price: "",
    has_discount: false,
    category_id: "",
    image_url: "",
    is_available: true,
    is_veg: true,
    subcategory: "veg" as "veg" | "non-veg",
  });
  const [itemLoading, setItemLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        return;
      }

      // Fetch menu items with categories
      const { data: itemsData, error: itemsError } = await supabase
        .from("menu_items")
        .select(
          `
          *,
          menu_categories (*)
        `
        )
        .order("display_order", { ascending: true });

      if (itemsError) {
        console.error("Error fetching menu items:", itemsError);
        return;
      }

      setCategories(categoriesData || []);
      setMenuItems((itemsData as MenuItem[]) || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Category functions
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryLoading(true);

    if (!categoryForm.name.trim()) {
      alert("Category name is required");
      setCategoryLoading(false);
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from("menu_categories")
          .update({
            name: categoryForm.name,
            description: categoryForm.description,
          })
          .eq("id", editingCategory.id);

        if (error) {
          console.error("Error updating category:", error);
          alert("Error updating category");
          setCategoryLoading(false);
          return;
        }
      } else {
        // Create new category
        const { error } = await supabase.from("menu_categories").insert({
          name: categoryForm.name,
          description: categoryForm.description,
          display_order: categories.length,
        });

        if (error) {
          console.error("Error creating category:", error);
          alert("Error creating category");
          setCategoryLoading(false);
          return;
        }
      }

      // Reset form and refresh data
      setCategoryForm({ name: "", description: "" });
      setEditingCategory(null);
      setShowCategoryModal(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      alert("Error saving category");
    } finally {
      setCategoryLoading(false);
    }
  };

  const editCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
    });
    setShowCategoryModal(true);
  };

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"? All menu items in this category will also be deleted.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", categoryId);

      if (error) {
        console.error("Error deleting category:", error);
        alert("Error deleting category");
        return;
      }

      fetchData();
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting category");
    }
  };

  const handleCategoryReorder = async (newOrder: MenuCategory[]) => {
    try {
      // Update display_order for each category
      const updates = newOrder.map((category, index) => ({
        id: category.id,
        display_order: index,
      }));

      // Update all categories in parallel
      const updatePromises = updates.map((update) =>
        supabase
          .from("menu_categories")
          .update({ display_order: update.display_order })
          .eq("id", update.id)
      );

      const results = await Promise.all(updatePromises);

      // Check for errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        console.error("Error updating category order:", errors);
        alert("Error updating category order");
        fetchData(); // Refresh to revert changes
        return;
      }

      // Update local state
      setCategories(newOrder);
    } catch (error) {
      console.error("Error:", error);
      alert("Error updating category order");
      fetchData(); // Refresh to revert changes
    }
  };

  const handleItemReorder = async (categoryId: string, newOrder: MenuItem[]) => {
    console.log("🔄 handleItemReorder called:", {
      categoryId,
      itemCount: newOrder.length,
      items: newOrder.map((item, idx) => ({ name: item.name, newOrder: idx }))
    });

    try {
      // Update display_order for each item
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        display_order: index,
      }));

      console.log("📤 Sending updates to database:", updates);

      // Update all items in parallel
      const updatePromises = updates.map((update) =>
        supabase
          .from("menu_items")
          .update({ display_order: update.display_order })
          .eq("id", update.id)
      );

      const results = await Promise.all(updatePromises);

      console.log("📥 Database update results:", results);

      // Check for errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        console.error("❌ Error updating item order:", errors);
        alert("Error updating item order");
        fetchData(); // Refresh to revert changes
        return;
      }

      console.log("✅ Items reordered successfully in database");

      // Update local state - replace items with the new order
      setMenuItems((prevItems) => {
        // Remove all items from this category
        const otherItems = prevItems.filter((item) => item.category_id !== categoryId);

        // Add the reordered items back with updated display_order
        const reorderedWithOrder = newOrder.map((item, index) => ({
          ...item,
          display_order: index
        }));

        const updatedItems = [...otherItems, ...reorderedWithOrder];
        console.log("🔄 Local state updated:", {
          totalItems: updatedItems.length,
          categoryItems: reorderedWithOrder.map(i => ({ name: i.name, order: i.display_order }))
        });
        return updatedItems;
      });
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Error updating item order");
      fetchData(); // Refresh to revert changes
    }
  };

  // Menu item functions
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemLoading(true);

    if (!itemForm.name.trim() || !itemForm.category_id) {
      alert("Name and category are required");
      setItemLoading(false);
      return;
    }

    // Calculate pricing
    let finalPrice: number;
    let originalPrice: number;
    let discountPercentage = 0;

    if (itemForm.has_discount) {
      if (!itemForm.original_price || !itemForm.discounted_price) {
        alert("Original price and discounted price are required when discount is enabled");
        setItemLoading(false);
        return;
      }

      originalPrice = parseFloat(itemForm.original_price);
      finalPrice = parseFloat(itemForm.discounted_price);

      if (isNaN(originalPrice) || originalPrice <= 0) {
        alert("Please enter a valid original price");
        setItemLoading(false);
        return;
      }

      if (isNaN(finalPrice) || finalPrice <= 0) {
        alert("Please enter a valid discounted price");
        setItemLoading(false);
        return;
      }

      if (finalPrice >= originalPrice) {
        alert("Discounted price must be less than original price");
        setItemLoading(false);
        return;
      }

      // Calculate discount percentage for display
      discountPercentage = Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
    } else {
      if (!itemForm.price) {
        alert("Price is required");
        setItemLoading(false);
        return;
      }

      finalPrice = parseFloat(itemForm.price);
      originalPrice = finalPrice;

      if (isNaN(finalPrice) || finalPrice <= 0) {
        alert("Please enter a valid price");
        setItemLoading(false);
        return;
      }
    }

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from("menu_items")
          .update({
            name: itemForm.name,
            description: itemForm.description,
            price: finalPrice,
            original_price: originalPrice,
            discount_percentage: discountPercentage,
            has_discount: itemForm.has_discount,
            category_id: itemForm.category_id,
            image_url: itemForm.image_url || null,
            is_available: itemForm.is_available,
            is_veg: itemForm.is_veg,
            subcategory: itemForm.subcategory,
          })
          .eq("id", editingItem.id);

        if (error) {
          console.error("Error updating item:", error);
          alert("Error updating menu item");
          setItemLoading(false);
          return;
        }
      } else {
        // Create new item
        const categoryItems = menuItems.filter(
          (item) => item.category_id === itemForm.category_id
        );

        const { error } = await supabase.from("menu_items").insert({
          name: itemForm.name,
          description: itemForm.description,
          price: finalPrice,
          original_price: originalPrice,
          discount_percentage: discountPercentage,
          has_discount: itemForm.has_discount,
          category_id: itemForm.category_id,
          image_url: itemForm.image_url || null,
          is_available: itemForm.is_available,
          is_veg: itemForm.is_veg,
          subcategory: itemForm.subcategory,
          display_order: categoryItems.length,
        });

        if (error) {
          console.error("Error creating item:", error);
          alert("Error creating menu item");
          setItemLoading(false);
          return;
        }
      }

      // Reset form and refresh data
      setItemForm({
        name: "",
        description: "",
        price: "",
        original_price: "",
        discounted_price: "",
        has_discount: false,
        category_id: categories[0]?.id || "",
        image_url: "",
        is_available: true,
        is_veg: true,
        subcategory: "veg",
      });
      setEditingItem(null);
      setShowItemModal(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      alert("Error saving menu item");
    } finally {
      setItemLoading(false);
    }
  };

  const editItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      original_price: (item as any).original_price?.toString() || item.price.toString(),
      discounted_price: (item as any).has_discount ? item.price.toString() : "",
      has_discount: (item as any).has_discount || false,
      category_id: item.category_id || "",
      image_url: item.image_url || "",
      is_available: item.is_available || true,
      is_veg: item.is_veg || true,
      subcategory: (item.subcategory as "veg" | "non-veg") || "veg",
    });
    setShowItemModal(true);
  };

  const deleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", itemId);

      if (error) {
        console.error("Error deleting item:", error);
        alert("Error deleting menu item");
        return;
      }

      fetchData();
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting menu item");
    }
  };

  const toggleItemAvailability = async (
    itemId: string,
    isAvailable: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: !isAvailable })
        .eq("id", itemId);

      if (error) {
        console.error("Error updating item availability:", error);
        return;
      }

      fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAddItemInCategory = (categoryId: string) => {
    if (categories.length === 0) {
      alert("Please create at least one category before adding menu items");
      return;
    }
    setItemForm({
      name: "",
      description: "",
      price: "",
      original_price: "",
      discounted_price: "",
      has_discount: false,
      category_id: categoryId,
      image_url: "",
      is_available: true,
      is_veg: true,
      subcategory: "veg",
    });
    setEditingItem(null);
    setShowItemModal(true);
  };

  return (
    <RoleGuard requiredRoute="/admin/menu">
      <div>
        <PageHeader
          title="Menu Management"
          description="Manage your restaurant's menu categories and items"
          breadcrumbs={[
            { name: "Dashboard", href: "/admin/dashboard" },
            { name: "Menu" },
          ]}
        >
          <Button
            variant="primary"
            onClick={() => {
              setCategoryForm({ name: "", description: "" });
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Category
          </Button>
        </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">Loading menu...</div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">🍽️</div>
              <p className="text-gray-500 mb-4">
                No categories created yet. Create your first category to organize menu items.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  setCategoryForm({ name: "", description: "" });
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create First Category
              </Button>
            </div>
          ) : (
            <AccordionCategoryMenu
              categories={categories}
              menuItems={menuItems}
              onEditCategory={editCategory}
              onDeleteCategory={deleteCategory}
              onReorderCategories={handleCategoryReorder}
              onAddItem={handleAddItemInCategory}
              onEditItem={editItem}
              onDeleteItem={deleteItem}
              onToggleItemAvailability={toggleItemAvailability}
              onReorderItems={handleItemReorder}
            />
          )}
        </Card>
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
          setCategoryForm({ name: "", description: "" });
        }}
        title={editingCategory ? "Edit Category" : "Add New Category"}
        size="md"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <FormField label="Category Name" required>
            <Input
              type="text"
              value={categoryForm.name}
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Appetizers, Main Courses, Desserts"
              required
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Optional description for this category"
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCategoryModal(false);
                setEditingCategory(null);
                setCategoryForm({ name: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              loading={categoryLoading}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {editingCategory ? "Update Category" : "Add Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Menu Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          setEditingItem(null);
          setItemForm({
            name: "",
            description: "",
            price: "",
            original_price: "",
            discounted_price: "",
            has_discount: false,
            category_id: categories[0]?.id || "",
            image_url: "",
                is_available: true,
            is_veg: true,
            subcategory: "veg",
          });
            }}
        title={editingItem ? "Edit Menu Item" : "Add New Menu Item"}
        size="lg"
      >
        <form onSubmit={handleItemSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Item Name" required>
              <Input
                type="text"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Chicken Tikka Masala"
                required
              />
            </FormField>

            <FormField label="Pricing" required>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasDiscount"
                    checked={itemForm.has_discount}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        has_discount: e.target.checked,
                        price: e.target.checked ? "" : prev.price,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                  />
                  <label htmlFor="hasDiscount" className="text-sm text-gray-700 font-medium">
                    This item has a discount
                  </label>
                </div>

                {itemForm.has_discount ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Original Price</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={itemForm.original_price}
                        onChange={(e) =>
                          setItemForm((prev) => ({ ...prev, original_price: e.target.value }))
                        }
                        placeholder="0.00"
                        leftIcon={<DollarSign className="w-4 h-4" />}
                        required
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Discounted Price</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={itemForm.discounted_price}
                        onChange={(e) =>
                          setItemForm((prev) => ({ ...prev, discounted_price: e.target.value }))
                        }
                        placeholder="0.00"
                        leftIcon={<DollarSign className="w-4 h-4" />}
                        required
                        min="0"
                      />
                    </div>
                    {itemForm.original_price && itemForm.discounted_price && (
                      <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm text-green-800">
                          <span className="font-medium">Discount: </span>
                          <span className="text-lg font-bold">
                            {Math.round(((parseFloat(itemForm.original_price) - parseFloat(itemForm.discounted_price)) / parseFloat(itemForm.original_price)) * 100)}% OFF
                          </span>
                          <span className="ml-2">
                            (Save {formatCurrency(parseFloat(itemForm.original_price) - parseFloat(itemForm.discounted_price))})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="0.00"
                    leftIcon={<DollarSign className="w-4 h-4" />}
                    required
                    min="0"
                  />
                )}
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Category" required>
              <select
                value={itemForm.category_id}
                onChange={(e) =>
                  setItemForm((prev) => ({
                    ...prev,
                    category_id: e.target.value,
                  }))
                }
                className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Type" required>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="vegType"
                    value="veg"
                    checked={itemForm.subcategory === "veg"}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        subcategory: "veg",
                        is_veg: true,
                      }))
                    }
                    className="mr-2"
                  />
                  <Leaf className="w-4 h-4 text-green-500 mr-1" />
                  Vegetarian
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="vegType"
                    value="non-veg"
                    checked={itemForm.subcategory === "non-veg"}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        subcategory: "non-veg",
                        is_veg: false,
                      }))
                    }
                    className="mr-2"
                  />
                  <Beef className="w-4 h-4 text-red-500 mr-1" />
                  Non-Vegetarian
                </label>
              </div>
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              value={itemForm.description}
              onChange={(e) =>
                setItemForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Describe this menu item..."
            />
          </FormField>

          <FormField label="Menu Item Image">
            <ImageUpload
              currentImage={itemForm.image_url}
              onImageChange={(imageUrl) =>
                setItemForm((prev) => ({ ...prev, image_url: imageUrl || "" }))
              }
              folder="menu-items"
              maxSizeInMB={5}
              disabled={itemLoading}
            />
          </FormField>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="itemAvailable"
              checked={itemForm.is_available}
              onChange={(e) =>
                setItemForm((prev) => ({
                  ...prev,
                  is_available: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="itemAvailable"
              className="ml-2 block text-sm text-gray-700"
            >
              Available for ordering
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowItemModal(false);
                setEditingItem(null);
                setItemForm({
                  name: "",
                  description: "",
                  price: "",
                  original_price: "",
                  discounted_price: "",
                  has_discount: false,
                  category_id: categories[0]?.id || "",
                  image_url: "",
                            is_available: true,
                  is_veg: true,
                  subcategory: "veg",
                });
                        }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              loading={itemLoading}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {editingItem ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </form>
      </Modal>
      </div>
    </RoleGuard>
  );
}
