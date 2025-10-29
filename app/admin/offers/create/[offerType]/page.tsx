"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import RoleGuard from "@/components/admin/RoleGuard";
import Button from "@/components/admin/Button";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

// Import refactored components
import OfferFormFields from "@/components/admin/offers/OfferFormFields";
import ItemSelection from "@/components/admin/offers/ItemSelection";
import FreeAddonSelection from "@/components/admin/offers/FreeAddonSelection";
import OfferTypeFields from "@/components/admin/offers/OfferTypeFields";

// Import library functions
import { loadOfferData } from "@/lib/offers/loadOfferData";
import { submitOffer } from "@/lib/offers/submitOffer";
import { validateOfferForm } from "@/lib/offers/validateOffer";

// Offer type configurations
const offerTypeConfigs: Record<string, any> = {
  // DISCOUNT OFFERS (Session-Level)
  cart_percentage: {
    name: "Cart % Discount",
    description: "Apply percentage discount on total cart value at billing",
    application_type: "session_level",
    icon: "Percent",
  },
  cart_flat_amount: {
    name: "Cart Flat Discount",
    description: "Fixed amount discount on total cart at billing",
    application_type: "session_level",
    icon: "Tag",
  },

  // FREE ITEM OFFERS (Order-Level)
  item_buy_get_free: {
    name: "Buy X Get Y Free",
    description: "Buy certain items and get others free at checkout",
    application_type: "order_level",
    icon: "ShoppingBag",
  },
  cart_threshold_item: {
    name: "Free Item on Threshold",
    description: "Get a free item when cart value exceeds amount",
    application_type: "order_level",
    icon: "Gift",
  },
  item_free_addon: {
    name: "Free Add-on Item",
    description: "Get free add-on with specific items",
    application_type: "order_level",
    icon: "Plus",
  },
  item_percentage: {
    name: "Item % Discount",
    description: "Percentage discount on specific items",
    application_type: "order_level",
    icon: "Percent",
  },

  // COMBO OFFERS (Order-Level)
  combo_meal: {
    name: "Combo Meal",
    description: "Fixed price combo with multiple items",
    application_type: "order_level",
    icon: "Package",
  },

  // OTHER OFFERS
  first_order_discount: {
    name: "First Order Discount",
    description: "Special discount for first-time customers",
    application_type: "session_level",
    icon: "UserPlus",
  },
  repeat_customer_discount: {
    name: "Loyalty Reward",
    description: "Reward for repeat customers",
    application_type: "session_level",
    icon: "Heart",
  },
  promo_code: {
    name: "Promo Code",
    description: "Redeemable with unique promotional code",
    application_type: "session_level",
    icon: "Tag",
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
  const searchParams = useSearchParams();
  const offerType = params?.offerType as string;

  // Check if we're in edit mode
  const isEditMode = searchParams.get("edit") === "true";
  const editOfferId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedFreeAddonItems, setSelectedFreeAddonItems] = useState<any[]>(
    []
  );

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
    max_discount_amount: "",
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

  // Redirect if invalid offer type
  useEffect(() => {
    if (!config) {
      router.push("/admin/offers/create");
    }
  }, [config, router]);

  // Fetch menu data
  useEffect(() => {
    fetchMenuData();
  }, []);

  // Load offer data in edit mode
  useEffect(() => {
    if (isEditMode && editOfferId && menuItems.length > 0) {
      loadExistingOffer(editOfferId);
    }
  }, [isEditMode, editOfferId, menuItems.length]);

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

  const loadExistingOffer = async (offerId: string) => {
    try {
      setLoading(true);
      const data = await loadOfferData(offerId, menuItems, menuCategories);
      setFormData(data.formData);
      setSelectedItems(data.selectedItems);
      setSelectedFreeAddonItems(data.selectedFreeAddonItems);
    } catch (error: any) {
      console.error("Error loading offer:", error);
      setError(error.message || "Failed to load offer data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      const validationError = validateOfferForm(
        offerType,
        formData,
        selectedItems,
        selectedFreeAddonItems
      );

      if (validationError) {
        throw new Error(validationError);
      }

      // Submit offer
      await submitOffer(
        offerType,
        formData,
        selectedItems,
        selectedFreeAddonItems,
        isEditMode,
        editOfferId || undefined
      );

      // Redirect to offers list
      router.push("/admin/offers");
    } catch (err: any) {
      console.error("Error saving offer:", err);
      setError(err.message || "Failed to save offer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return null;
  }

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

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Error Saving Offer
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Form Fields */}
          <OfferFormFields
            formData={formData}
            setFormData={setFormData}
            offerType={offerType}
            daysOfWeek={daysOfWeek}
          />

          {/* Offer Type Specific Fields */}
          <OfferTypeFields
            offerType={offerType}
            formData={formData}
            setFormData={setFormData}
          />

          {/* Item Selection */}
          <ItemSelection
            offerType={offerType}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            menuItems={menuItems}
            menuCategories={menuCategories}
          />

          {/* Free Addon Selection */}
          <FreeAddonSelection
            offerType={offerType}
            selectedFreeAddonItems={selectedFreeAddonItems}
            setSelectedFreeAddonItems={setSelectedFreeAddonItems}
            menuItems={menuItems}
            menuCategories={menuCategories}
          />

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin/offers")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              leftIcon={<Save className="w-4 h-4" />}
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : isEditMode
                ? "Update Offer"
                : "Create Offer"}
            </Button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
