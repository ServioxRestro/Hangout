"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import RoleGuard from "@/components/admin/RoleGuard";
import Button from "@/components/admin/Button";
import Card from "@/components/admin/Card";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Info,
  Calendar,
  Clock,
  Users,
  Tag,
  Image as ImageIcon,
  X,
} from "lucide-react";

// Offer type configurations
const offerTypeConfigs: Record<string, any> = {
  // DISCOUNT OFFERS (Session-Level)
  cart_percentage: {
    name: "Cart % Discount",
    description: "Apply percentage discount on total cart value at billing",
    application_type: "session_level",
    icon: "Percent",
    benefitsSchema: {
      discount_percentage: { type: "number", required: true, min: 1, max: 100 },
      max_discount_amount: { type: "number", required: false, min: 0 },
    },
    conditionsSchema: {
      min_amount: { type: "number", required: false, min: 0 },
    },
  },
  cart_flat_amount: {
    name: "Cart Flat Discount",
    description: "Fixed amount discount on total cart at billing",
    application_type: "session_level",
    icon: "Tag",
    benefitsSchema: {
      discount_amount: { type: "number", required: true, min: 1 },
    },
    conditionsSchema: {
      min_amount: { type: "number", required: true, min: 0 },
    },
  },
  min_order_discount: {
    name: "Minimum Order Discount",
    description: "Discount when minimum order amount is reached",
    application_type: "session_level",
    icon: "Package",
    benefitsSchema: {
      discount_percentage: { type: "number", required: false, min: 1, max: 100 },
      discount_amount: { type: "number", required: false, min: 1 },
      max_discount_amount: { type: "number", required: false, min: 0 },
    },
    conditionsSchema: {
      min_amount: { type: "number", required: true, min: 1 },
    },
  },

  // FREE ITEM OFFERS (Order-Level)
  item_buy_get_free: {
    name: "Buy X Get Y Free",
    description: "Buy certain items and get others free at checkout",
    application_type: "order_level",
    icon: "ShoppingBag",
    benefitsSchema: {
      get_quantity: { type: "number", required: true, min: 1 },
      get_same_item: { type: "boolean", required: false },
    },
    conditionsSchema: {
      buy_quantity: { type: "number", required: true, min: 1 },
    },
  },
  cart_threshold_item: {
    name: "Free Item on Threshold",
    description: "Get a free item when cart value exceeds amount",
    application_type: "order_level",
    icon: "Gift",
    benefitsSchema: {
      free_category: { type: "string", required: false },
      max_price: { type: "number", required: false, min: 0 },
    },
    conditionsSchema: {
      min_amount: { type: "number", required: true, min: 1 },
      threshold_amount: { type: "number", required: false, min: 0 },
    },
  },
  item_free_addon: {
    name: "Free Add-on Item",
    description: "Free side item with specific item purchase",
    application_type: "order_level",
    icon: "Package",
    benefitsSchema: {
      max_price: { type: "number", required: false, min: 0 },
    },
    conditionsSchema: {
      min_quantity: { type: "number", required: false, min: 1 },
    },
  },

  // COMBO OFFERS (Order-Level)
  combo_meal: {
    name: "Combo Meal Deal",
    description: "Fixed price for bundled items",
    application_type: "order_level",
    icon: "ShoppingBag",
    benefitsSchema: {
      combo_price: { type: "number", required: true, min: 0 },
      is_customizable: { type: "boolean", required: false },
    },
    conditionsSchema: {},
  },
  item_percentage: {
    name: "Item % Discount",
    description: "Percentage discount on specific items",
    application_type: "order_level",
    icon: "Percent",
    benefitsSchema: {
      discount_percentage: { type: "number", required: true, min: 1, max: 100 },
    },
    conditionsSchema: {
      min_quantity: { type: "number", required: false, min: 1 },
    },
  },

  // SPECIAL OFFERS
  time_based: {
    name: "Time Slot Offer",
    description: "Discounts during specific hours/days",
    application_type: "session_level",
    icon: "Clock",
    benefitsSchema: {
      discount_percentage: { type: "number", required: false, min: 1, max: 100 },
      discount_amount: { type: "number", required: false, min: 1 },
      max_discount_amount: { type: "number", required: false, min: 0 },
    },
    conditionsSchema: {
      min_amount: { type: "number", required: false, min: 0 },
    },
  },
  customer_based: {
    name: "Customer Segment Offer",
    description: "Offers for specific customer types (first-time, returning, loyalty)",
    application_type: "session_level",
    icon: "Users",
    benefitsSchema: {
      discount_percentage: { type: "number", required: false, min: 1, max: 100 },
      discount_amount: { type: "number", required: false, min: 1 },
      max_discount_amount: { type: "number", required: false, min: 0 },
    },
    conditionsSchema: {
      min_amount: { type: "number", required: false, min: 0 },
      min_orders_count: { type: "number", required: false, min: 1 },
    },
  },
  promo_code: {
    name: "Promo/Coupon Code",
    description: "Redeemable with unique promotional code",
    application_type: "session_level",
    icon: "Tag",
    benefitsSchema: {
      discount_percentage: { type: "number", required: false, min: 1, max: 100 },
      discount_amount: { type: "number", required: false, min: 1 },
      max_discount_amount: { type: "number", required: false, min: 0 },
    },
    conditionsSchema: {
      min_amount: { type: "number", required: false, min: 0 },
    },
  },
};

