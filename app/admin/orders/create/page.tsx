"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import {
  checkOfferEligibility,
  type OfferEligibility,
  type CartItem as EligibilityCartItem,
} from "@/lib/offers/eligibility";
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
  X,
  Search,
  Tag,
  Percent,
  Gift,
  ChevronRight,
  TrendingUp,
  Info,
  ChevronDown,
  Clock,
  Users,
} from "lucide-react";

type RestaurantTable = Tables<"restaurant_tables">;
type MenuCategory = Tables<"menu_categories">;
type MenuItem = Tables<"menu_items"> & {
  menu_categories: MenuCategory | null;
};
type Offer = Tables<"offers"> & {
  offer_items?: Array<
    Tables<"offer_items"> & {
      menu_items: Tables<"menu_items"> | null;
      menu_categories: Tables<"menu_categories"> | null;
    }
  >;
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
  category_id: string | null;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export default function CreateOrderPage() {
  // Data state
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Order state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  // Offer state
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isOfferLockedByGuest, setIsOfferLockedByGuest] = useState(false);
  const [eligibilityCache, setEligibilityCache] = useState<
    Record<string, OfferEligibility>
  >({});
  const [showOfferList, setShowOfferList] = useState(false);

  // UI state
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");

  // Loading & status state
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load initial data
  useEffect(() => {
    fetchData();
    fetchOffers();
  }, []);

  // Revalidate offers when cart changes
  useEffect(() => {
    if (offers.length > 0 && cart.length > 0) {
      validateAllOffers();
    } else {
      setEligibilityCache({});
      setSelectedOffer(null);
    }
  }, [cart, customerInfo.phone, offers]);

  // Check for locked offers when table is selected
  useEffect(() => {
    const checkLockedOffer = async () => {
      if (!selectedTable || orderType !== "dine-in" || offers.length === 0) {
        return;
      }

      try {
        const { data: sessionData, error } = await supabase
          .from("table_sessions")
          .select("locked_offer_id, locked_offer_data")
          .eq("table_id", selectedTable)
          .eq("status", "active")
          .maybeSingle();

        if (error) {
          console.error("Error checking locked offer:", error);
          return;
        }

        if (sessionData?.locked_offer_id) {
          // Find the locked offer
          const lockedOffer = offers.find(
            (o: Offer) => o.id === sessionData.locked_offer_id
          );
          if (lockedOffer) {
            setSelectedOffer(lockedOffer);
            setIsOfferLockedByGuest(true);
            console.log(
              `📌 Guest's locked offer detected: ${lockedOffer.name}`
            );
          }
        } else {
          // No locked offer, reset the flag
          setIsOfferLockedByGuest(false);
        }
      } catch (error) {
        console.error("Error checking locked offer:", error);
      }
    };

    checkLockedOffer();
  }, [selectedTable, orderType, offers]);

  const fetchData = async () => {
    try {
      setLoading(true);

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
        .select(
          `
          *,
          menu_categories (*)
        `
        )
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

  const fetchOffers = async () => {
    try {
      const filterField =
        orderType === "dine-in" ? "enabled_for_dinein" : "enabled_for_takeaway";

      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select(
          `
          *,
          offer_items (
            *,
            menu_items (*),
            menu_categories (*)
          )
        `
        )
        .eq("is_active", true)
        .eq(filterField, true)
        .eq("application_type", "session_level")
        .order("priority", { ascending: false });

      if (offersError) throw offersError;

      setOffers((offersData as Offer[]) || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  const validateAllOffers = async () => {
    const eligibilities: Record<string, OfferEligibility> = {};
    const cartTotal = getCartTotal();

    for (const offer of offers) {
      const cartItemsForCheck: EligibilityCartItem[] = cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category_id: item.category_id || undefined,
      }));

      const eligibility = await checkOfferEligibility(
        offer,
        cartItemsForCheck,
        cartTotal,
        customerInfo.phone.trim() || undefined,
        offer.offer_items
      );

      eligibilities[offer.id] = eligibility;
    }

    setEligibilityCache(eligibilities);

    // Auto-deselect if selected offer is no longer eligible
    if (
      selectedOffer &&
      eligibilities[selectedOffer.id] &&
      !eligibilities[selectedOffer.id].isEligible
    ) {
      setSelectedOffer(null);
    }
  };

  const handleOfferSelect = (offer: Offer) => {
    const eligibility = eligibilityCache[offer.id];

    if (!eligibility || !eligibility.isEligible) {
      return;
    }

    // Toggle selection
    if (selectedOffer?.id === offer.id) {
      setSelectedOffer(null);
    } else {
      setSelectedOffer(offer);
    }
    setShowOfferList(false);
  };

  const getOfferIcon = (offerType: string) => {
    switch (offerType) {
      case "cart_percentage":
      case "min_order_discount":
      case "item_percentage":
        return <Percent className="w-5 h-5" />;
      case "cart_flat_amount":
      case "item_free_addon":
      case "item_buy_get_free":
      case "cart_threshold_item":
        return <Gift className="w-5 h-5" />;
      case "time_based":
        return <Clock className="w-5 h-5" />;
      case "customer_based":
        return <Users className="w-5 h-5" />;
      case "promo_code":
      case "combo_meal":
        return <Tag className="w-5 h-5" />;
      default:
        return <Gift className="w-5 h-5" />;
    }
  };

  const formatOfferSummary = (offer: Offer, eligibility?: OfferEligibility) => {
    const benefits = offer.benefits as any;
    const conditions = offer.conditions as any;

    let summary = "";
    switch (offer.offer_type) {
      case "cart_percentage":
        summary = `${benefits.discount_percentage}% off`;
        if (benefits.max_discount_amount) {
          summary += ` (max ${formatCurrency(benefits.max_discount_amount)})`;
        }
        break;
      case "cart_flat_amount":
        summary = `${formatCurrency(benefits.discount_amount)} off`;
        break;
      case "min_order_discount":
        summary = `${formatCurrency(
          benefits.discount_amount
        )} off on orders above ${formatCurrency(conditions.threshold_amount)}`;
        break;
      case "cart_threshold_item":
        summary = `Free item on orders above ${formatCurrency(
          conditions.threshold_amount
        )}`;
        break;
      case "item_buy_get_free":
        summary = `Buy ${benefits.buy_quantity}, Get 1 free`;
        break;
      case "item_free_addon":
        summary = `Free item with purchase`;
        break;
      case "item_percentage":
        summary = `${benefits.discount_percentage}% off on selected items`;
        break;
      case "combo_meal":
        summary = `Combo deal - ${formatCurrency(benefits.combo_price)}`;
        break;
      case "promo_code":
        if (benefits.discount_percentage) {
          summary = `${benefits.discount_percentage}% off`;
          if (benefits.max_discount_amount) {
            summary += ` (max ${formatCurrency(benefits.max_discount_amount)})`;
          }
        } else {
          summary = `${formatCurrency(benefits.discount_amount)} off`;
        }
        break;
      default:
        summary = offer.description || "Special offer";
    }

    if (eligibility?.isEligible && eligibility.discount > 0) {
      summary += ` • Save ${formatCurrency(eligibility.discount)}`;
    }

    return summary;
  };

  const applyPromoCode = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (code) {
      setPromoCode(code);
      setPromoCodeInput("");
    }
  };

  const removePromoCode = () => {
    setPromoCode("");
    setPromoCodeInput("");
  };

  // Get selected table info
  const selectedTableData = useMemo(() => {
    return tables.find((t) => t.id === selectedTable);
  }, [tables, selectedTable]);

  // Check if selected table is veg-only
  const isVegOnlyTable = useMemo(() => {
    return selectedTableData?.veg_only || false;
  }, [selectedTableData]);

  // Filter menu items based on category, search, and veg-only restrictions
  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Filter by category
    if (activeCategory) {
      items = items.filter((item) => item.category_id === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    // Filter by veg-only restriction
    if (isVegOnlyTable && orderType === "dine-in") {
      items = items.filter((item) => item.is_veg);
    }

    return items;
  }, [menuItems, activeCategory, searchQuery, isVegOnlyTable, orderType]);

  const addToCart = (item: MenuItem) => {
    // Check veg-only restriction
    if (isVegOnlyTable && orderType === "dine-in" && !item.is_veg) {
      setError(
        `Table ${selectedTableData?.table_number} is veg-only. Only vegetarian items can be added.`
      );
      setTimeout(() => setError(""), 3000);
      return;
    }

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
            category_id: item.category_id,
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

  const clearCart = () => {
    setCart([]);
    setPromoCode("");
    setPromoCodeInput("");
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getFinalAmount = () => {
    const cartTotal = getCartTotal();
    if (selectedOffer && eligibilityCache[selectedOffer.id]) {
      return cartTotal - eligibilityCache[selectedOffer.id].discount;
    }
    return cartTotal;
  };

  const getTotalDiscount = () => {
    if (selectedOffer && eligibilityCache[selectedOffer.id]) {
      return eligibilityCache[selectedOffer.id].discount;
    }
    return 0;
  };

  // Categorize offers for display
  const categorizedOffers = useMemo(() => {
    const available: Offer[] = [];
    const almostThere: Offer[] = [];
    const notEligible: Offer[] = [];

    offers.forEach((offer) => {
      const eligibility = eligibilityCache[offer.id];
      if (!eligibility) return;

      if (eligibility.isEligible) {
        available.push(offer);
      } else if (
        eligibility.reason?.includes("Add") ||
        eligibility.reason?.includes("more")
      ) {
        almostThere.push(offer);
      } else {
        notEligible.push(offer);
      }
    });

    return { available, almostThere, notEligible };
  }, [offers, eligibilityCache]);

  // Helper function to handle table selection
  const handleTableSelection = (tableId: string) => {
    setSelectedTable(tableId);
    // Reset locked offer flag when changing tables
    setIsOfferLockedByGuest(false);
    setSelectedOffer(null);
  };

  const validateForm = () => {
    if (orderType === "dine-in" && !selectedTable) {
      setError("Please select a table for dine-in orders");
      return false;
    }
    if (cart.length === 0) {
      setError("Please add items to the order");
      return false;
    }
    return true;
  };

  const createOrder = async () => {
    if (!validateForm()) return;

    setCreating(true);
    setError("");
    setSuccess("");

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
      if (orderType === "dine-in") {
        const table = tables.find((t) => t.id === selectedTable);
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
          // Note: locked offer already set by useEffect when table was selected
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
              total_amount: 0,
            })
            .select()
            .single();

          if (sessionError) throw sessionError;
          sessionId = newSession.id;
        }
      }

      // Create the order
      // Check for existing active order in this session
      // (One session = One order with multiple KOTs)
      let orderId: string | undefined;
      let existingOrderAmount = 0;
      let isAddingToExisting = false;

      if (sessionId && orderType === "dine-in") {
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("*")
          .eq("table_session_id", sessionId)
          .not("status", "in", '("completed","paid","cancelled")')
          .maybeSingle();

        if (existingOrder) {
          // ADD ITEMS TO EXISTING ORDER
          orderId = existingOrder.id;
          existingOrderAmount = existingOrder.total_amount || 0;
          isAddingToExisting = true;
          console.log(
            `Adding items to existing order ${orderId} (current total: ₹${existingOrderAmount})`
          );
        }
      }

      // Create new order only if no existing active order found
      if (!orderId) {
        const orderNotes =
          customerInfo.notes.trim() ||
          (customerInfo.name.trim()
            ? `Manual order for ${customerInfo.name.trim()}`
            : `Order created by ${user.name || user.email}`);

        // Determine which offer to use:
        // 1. If session has locked offer (from guest), use it
        // 2. Otherwise, use admin's selected offer
        const offerToUse =
          existingSession?.locked_offer_id || selectedOffer?.id || null;

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            table_id: orderType === "dine-in" ? selectedTable : null,
            table_session_id: sessionId,
            customer_email: customerInfo.email.trim() || null,
            customer_phone: customerInfo.phone.trim() || null,
            customer_name: customerInfo.name.trim() || null,
            order_type: orderType,
            total_amount: getFinalAmount(), // Final amount after discount
            session_offer_id: offerToUse, // Use locked offer or selected offer
            status: "placed",
            notes: orderNotes,
            created_by_type: user.role === "super_admin" ? "admin" : "staff",
            created_by_admin_id: user.role === "super_admin" ? user.id : null,
            created_by_staff_id: user.role === "super_admin" ? null : user.id,
            created_by: user.id,
          })
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = orderData.id;

        // Lock offer to session if this is a new order with an offer
        // and session doesn't have a locked offer yet
        if (
          sessionId &&
          offerToUse &&
          !existingSession?.locked_offer_id &&
          selectedOffer
        ) {
          await supabase
            .from("table_sessions")
            .update({
              locked_offer_id: offerToUse,
              locked_offer_data: {
                offer_id: selectedOffer.id,
                name: selectedOffer.name,
                offer_type: selectedOffer.offer_type,
                conditions: selectedOffer.conditions,
                benefits: selectedOffer.benefits,
                locked_at: new Date().toISOString(),
              },
              offer_applied_at: new Date().toISOString(),
            })
            .eq("id", sessionId);

          console.log(
            `🔒 Locked offer "${selectedOffer.name}" to session ${sessionId}`
          );
        }
      }

      if (!orderId) {
        throw new Error("Failed to get or create order");
      }

      // Get next KOT number
      const { data: kotData, error: kotError } = await supabase.rpc(
        "get_next_kot_number" as any
      );

      if (kotError) {
        throw new Error("Failed to generate KOT number: " + kotError.message);
      }

      const kotNumber = kotData as unknown as number;
      const kotBatchId = crypto.randomUUID();

      // Create order items with KOT info
      const orderItems = cart.map((item) => ({
        order_id: orderId, // Use the orderId (either new or existing)
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        kot_number: kotNumber,
        kot_batch_id: kotBatchId,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update order total if adding to existing order
      if (isAddingToExisting) {
        const newOrderTotal = existingOrderAmount + getFinalAmount();
        const { error: updateOrderError } = await supabase
          .from("orders")
          .update({ total_amount: newOrderTotal })
          .eq("id", orderId);

        if (updateOrderError) {
          console.error("Failed to update order total:", updateOrderError);
        } else {
          console.log(
            `Updated order total: ₹${existingOrderAmount} + ₹${getFinalAmount()} = ₹${newOrderTotal}`
          );
        }
      }

      // Update offer usage count if offer was applied
      if (selectedOffer && eligibilityCache[selectedOffer.id]) {
        try {
          await supabase.rpc("increment_offer_usage" as any, {
            offer_id: selectedOffer.id,
          });
        } catch (error) {
          // RPC might not exist, that's okay - offer already linked via session_offer_id
          console.log("increment_offer_usage RPC not available (optional)");
        }
      }

      // Update session totals
      if (sessionId) {
        const incrementOrders = isAddingToExisting ? 0 : 1; // Only increment if new order
        const { error: updateSessionError } = await supabase
          .from("table_sessions")
          .update({
            total_orders:
              (existingSession?.total_orders || 0) + incrementOrders,
            total_amount:
              (existingSession?.total_amount || 0) + getFinalAmount(),
          })
          .eq("id", sessionId);

        if (updateSessionError) {
          console.error("Failed to update session totals:", updateSessionError);
        }
      }

      const successMessage = isAddingToExisting
        ? `Items added to existing order! KOT #${kotNumber} sent to kitchen.`
        : `Order created successfully! KOT #${kotNumber} sent to kitchen.`;

      setSuccess(successMessage);

      // Reset form
      clearCart();
      setCustomerInfo({ name: "", phone: "", email: "", notes: "" });
      setSelectedTable("");
      setShowCart(false);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(""), 5000);
    } catch (error: any) {
      console.error("Error creating order:", error);
      setError(error.message || "Failed to create order");
    } finally {
      setCreating(false);
    }
  };

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
      <div className="pb-20 lg:pb-0">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              Create Order
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Create orders for walk-in customers
            </p>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 lg:p-4 mb-4 lg:mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="text-sm lg:text-base">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 lg:p-4 mb-4 lg:mb-6">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="text-sm lg:text-base">{success}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Menu Selection */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Order Type & Table Selection */}
            <Card>
              <div className="p-3 lg:p-4">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
                  Order Type
                </h3>

                {/* Order Type Selection */}
                <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-4 lg:mb-6">
                  <button
                    onClick={() => {
                      setOrderType("dine-in");
                      if (orderType === "takeaway") setSelectedTable("");
                    }}
                    className={`p-3 lg:p-4 rounded-lg border-2 text-center font-medium transition-colors ${
                      orderType === "dine-in"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl lg:text-3xl mb-1 lg:mb-2">🍽️</div>
                    <div className="text-sm lg:text-base">Dine In</div>
                  </button>
                  <button
                    onClick={() => {
                      setOrderType("takeaway");
                      setSelectedTable("");
                      // Reset offer state when switching to takeaway
                      setIsOfferLockedByGuest(false);
                      setSelectedOffer(null);
                    }}
                    className={`p-3 lg:p-4 rounded-lg border-2 text-center font-medium transition-colors ${
                      orderType === "takeaway"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl lg:text-3xl mb-1 lg:mb-2">🥡</div>
                    <div className="text-sm lg:text-base">Takeaway</div>
                  </button>
                </div>

                {/* Table Selection - Only show for dine-in */}
                {orderType === "dine-in" && (
                  <>
                    <h4 className="font-medium text-gray-900 mb-2 lg:mb-3 text-sm lg:text-base">
                      Select Table
                    </h4>

                    {/* Regular Tables */}
                    {tables.filter((t) => !t.veg_only).length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-600 mb-2">
                          Regular Tables
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 lg:gap-3">
                          {tables
                            .filter((t) => !t.veg_only)
                            .map((table) => (
                              <button
                                key={table.id}
                                onClick={() => handleTableSelection(table.id)}
                                className={`p-2 lg:p-3 rounded-lg border-2 text-center font-medium transition-colors min-h-[44px] ${
                                  selectedTable === table.id
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div className="text-sm lg:text-base">
                                  {table.table_number}
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Veg-Only Tables */}
                    {tables.filter((t) => t.veg_only).length > 0 && (
                      <div>
                        <p className="text-xs text-green-700 mb-2 flex items-center gap-1">
                          <span className="text-base">🌱</span>
                          Veg-Only Tables (Only vegetarian items allowed)
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 lg:gap-3">
                          {tables
                            .filter((t) => t.veg_only)
                            .map((table) => (
                              <button
                                key={table.id}
                                onClick={() => handleTableSelection(table.id)}
                                className={`p-2 lg:p-3 rounded-lg border-2 text-center font-medium transition-colors min-h-[44px] ${
                                  selectedTable === table.id
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : "border-green-200 hover:border-green-300 text-green-700"
                                }`}
                              >
                                <div className="text-sm lg:text-base">
                                  V{table.table_number}
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Veg-Only Warning */}
                    {isVegOnlyTable && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800 text-sm">
                          <span className="text-base">🌱</span>
                          <span className="font-medium">
                            Table V{selectedTableData?.table_number} is
                            veg-only. Only vegetarian items will be shown.
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {orderType === "takeaway" && (
                  <div className="p-3 lg:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 text-sm lg:text-base">
                      <span className="text-xl lg:text-2xl">🥡</span>
                      <span className="font-medium">
                        Takeaway Order - No table required
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Menu Items */}
            <Card>
              <div className="p-3 lg:p-4">
                {/* Search Bar */}
                <div className="mb-3 lg:mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search menu items..."
                      className="w-full pl-10 pr-4 py-2 lg:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base"
                    />
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="flex overflow-x-auto gap-2 mb-3 lg:mb-4 pb-2 scrollbar-hide">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeCategory === category.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                {/* Menu Items Grid */}
                <div className="space-y-2 lg:space-y-3 max-h-[60vh] overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-8 lg:py-12 text-gray-500">
                      {searchQuery ? (
                        <>No items found matching "{searchQuery}"</>
                      ) : isVegOnlyTable ? (
                        <>No vegetarian items in this category</>
                      ) : (
                        <>No items available</>
                      )}
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 lg:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 text-sm lg:text-base truncate">
                              {item.name}
                            </h4>
                            {item.is_veg && (
                              <span className="text-green-600 text-xs lg:text-sm flex-shrink-0">
                                🟢
                              </span>
                            )}
                            {!item.is_veg && (
                              <span className="text-red-600 text-xs lg:text-sm flex-shrink-0">
                                🔴
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1 truncate">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs lg:text-sm font-medium text-gray-900 mt-0.5 lg:mt-1">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => addToCart(item)}
                          className="ml-2 lg:ml-3 flex-shrink-0 min-h-[44px] lg:min-h-0"
                        >
                          <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
                          <span className="hidden lg:inline ml-1">Add</span>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Order Summary (Desktop) */}
          <div className="hidden lg:block space-y-6">
            <OrderSummary
              cart={cart}
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              orderType={orderType}
              selectedTable={selectedTable}
              tables={tables}
              promoCode={promoCode}
              promoCodeInput={promoCodeInput}
              setPromoCodeInput={setPromoCodeInput}
              applyPromoCode={applyPromoCode}
              removePromoCode={removePromoCode}
              offers={offers}
              selectedOffer={selectedOffer}
              setSelectedOffer={setSelectedOffer}
              isOfferLockedByGuest={isOfferLockedByGuest}
              eligibilityCache={eligibilityCache}
              showOfferList={showOfferList}
              setShowOfferList={setShowOfferList}
              categorizedOffers={categorizedOffers}
              handleOfferSelect={handleOfferSelect}
              getOfferIcon={getOfferIcon}
              formatOfferSummary={formatOfferSummary}
              getCartTotal={getCartTotal}
              getTotalItems={getTotalItems}
              getFinalAmount={getFinalAmount}
              getTotalDiscount={getTotalDiscount}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              createOrder={createOrder}
              creating={creating}
            />
          </div>
        </div>

        {/* Mobile Sticky Bottom Cart Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          {cart.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Add items to cart to start creating order
            </div>
          ) : (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-sm">
                    {getTotalItems()} item{getTotalItems() !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-right">
                  {getTotalDiscount() > 0 && (
                    <div className="text-xs text-green-600 line-through">
                      {formatCurrency(getCartTotal())}
                    </div>
                  )}
                  <div className="font-bold text-base">
                    {formatCurrency(getFinalAmount())}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCart(true)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  View Cart
                </button>
                <button
                  onClick={createOrder}
                  disabled={
                    creating || (!selectedTable && orderType === "dine-in")
                  }
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create Order"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Cart Full Screen Modal */}
        {showCart && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowCart(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle Bar */}
              <div className="flex items-center justify-center py-2 border-b">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1">
                <OrderSummary
                  cart={cart}
                  customerInfo={customerInfo}
                  setCustomerInfo={setCustomerInfo}
                  orderType={orderType}
                  selectedTable={selectedTable}
                  tables={tables}
                  promoCode={promoCode}
                  promoCodeInput={promoCodeInput}
                  setPromoCodeInput={setPromoCodeInput}
                  applyPromoCode={applyPromoCode}
                  removePromoCode={removePromoCode}
                  offers={offers}
                  selectedOffer={selectedOffer}
                  setSelectedOffer={setSelectedOffer}
                  isOfferLockedByGuest={isOfferLockedByGuest}
                  eligibilityCache={eligibilityCache}
                  showOfferList={showOfferList}
                  setShowOfferList={setShowOfferList}
                  categorizedOffers={categorizedOffers}
                  handleOfferSelect={handleOfferSelect}
                  getOfferIcon={getOfferIcon}
                  formatOfferSummary={formatOfferSummary}
                  getCartTotal={getCartTotal}
                  getTotalItems={getTotalItems}
                  getFinalAmount={getFinalAmount}
                  getTotalDiscount={getTotalDiscount}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                  clearCart={clearCart}
                  createOrder={createOrder}
                  creating={creating}
                  isMobile={true}
                  onClose={() => setShowCart(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

// Order Summary Component (Reusable for Desktop and Mobile)
interface OrderSummaryProps {
  cart: CartItem[];
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  orderType: "dine-in" | "takeaway";
  selectedTable: string;
  tables: RestaurantTable[];
  promoCode: string;
  promoCodeInput: string;
  setPromoCodeInput: (code: string) => void;
  applyPromoCode: () => void;
  removePromoCode: () => void;
  offers: Offer[];
  selectedOffer: Offer | null;
  setSelectedOffer: (offer: Offer | null) => void;
  isOfferLockedByGuest: boolean;
  eligibilityCache: Record<string, OfferEligibility>;
  showOfferList: boolean;
  setShowOfferList: (show: boolean) => void;
  categorizedOffers: {
    available: Offer[];
    almostThere: Offer[];
    notEligible: Offer[];
  };
  handleOfferSelect: (offer: Offer) => void;
  getOfferIcon: (offerType: string) => JSX.Element;
  formatOfferSummary: (offer: Offer, eligibility?: OfferEligibility) => string;
  getCartTotal: () => number;
  getTotalItems: () => number;
  getFinalAmount: () => number;
  getTotalDiscount: () => number;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  createOrder: () => void;
  creating: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

function OrderSummary({
  cart,
  customerInfo,
  setCustomerInfo,
  orderType,
  selectedTable,
  tables,
  promoCode,
  promoCodeInput,
  setPromoCodeInput,
  applyPromoCode,
  removePromoCode,
  offers,
  selectedOffer,
  setSelectedOffer,
  isOfferLockedByGuest,
  eligibilityCache,
  showOfferList,
  setShowOfferList,
  categorizedOffers,
  handleOfferSelect,
  getOfferIcon,
  formatOfferSummary,
  getCartTotal,
  getTotalItems,
  getFinalAmount,
  getTotalDiscount,
  updateQuantity,
  removeFromCart,
  clearCart,
  createOrder,
  creating,
  isMobile = false,
  onClose,
}: OrderSummaryProps) {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Order Summary ({getTotalItems()} items)
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className={isMobile ? "px-4 pb-4 space-y-4" : "space-y-6"}>
        {/* Customer Information */}
        <Card>
          <div className="p-3 lg:p-4">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">
              Customer Information
            </h3>
            <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4">
              Optional - Leave empty for walk-in customers
            </p>
            <div className="space-y-3 lg:space-y-4">
              <FormField label="Customer Name">
                <Input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, name: e.target.value })
                  }
                  placeholder="Enter name (optional)"
                  leftIcon={<User className="w-4 h-4" />}
                />
              </FormField>

              <FormField label="Phone Number">
                <Input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                  placeholder="Enter phone (optional)"
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </FormField>

              <FormField label="Notes">
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, notes: e.target.value })
                  }
                  placeholder="Special instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base"
                  rows={2}
                />
              </FormField>
            </div>
          </div>
        </Card>

        {/* Cart Summary */}
        <Card>
          <div className="p-3 lg:p-4">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                  Cart ({getTotalItems()})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs lg:text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-6 lg:py-8 text-sm lg:text-base">
                No items added yet
              </p>
            ) : (
              <div className="space-y-2 lg:space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-medium text-gray-900 text-sm lg:text-base truncate">
                          {item.name}
                        </h4>
                        {item.is_veg && <span className="text-xs">🟢</span>}
                      </div>
                      <p className="text-xs lg:text-sm text-gray-600">
                        {formatCurrency(item.price)} × {item.quantity} ={" "}
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 lg:gap-2 ml-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 flex-shrink-0"
                      >
                        <Minus className="w-3 h-3 lg:w-4 lg:h-4" />
                      </button>
                      <span className="w-6 lg:w-8 text-center font-medium text-sm lg:text-base">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 flex-shrink-0"
                      >
                        <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-1 lg:ml-2 p-1.5 lg:p-2 text-red-600 hover:text-red-800 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Promo Code Section */}
                <div className="pt-2 lg:pt-3 border-t">
                  {!promoCode ? (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) =>
                          setPromoCodeInput(e.target.value.toUpperCase())
                        }
                        placeholder="Enter promo code"
                        leftIcon={<Tag className="w-4 h-4" />}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={applyPromoCode}
                        disabled={!promoCodeInput.trim()}
                      >
                        Apply
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          {promoCode}
                        </span>
                      </div>
                      <button
                        onClick={removePromoCode}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Offers Section */}
                <div className="pt-2 lg:pt-3 border-t">
                  {/* Selected Offer Display */}
                  {selectedOffer && (
                    <div
                      className={`mb-3 border-2 rounded-lg p-3 ${
                        isOfferLockedByGuest
                          ? "bg-blue-50 border-blue-200"
                          : "bg-green-50 border-green-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <div
                            className={`p-1.5 bg-white rounded-lg shadow-sm ${
                              isOfferLockedByGuest
                                ? "text-blue-600"
                                : "text-green-600"
                            }`}
                          >
                            {getOfferIcon(selectedOffer.offer_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-semibold text-gray-900 text-sm">
                                {selectedOffer.name}
                              </div>
                              {isOfferLockedByGuest && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                                  <Users className="w-3 h-3" />
                                  Guest Applied
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-700 mt-0.5">
                              {formatOfferSummary(
                                selectedOffer,
                                eligibilityCache[selectedOffer.id]
                              )}
                            </div>
                            {selectedOffer.promo_code && (
                              <div className="mt-1.5">
                                <span className="text-xs text-gray-600">
                                  Code:{" "}
                                </span>
                                <span className="font-mono font-bold text-xs bg-white px-1.5 py-0.5 rounded border">
                                  {selectedOffer.promo_code}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {!isOfferLockedByGuest && (
                          <button
                            onClick={() => setSelectedOffer(null)}
                            className="text-green-600 hover:text-green-800 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Apply Offer Button or Locked Message */}
                  {isOfferLockedByGuest ? (
                    <div className="w-full p-2.5 lg:p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                        <Users className="w-4 h-4" />
                        <span>Offer Already Applied by Guest</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1 ml-6">
                        This offer was applied by the guest and cannot be
                        changed
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowOfferList(!showOfferList)}
                      className="w-full flex items-center justify-between p-2.5 lg:p-3 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-dashed border-green-300 rounded-lg hover:from-green-100 hover:to-blue-100 transition-all"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                        <Gift className="w-4 h-4" />
                        <span>
                          {selectedOffer ? "Change Offer" : "Apply Offer"}
                        </span>
                        {categorizedOffers.available.length > 0 && (
                          <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {categorizedOffers.available.length}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-green-600 transition-transform ${
                          showOfferList ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}

                  {/* Offer List */}
                  {showOfferList && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 space-y-3 max-h-96 overflow-y-auto">
                      {/* Section 1: Available Now (Green) */}
                      {categorizedOffers.available.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 text-xs lg:text-sm font-semibold text-green-700 mb-2">
                            <CheckCircle className="w-4 h-4" />
                            Available Now
                          </div>
                          <div className="space-y-2">
                            {categorizedOffers.available.map((offer) => {
                              const eligibility = eligibilityCache[offer.id];
                              const isSelected = selectedOffer?.id === offer.id;
                              return (
                                <button
                                  key={offer.id}
                                  onClick={() => handleOfferSelect(offer)}
                                  className={`w-full text-left rounded-lg p-2.5 transition-colors ${
                                    isSelected
                                      ? "bg-green-100 border-2 border-green-400"
                                      : "bg-green-50 border-2 border-green-200 hover:bg-green-100 hover:border-green-300"
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm text-green-600 flex-shrink-0">
                                      {getOfferIcon(offer.offer_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-900 text-xs lg:text-sm">
                                        {offer.name}
                                      </div>
                                      <div className="text-xs text-gray-700 mt-0.5">
                                        {formatOfferSummary(offer, eligibility)}
                                      </div>
                                      {offer.promo_code && (
                                        <div className="mt-1">
                                          <span className="text-xs text-gray-600">
                                            Code:{" "}
                                          </span>
                                          <span className="font-mono font-bold text-xs bg-white px-1.5 py-0.5 rounded border">
                                            {offer.promo_code}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Almost There (Amber) */}
                      {categorizedOffers.almostThere.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 text-xs lg:text-sm font-semibold text-amber-700 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            Almost There
                          </div>
                          <div className="space-y-2">
                            {categorizedOffers.almostThere.map((offer) => {
                              const eligibility = eligibilityCache[offer.id];
                              return (
                                <div
                                  key={offer.id}
                                  className="bg-amber-50 border border-amber-200 rounded-lg p-2.5"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm text-amber-600 flex-shrink-0">
                                      {getOfferIcon(offer.offer_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-900 text-xs lg:text-sm">
                                        {offer.name}
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <TrendingUp className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                        <div className="text-xs text-amber-700 font-medium">
                                          {eligibility.reason}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section 3: Not Eligible (Grey) */}
                      {categorizedOffers.notEligible.length > 0 && (
                        <div>
                          <div className="text-xs lg:text-sm font-semibold text-gray-500 mb-2">
                            Not Eligible
                          </div>
                          <div className="space-y-2">
                            {categorizedOffers.notEligible.map((offer) => {
                              const eligibility = eligibilityCache[offer.id];
                              return (
                                <div
                                  key={offer.id}
                                  className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 opacity-60"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm text-gray-400 flex-shrink-0">
                                      {getOfferIcon(offer.offer_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-700 text-xs lg:text-sm">
                                        {offer.name}
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Info className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                        <div className="text-xs text-gray-600">
                                          {eligibility.reason}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {offers.length === 0 && (
                        <div className="text-center text-sm text-gray-500 py-4">
                          No offers available
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="pt-2 lg:pt-3 border-t space-y-1.5 lg:space-y-2">
                  <div className="flex justify-between items-center text-xs lg:text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(getCartTotal())}</span>
                  </div>

                  {getTotalDiscount() > 0 && (
                    <div className="flex justify-between items-center text-xs lg:text-sm text-green-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3 lg:w-4 lg:h-4" />
                        Discount:
                      </span>
                      <span>-{formatCurrency(getTotalDiscount())}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm lg:text-base text-gray-600">
                    <span>Order Type:</span>
                    <span className="flex items-center gap-1">
                      {orderType === "dine-in" ? "🍽️ Dine In" : "🥡 Takeaway"}
                      {orderType === "dine-in" && selectedTable && (
                        <>
                          {" - "}
                          {tables.find((t) => t.id === selectedTable)?.veg_only
                            ? "V"
                            : ""}
                          {
                            tables.find((t) => t.id === selectedTable)
                              ?.table_number
                          }
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center font-bold text-base lg:text-lg pt-1.5 lg:pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(getFinalAmount())}</span>
                  </div>
                </div>

                {/* Create Order Button */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={createOrder}
                  disabled={creating}
                  className="w-full mt-3 lg:mt-4 min-h-[48px] lg:min-h-0"
                >
                  {creating ? "Creating Order..." : "Create Order"}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
