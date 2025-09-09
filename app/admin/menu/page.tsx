"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import Modal from "@/components/admin/Modal";
import FormField from "@/components/admin/FormField";
import Input from "@/components/admin/Input";
import Table from "@/components/admin/Table";
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

type MenuCategory = Tables<"menu_categories">;
type MenuItem = Tables<"menu_items"> & {
  menu_categories: MenuCategory | null;
};

export default function MenuManagement() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"categories" | "items">(
    "categories"
  );

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

  // Menu item functions
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemLoading(true);

    if (!itemForm.name.trim() || !itemForm.price || !itemForm.category_id) {
      alert("Name, price, and category are required");
      setItemLoading(false);
      return;
    }

    const price = parseFloat(itemForm.price);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price");
      setItemLoading(false);
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from("menu_items")
          .update({
            name: itemForm.name,
            description: itemForm.description,
            price: price,
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
          price: price,
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

  const categoryColumns = [
    {
      key: "name",
      title: "Category",
      render: (name: string, record: MenuCategory) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            <Utensils className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{name}</div>
            {record.description && (
              <div className="text-sm text-gray-500">{record.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "items_count",
      title: "Items",
      render: (_: any, record: MenuCategory) => {
        const count = menuItems.filter(
          (item) => item.category_id === record.id
        ).length;
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {count} item{count !== 1 ? "s" : ""}
          </span>
        );
      },
    },
    {
      key: "is_active",
      title: "Status",
      render: (isActive: boolean) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
            isActive
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_: any, record: MenuCategory) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => editCategory(record)}
            leftIcon={<Edit className="w-3 h-3" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => deleteCategory(record.id, record.name)}
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const itemColumns = [
    {
      key: "name",
      title: "Item",
      render: (name: string, record: MenuItem) => (
        <div className="flex items-center">
          {record.image_url ? (
            <img
              src={record.image_url}
              alt={name}
              className="w-12 h-12 rounded-lg object-cover mr-3"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Image className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="flex items-center">
              <span className="font-medium text-gray-900">{name}</span>
              <span className="ml-2">
                {record.is_veg ? (
                  <Leaf className="w-4 h-4 text-green-500" />
                ) : (
                  <Beef className="w-4 h-4 text-red-500" />
                )}
              </span>
            </div>
            {record.description && (
              <div className="text-sm text-gray-500 line-clamp-2">
                {record.description}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              {record.menu_categories?.name || "No Category"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      title: "Price",
      render: (price: number) => (
        <div className="flex items-center text-green-600 font-semibold">
          <DollarSign className="w-4 h-4 mr-1" />
          {formatCurrency(price)}
        </div>
      ),
    },
    {
      key: "subcategory",
      title: "Type",
      render: (subcategory: string) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
            subcategory === "veg"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <Tag className="w-3 h-3 mr-1" />
          {subcategory === "veg" ? "Vegetarian" : "Non-Vegetarian"}
        </span>
      ),
    },
    {
      key: "is_available",
      title: "Status",
      render: (isAvailable: boolean) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
            isAvailable
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {isAvailable ? "Available" : "Unavailable"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_: any, record: MenuItem) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={record.is_available ? "warning" : "success"}
            onClick={() =>
              toggleItemAvailability(record.id, record.is_available || false)
            }
            leftIcon={
              record.is_available ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )
            }
          >
            {record.is_available ? "Disable" : "Enable"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => editItem(record)}
            leftIcon={<Edit className="w-3 h-3" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => deleteItem(record.id, record.name)}
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
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
            if (activeTab === "categories") {
              setCategoryForm({ name: "", description: "" });
              setEditingCategory(null);
              setShowCategoryModal(true);
            } else {
              if (categories.length === 0) {
                alert(
                  "Please create at least one category before adding menu items"
                );
                setActiveTab("categories");
                return;
              }
              setItemForm({
                name: "",
                description: "",
                price: "",
                category_id: categories[0]?.id || "",
                image_url: "",
                is_available: true,
                is_veg: true,
                subcategory: "veg",
              });
              setEditingItem(null);
              setShowItemModal(true);
            }
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add {activeTab === "categories" ? "Category" : "Menu Item"}
        </Button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("categories")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "categories"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Categories ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab("items")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "items"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Menu Items ({menuItems.length})
            </button>
          </nav>
        </div>

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Menu Categories
                </h2>
                <p className="text-sm text-gray-500">
                  Organize your menu items into categories
                </p>
              </div>
            </div>

            <Table
              data={categories}
              columns={categoryColumns}
              loading={loading}
              emptyText="No categories created yet. Create your first category to organize menu items."
            />
          </Card>
        )}

        {/* Menu Items Tab */}
        {activeTab === "items" && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Menu Items
                </h2>
                <p className="text-sm text-gray-500">
                  Manage your restaurant's menu items and availability
                </p>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">🍽️</div>
                <p className="text-gray-500 mb-4">
                  Create categories first to organize your menu items
                </p>
                <Button
                  variant="primary"
                  onClick={() => setActiveTab("categories")}
                >
                  Go to Categories
                </Button>
              </div>
            ) : (
              <Table
                data={menuItems}
                columns={itemColumns}
                loading={loading}
                emptyText="No menu items yet. Add your first menu item to get started."
              />
            )}
          </Card>
        )}
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

            <FormField label="Price" required>
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

          <FormField label="Image URL">
            <Input
              type="url"
              value={itemForm.image_url}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, image_url: e.target.value }))
              }
              placeholder="https://example.com/image.jpg"
              leftIcon={<Image className="w-4 h-4" />}
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
  );
}