const daysOfWeek = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export default function CreateOfferFormPage() {
  const router = useRouter();
  const params = useParams();
  const offerType = params?.offerType as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Array<{
    type: 'item' | 'category';
    id: string;
    name: string;
    item_type?: 'buy' | 'get' | 'combo';
    quantity?: number;
    is_required?: boolean;
    is_selectable?: boolean;
  }>>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    is_active: true,
    priority: 5,
    start_date: "",
    end_date: "",
    usage_limit: "",
    promo_code: "",
    valid_days: [] as string[],
    valid_hours_start: "",
    valid_hours_end: "",
    target_customer_type: "all",
    // Dynamic fields - Benefits
    discount_percentage: "",
    discount_amount: "",
    max_discount_amount: "", // NEW: Cap for percentage discounts
    max_price: "",
    buy_quantity: "",
    get_quantity: "",
    get_same_item: false,
    free_category: "",
    combo_price: "",
    is_customizable: false,
    // Dynamic fields - Conditions
    min_amount: "",
    threshold_amount: "",
    min_quantity: "",
    min_orders_count: "",
  });

  const config = offerTypeConfigs[offerType];

  useEffect(() => {
    if (!config) {
      router.push("/admin/offers/create");
    }
  }, [config, router]);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      // Fetch categories
      const { data: categories } = await supabase
        .from("menu_categories")
        .select("id, name, display_order")
        .order("display_order");

      // Fetch items
      const { data: items } = await supabase
        .from("menu_items")
        .select("id, name, category_id, price, is_veg, is_available")
        .eq("is_available", true)
        .order("name");

      setMenuCategories(categories || []);
      setMenuItems(items || []);
    } catch (error) {
      console.error("Error fetching menu:", error);
    }
  };

  if (!config) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate item selection for offers that require it
      const needsItemSelection = [
        'item_buy_get_free',
        'cart_threshold_item',
        'item_free_addon',
        'item_percentage',
        'combo_meal'
      ].includes(offerType);

      if (needsItemSelection && selectedItems.length === 0) {
        throw new Error('Please select at least one menu item or category for this offer type');
      }

      // Validate BOGO has both buy and get items
      if (offerType === 'item_buy_get_free') {
        const hasBuyItem = selectedItems.some(item => item.item_type === 'buy');
        const hasGetItem = selectedItems.some(item => item.item_type === 'get');
        if (!hasBuyItem || !hasGetItem) {
          throw new Error('BOGO offers must have at least one "Buy" item and one "Get Free" item');
        }
      }

      // Validate promo code offers
      if (offerType === 'promo_code') {
        if (!formData.discount_percentage && !formData.discount_amount) {
          throw new Error('Promo code offers must have either a discount percentage or flat discount amount');
        }
      }

      // Validate min_order_discount
      if (offerType === 'min_order_discount') {
        if (!formData.discount_percentage && !formData.discount_amount) {
          throw new Error('This offer type must have either a discount percentage or flat discount amount');
        }
      }

      // Build conditions and benefits based on offer type
      const conditions: any = {};
      const benefits: any = {};

      // Build benefits
      if (formData.discount_percentage) {
        benefits.discount_percentage = Number(formData.discount_percentage);
      }
      if (formData.discount_amount) {
        benefits.discount_amount = Number(formData.discount_amount);
      }
      if (formData.max_discount_amount) {
        benefits.max_discount_amount = Number(formData.max_discount_amount);
      }
      if (formData.max_price) {
        benefits.max_price = Number(formData.max_price);
      }
      if (formData.get_quantity) {
        benefits.get_quantity = Number(formData.get_quantity);
      }
      if (formData.get_same_item) {
        benefits.get_same_item = true;
      }
      if (formData.free_category) {
        benefits.free_category = formData.free_category;
      }
      if (formData.combo_price) {
        benefits.combo_price = Number(formData.combo_price);
      }
      if (formData.is_customizable) {
        benefits.is_customizable = true;
      }

      // Build conditions
      if (formData.min_amount) {
        conditions.min_amount = Number(formData.min_amount);
      }
      if (formData.threshold_amount) {
        conditions.threshold_amount = Number(formData.threshold_amount);
      }
      if (formData.buy_quantity) {
        conditions.buy_quantity = Number(formData.buy_quantity);
      }
      if (formData.min_quantity) {
        conditions.min_quantity = Number(formData.min_quantity);
      }
      if (formData.min_orders_count) {
        conditions.min_orders_count = Number(formData.min_orders_count);
      }
      if (formData.target_customer_type !== "all") {
        conditions.customer_type = formData.target_customer_type;
      }

      // Insert offer
      const { data: offer, error: offerError } = await supabase
        .from("offers")
        .insert([
          {
            name: formData.name,
            description: formData.description,
            offer_type: offerType,
            application_type: config.application_type,
            is_active: formData.is_active,
            priority: Number(formData.priority),
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            usage_limit: formData.usage_limit
              ? Number(formData.usage_limit)
              : null,
            promo_code: formData.promo_code || null,
            valid_days: formData.valid_days.length > 0 ? formData.valid_days : null,
            valid_hours_start: formData.valid_hours_start || null,
            valid_hours_end: formData.valid_hours_end || null,
            target_customer_type: formData.target_customer_type,
            image_url: formData.image_url || null,
            conditions,
            benefits,
          },
        ])
        .select()
        .single();

      if (offerError) throw offerError;

      // Insert offer_items for item-based offers
      const hasItemBasedOffer = [
        'item_buy_get_free',
        'cart_threshold_item',
        'item_free_addon',
        'item_percentage'
      ].includes(offerType);

      if (hasItemBasedOffer && selectedItems.length > 0) {
        const offerItems = selectedItems.map(item => ({
          offer_id: offer.id,
          item_type: item.item_type || null,
          menu_item_id: item.type === 'item' ? item.id : null,
          menu_category_id: item.type === 'category' ? item.id : null,
          quantity: item.quantity || null,
        }));

        const { error: itemsError } = await supabase
          .from("offer_items")
          .insert(offerItems);

        if (itemsError) throw itemsError;
      }

      // Insert combo_meals for combo offers
      if (offerType === 'combo_meal' && selectedItems.length > 0) {
        const { data: comboMeal, error: comboError } = await supabase
          .from("combo_meals")
          .insert({
            offer_id: offer.id,
            name: formData.name,
            description: formData.description,
            combo_price: Number(formData.combo_price),
            is_customizable: formData.is_customizable,
          })
          .select()
          .single();

        if (comboError) throw comboError;

        const comboItems = selectedItems.map(item => ({
          combo_meal_id: comboMeal.id,
          menu_item_id: item.type === 'item' ? item.id : null,
          menu_category_id: item.type === 'category' ? item.id : null,
          quantity: item.quantity || 1,
          is_required: item.is_required ?? true,
          is_selectable: item.is_selectable ?? false,
        }));

        const { error: comboItemsError } = await supabase
          .from("combo_meal_items")
          .insert(comboItems);

        if (comboItemsError) throw comboItemsError;
      }

      router.push("/admin/offers");
    } catch (err: any) {
      console.error("Error creating offer:", err);
      setError(err.message || "Failed to create offer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      valid_days: prev.valid_days.includes(day)
        ? prev.valid_days.filter((d) => d !== day)
        : [...prev.valid_days, day],
    }));
  };

  return (
    <RoleGuard requiredRoute="/admin/offers">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/offers/create")}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="mb-4"
          >
            Back to Offer Types
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
            <p className="text-gray-600 mt-2">{config.description}</p>

            {/* Application Type Badge */}
            <div className="mt-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  config.application_type === "order_level"
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {config.application_type === "order_level"
                  ? "✓ Applied at Checkout (Free items added immediately)"
                  : "✓ Applied at Billing (Discount calculated on final bill)"}
              </span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <div className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                {config.application_type === "order_level"
                  ? "Order-Level Offer"
                  : "Session-Level Offer"}
              </h4>
              <p className="text-sm text-blue-700">
                {config.application_type === "order_level"
                  ? "This offer will be applied when the guest places an order. Free items (if any) will be added to the order immediately. Once applied, it locks for the entire table session."
                  : "This offer will be locked when first applied during checkout, but the discount will only be calculated at final billing across all orders in the session. Perfect for percentage or flat discounts on total bills."}
              </p>
            </div>
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <div className="p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Basic Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Weekend Special 10% Off"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the offer in detail for customers to see..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offer Image (Optional)
                  </label>
                  <ImageUpload
                    currentImage={formData.image_url}
                    onImageChange={(url) =>
                      setFormData((prev) => ({ ...prev, image_url: url || "" }))
                    }
                    folder="offer-images"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Offer Configuration */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Offer Configuration
              </h3>

              <div className="space-y-4">
                {/* Promo Code Field (for promo_code offer type) */}
                {offerType === "promo_code" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Promo Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.promo_code}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          promo_code: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="e.g., WELCOME15"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Unique code customers will enter to redeem this offer
                    </p>
                  </div>
                )}

                {/* Discount Percentage */}
                {config.benefitsSchema?.discount_percentage && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Percentage (%) *
                      </label>
                      <input
                        type="number"
                        required={config.benefitsSchema.discount_percentage.required}
                        min={config.benefitsSchema.discount_percentage.min}
                        max={config.benefitsSchema.discount_percentage.max}
                        value={formData.discount_percentage}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            discount_percentage: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 10"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Percentage discount to apply (1-100%)
                      </p>
                    </div>

                    {/* Max Discount Cap (for percentage offers) */}
                    {config.benefitsSchema?.max_discount_amount && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Maximum Discount Cap (₹) - Optional
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.max_discount_amount}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              max_discount_amount: e.target.value,
                            }))
                          }
                          className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 120"
                        />
                        <p className="text-xs text-blue-700 mt-1">
                          <strong>Example:</strong> 10% off with max cap ₹120 means a ₹2000 bill gets ₹120 off (not ₹200)
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Discount Amount (Flat) */}
                {config.benefitsSchema?.discount_amount && !config.benefitsSchema?.discount_percentage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required={config.benefitsSchema.discount_amount.required}
                      min={config.benefitsSchema.discount_amount.min}
                      value={formData.discount_amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          discount_amount: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Fixed rupee amount to discount from the bill
                    </p>
                  </div>
                )}

                {/* Minimum Amount */}
                {config.conditionsSchema?.min_amount !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Order Amount (₹) {config.conditionsSchema.min_amount.required && "*"}
                    </label>
                    <input
                      type="number"
                      required={config.conditionsSchema.min_amount.required}
                      min={config.conditionsSchema.min_amount.min}
                      value={formData.min_amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_amount: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={config.conditionsSchema.min_amount.required ? "e.g., 300" : "e.g., 500 (optional)"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {config.conditionsSchema.min_amount.required
                        ? "Minimum bill amount required to apply this offer"
                        : "Leave empty for no minimum requirement"}
                    </p>
                  </div>
                )}

                {/* Buy Quantity (for BOGO offers) */}
                {config.conditionsSchema?.buy_quantity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buy Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.buy_quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          buy_quantity: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of items customer must buy
                    </p>
                  </div>
                )}

                {/* Get Quantity (for BOGO offers) */}
                {config.benefitsSchema?.get_quantity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Get Free Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.get_quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          get_quantity: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of items customer gets free
                    </p>
                  </div>
                )}

                {/* Get Same Item (for BOGO) */}
                {config.benefitsSchema?.get_same_item !== undefined && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="get_same_item"
                      checked={formData.get_same_item}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          get_same_item: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="get_same_item" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Customer gets the same item free (e.g., Buy 2 Pizzas, Get 1 Pizza Free)
                    </label>
                  </div>
                )}

                {/* Threshold Amount (for cart_threshold_item) */}
                {config.conditionsSchema?.threshold_amount !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Threshold Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.threshold_amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          threshold_amount: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cart value needed to unlock free item
                    </p>
                  </div>
                )}

                {/* Free Category (for cart_threshold_item) */}
                {config.benefitsSchema?.free_category !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Free Item Category (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.free_category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          free_category: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Desserts, Beverages"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Restrict free item to specific category (leave empty for any item)
                    </p>
                  </div>
                )}

                {/* Max Price (for free item offers) */}
                {config.benefitsSchema?.max_price !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Free Item Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.max_price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          max_price: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 150"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum price of item customer can choose for free (leave empty for no limit)
                    </p>
                  </div>
                )}

                {/* Min Quantity (for item_free_addon and item_percentage) */}
                {config.conditionsSchema?.min_quantity !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Item Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.min_quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_quantity: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum quantity of the item required to apply offer
                    </p>
                  </div>
                )}

                {/* Combo Price (for combo_meal) */}
                {config.benefitsSchema?.combo_price !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Combo Price (₹) *
                    </label>
                    <input
                      type="number"
                      required={config.benefitsSchema.combo_price.required}
                      min="0"
                      value={formData.combo_price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          combo_price: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 250"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Fixed price for the complete combo meal
                    </p>
                  </div>
                )}

                {/* Is Customizable (for combo_meal) */}
                {config.benefitsSchema?.is_customizable !== undefined && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="is_customizable"
                      checked={formData.is_customizable}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_customizable: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_customizable" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Allow customers to customize combo items (swap items, add/remove)
                    </label>
                  </div>
                )}

                {/* Min Orders Count (for customer_based) */}
                {config.conditionsSchema?.min_orders_count !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Previous Orders
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.min_orders_count}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_orders_count: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of previous orders required (for loyalty customers)
                    </p>
                  </div>
                )}

                {/* Customer Segment (for customer_based offers) */}
                {offerType === "customer_based" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Target Customer Segment *
                    </label>
                    <select
                      required
                      value={formData.target_customer_type}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          target_customer_type: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Customers</option>
                      <option value="new">First-time Customers (New)</option>
                      <option value="returning">Returning Customers</option>
                      <option value="loyalty">Loyalty Members (5+ orders)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Which customer type can use this offer
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Menu Item/Category Selection */}
          {(offerType === 'item_buy_get_free' ||
            offerType === 'cart_threshold_item' ||
            offerType === 'item_free_addon' ||
            offerType === 'item_percentage' ||
            offerType === 'combo_meal') && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {offerType === 'combo_meal' ? 'Combo Items Selection' : 'Applicable Menu Items'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {offerType === 'item_buy_get_free' && 'Select items that customers must buy to get the offer (Buy items)'}
                  {offerType === 'cart_threshold_item' && 'Select items or categories that customers can choose as free items'}
                  {offerType === 'item_free_addon' && 'Select the main items that qualify for free add-on'}
                  {offerType === 'item_percentage' && 'Select items or categories this discount applies to'}
                  {offerType === 'combo_meal' && 'Select all items included in this combo meal'}
                </p>

                {/* Item Selection Interface */}
                <div className="space-y-4">
                  {/* Add Item/Category Buttons */}
                  <div className="flex gap-2">
                    <select
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        const [type, id] = e.target.value.split(':');
                        if (!id) return;

                        let name = '';
                        if (type === 'item') {
                          const item = menuItems.find(i => i.id === id);
                          name = item?.name || '';
                        } else {
                          const category = menuCategories.find(c => c.id === id);
                          name = category?.name || '';
                        }

                        setSelectedItems(prev => {
                          // Check if already added
                          if (prev.some(item => item.id === id)) return prev;

                          const newItem: any = {
                            type: type as 'item' | 'category',
                            id,
                            name,
                            quantity: 1,
                          };

                          // For BOGO offers, mark first item as 'buy'
                          if (offerType === 'item_buy_get_free') {
                            newItem.item_type = prev.length === 0 ? 'buy' : 'get';
                          }

                          // For combo meals, mark as required by default
                          if (offerType === 'combo_meal') {
                            newItem.is_required = true;
                            newItem.is_selectable = false;
                          }

                          return [...prev, newItem];
                        });

                        e.target.value = '';
                      }}
                    >
                      <option value="">-- Select Menu Item or Category --</option>
                      <optgroup label="Categories">
                        {menuCategories.map(cat => (
                          <option key={cat.id} value={`category:${cat.id}`}>
                            📁 {cat.name} (Category)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Menu Items">
                        {menuItems.map(item => (
                          <option key={item.id} value={`item:${item.id}`}>
                            {item.is_veg ? '🟢' : '🔴'} {item.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Selected Items List */}
                  {selectedItems.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg divide-y">
                      {selectedItems.map((item, index) => (
                        <div key={item.id} className="p-4 flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {item.type === 'category' ? '📁' : '🍽️'} {item.name}
                              </span>
                              {item.item_type && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  item.item_type === 'buy'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {item.item_type === 'buy' ? 'Customer Buys' : 'Customer Gets Free'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {item.type === 'category' ? 'All items in category' : 'Specific menu item'}
                            </div>
                          </div>

                          {/* Quantity for combo meals */}
                          {offerType === 'combo_meal' && (
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-700">Qty:</label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || 1}
                                onChange={(e) => {
                                  const newItems = [...selectedItems];
                                  newItems[index].quantity = Number(e.target.value);
                                  setSelectedItems(newItems);
                                }}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                              />
                            </div>
                          )}

                          {/* Required/Selectable for combo meals */}
                          {offerType === 'combo_meal' && (
                            <div className="flex flex-col gap-1">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={item.is_required ?? true}
                                  onChange={(e) => {
                                    const newItems = [...selectedItems];
                                    newItems[index].is_required = e.target.checked;
                                    setSelectedItems(newItems);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-gray-700">Required</span>
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={item.is_selectable ?? false}
                                  onChange={(e) => {
                                    const newItems = [...selectedItems];
                                    newItems[index].is_selectable = e.target.checked;
                                    setSelectedItems(newItems);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-gray-700">Customer can swap</span>
                              </label>
                            </div>
                          )}

                          {/* Change item type for BOGO */}
                          {offerType === 'item_buy_get_free' && (
                            <select
                              value={item.item_type || 'buy'}
                              onChange={(e) => {
                                const newItems = [...selectedItems];
                                newItems[index].item_type = e.target.value as 'buy' | 'get';
                                setSelectedItems(newItems);
                              }}
                              className="border border-gray-300 rounded px-3 py-1 text-sm"
                            >
                              <option value="buy">Buy</option>
                              <option value="get">Get Free</option>
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItems(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="text-red-600 hover:text-red-700 p-2"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <p className="text-gray-500">
                        No items selected. Add items or categories from the dropdown above.
                      </p>
                    </div>
                  )}

                  {/* Helper Text */}
                  {offerType === 'item_buy_get_free' && selectedItems.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Tip:</strong> Mark items customers must "Buy" vs items they "Get Free".
                        The buy/get quantities are set above in Offer Configuration.
                      </p>
                    </div>
                  )}

                  {offerType === 'combo_meal' && selectedItems.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Required:</strong> Item must be included in combo<br />
                        <strong>Customer can swap:</strong> Customer can choose alternative items from category
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Advanced Settings */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Advanced Settings
              </h3>

              <div className="space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Valid Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid Days (Leave empty for all days)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          formData.valid_days.includes(day.value)
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "bg-white border-gray-300 text-gray-700 hover:border-blue-300"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Valid From (Time)
                    </label>
                    <input
                      type="time"
                      value={formData.valid_hours_start}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          valid_hours_start: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Valid Until (Time)
                    </label>
                    <input
                      type="time"
                      value={formData.valid_hours_end}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          valid_hours_end: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Customer Targeting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Target Customer Type
                  </label>
                  <select
                    value={formData.target_customer_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        target_customer_type: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Customers</option>
                    <option value="first_time">First-time Customers</option>
                    <option value="returning">Returning Customers</option>
                    <option value="loyalty">Loyalty Members (5+ orders)</option>
                  </select>
                </div>

                {/* Usage Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usage_limit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        usage_limit: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty for unlimited"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum number of times this offer can be used across all
                    customers
                  </p>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher priority offers appear first (10 = highest)
                  </p>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Activate this offer immediately
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin/offers")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Create Offer
            </Button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
