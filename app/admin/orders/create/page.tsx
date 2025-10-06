"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import FormField from "@/components/admin/FormField";
import Input from "@/components/admin/Input";
import RoleGuard from "@/components/admin/RoleGuard";
import { formatCurrency } from "@/lib/constants";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type RestaurantTable = Tables<"restaurant_tables">;
type MenuCategory = Tables<"menu_categories">;
type MenuItem = Tables<"menu_items"> & {
  menu_categories: MenuCategory | null;
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export default function CreateOrderPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("is_active", true)
        .order("table_number", { ascending: true });

      if (tablesError) throw tablesError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from("menu_items")
        .select(`
          *,
          menu_categories (*)
        `)
        .eq("is_available", true)
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      setTables(tablesData || []);
      setCategories(categoriesData || []);
      setMenuItems((itemsData as MenuItem[]) || []);

      if (categoriesData && categoriesData.length > 0) {
        setActiveCategory(categoriesData[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            is_veg: item.is_veg || false,
          },
        ];
      }
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const validateForm = () => {
    if (orderType === 'dine-in' && !selectedTable) {
      setError("Please select a table for dine-in orders");
      return false;
    }
    if (cart.length === 0) {
      setError("Please add items to the order");
      return false;
    }
    // Customer details are now optional since staff creates orders
    return true;
  };

  const createOrder = async () => {
    if (!validateForm()) return;

    setCreating(true);
    setError("");

    try {
      // Get current staff member
      const response = await fetch("/api/admin/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to verify staff member");
      }

      const { user } = await response.json();
      if (!user) {
        throw new Error("Staff member not found");
      }

      let sessionId: string | null = null;
      let existingSession: any = null;

      // Only create sessions for dine-in orders
      if (orderType === 'dine-in') {
        // Handle dine-in orders with table
        const table = tables.find(t => t.id === selectedTable);
        if (!table) throw new Error("Table not found");

        // Check for existing active session or create new one
        const { data: sessionData, error: sessionCheckError } = await supabase
          .from("table_sessions")
          .select("*")
          .eq("table_id", selectedTable)
          .eq("status", "active")
          .maybeSingle();

        if (sessionCheckError) throw sessionCheckError;

        if (sessionData) {
          // Use existing session
          existingSession = sessionData;
          sessionId = sessionData.id;
        } else {
          // Create new session for dine-in
          const { data: newSession, error: sessionError } = await supabase
            .from("table_sessions")
            .insert({
              table_id: selectedTable,
              customer_email: customerInfo.email.trim() || null,
              customer_phone: customerInfo.phone.trim() || null,
              status: "active",
              session_started_at: new Date().toISOString(),
              total_orders: 0,
              total_amount: 0
            })
            .select()
            .single();

          if (sessionError) throw sessionError;
          sessionId = newSession.id;
        }
      }
      // For takeaway orders, no session is needed (sessionId remains null)

      // Create the order
      const orderNotes = customerInfo.notes.trim() ||
                        (customerInfo.name.trim() ? `Manual order for ${customerInfo.name.trim()}` :
                         `Order created by ${user.name || user.email}`);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_id: orderType === 'dine-in' ? selectedTable : null,
          table_session_id: sessionId, // null for takeaway, set for dine-in
          customer_email: customerInfo.email.trim() || null,
          customer_phone: customerInfo.phone.trim() || null,
          // guest_user_id will be set by database trigger if phone matches existing guest
          order_type: orderType,
          total_amount: getTotalAmount(),
          status: "placed",
          notes: orderNotes,
          // New creator tracking system
          created_by_type: user.role === 'super_admin' ? 'admin' : 'staff',
          created_by_admin_id: user.role === 'super_admin' ? user.id : null,
          created_by_staff_id: user.role === 'super_admin' ? null : user.id,
          // Keep old field for backwards compatibility
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update session totals
      if (sessionId) {
        const { error: updateSessionError } = await supabase
          .from("table_sessions")
          .update({
            total_orders: (existingSession?.total_orders || 0) + 1,
            total_amount: (existingSession?.total_amount || 0) + getTotalAmount(),
          })
          .eq("id", sessionId);

        if (updateSessionError) {
          console.error("Failed to update session totals:", updateSessionError);
        }
      }

      setSuccess(`Order created successfully! Order ID: ${orderData.id}`);
      setCart([]);
      setCustomerInfo({ name: "", phone: "", email: "", notes: "" });
      setSelectedTable("");
    } catch (error: any) {
      console.error("Error creating order:", error);
      setError(error.message || "Failed to create order");
    } finally {
      setCreating(false);
    }
  };

  const filteredItems = menuItems.filter((item) =>
    activeCategory ? item.category_id === activeCategory : true
  );

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading menu...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRoute="/admin/orders/create">
      <div>
        {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Manual Order</h1>
          <p className="text-gray-600 mt-1">
            Create orders for walk-in customers or those without email access
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Menu Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Type & Table Selection */}
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Type</h3>

              {/* Order Type Selection */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => {
                    setOrderType('dine-in');
                    if (orderType === 'takeaway') setSelectedTable('');
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 text-center font-medium transition-colors ${
                    orderType === 'dine-in'
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-2">🍽️</div>
                  <div>Dine In</div>
                </button>
                <button
                  onClick={() => {
                    setOrderType('takeaway');
                    setSelectedTable('');
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 text-center font-medium transition-colors ${
                    orderType === 'takeaway'
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-2">🥡</div>
                  <div>Takeaway</div>
                </button>
              </div>

              {/* Table Selection - Only show for dine-in */}
              {orderType === 'dine-in' && (
                <>
                  <h4 className="font-medium text-gray-900 mb-3">Select Table</h4>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {tables.map((table) => (
                      <button
                        key={table.id}
                        onClick={() => setSelectedTable(table.id)}
                        className={`p-3 rounded-lg border-2 text-center font-medium transition-colors ${
                          selectedTable === table.id
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {table.table_number}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {orderType === 'takeaway' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <span className="text-xl">🥡</span>
                    <span className="font-medium">Takeaway Order - No table required</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Category Tabs */}
          <Card>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === category.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Menu Items */}
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        {item.is_veg && <span className="text-green-600 text-sm">🟢</span>}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => addToCart(item)}
                      leftIcon={<Plus className="w-3 h-3" />}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Information</h3>
              <p className="text-sm text-gray-600 mb-4">Optional - Leave empty for walk-in customers</p>
              <div className="space-y-4">
                <FormField label="Customer Name (Optional)">
                  <Input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    placeholder="Enter customer name (optional)"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                </FormField>

                <FormField label="Phone Number (Optional)">
                  <Input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, phone: e.target.value })
                    }
                    placeholder="Enter phone number (optional)"
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                </FormField>

                <FormField label="Email (Optional)">
                  <Input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                </FormField>

                <FormField label="Notes (Optional)">
                  <textarea
                    value={customerInfo.notes}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, notes: e.target.value })
                    }
                    placeholder="Special instructions or notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </FormField>
              </div>
            </div>
          </Card>

          {/* Cart Summary */}
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Order Summary ({getTotalItems()} items)
                </h3>
              </div>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items added yet</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-2 p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                      <span>Order Type:</span>
                      <span className="flex items-center gap-1">
                        {orderType === 'dine-in' ? '🍽️ Dine In' : '🥡 Takeaway'}
                        {orderType === 'dine-in' && selectedTable && (
                          <>
                            {' - Table '}
                            {tables.find(t => t.id === selectedTable)?.table_number}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(getTotalAmount())}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={createOrder}
                    disabled={creating}
                    className="w-full mt-4"
                  >
                    {creating ? "Creating Order..." : "Create Order"}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </RoleGuard>
  );
}