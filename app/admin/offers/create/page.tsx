"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/admin/RoleGuard";
import {
  ArrowLeft,
  Percent,
  Tag,
  Gift,
  ShoppingBag,
  Clock,
  Users,
  Package,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import Button from "@/components/admin/Button";
import Card from "@/components/admin/Card";

// Offer type categories
const offerCategories = [
  {
    id: "discount",
    name: "Discount Offers",
    description: "Percentage or flat amount discounts on bills",
    icon: Percent,
    color: "blue",
    types: [
      {
        id: "cart_percentage",
        name: "Cart % Discount",
        description: "Apply percentage discount on total cart value",
        icon: Percent,
        applicationTypes: ["session_level"],
        example: "Get 10% off (max ₹120) on total bill",
      },
      {
        id: "cart_flat_amount",
        name: "Cart Flat Discount",
        description: "Fixed amount discount on cart",
        icon: Tag,
        applicationTypes: ["session_level"],
        example: "Get ₹100 off on orders above ₹500",
      },
      {
        id: "min_order_discount",
        name: "Minimum Order Discount",
        description: "Discount when minimum threshold is reached",
        icon: Package,
        applicationTypes: ["session_level"],
        example: "Spend ₹300, get ₹50 off",
      },
    ],
  },
  {
    id: "free_items",
    name: "Free Item Offers",
    description: "Buy items and get free items",
    icon: Gift,
    color: "green",
    types: [
      {
        id: "item_buy_get_free",
        name: "Buy X Get Y Free",
        description: "Buy certain quantity, get items free",
        icon: ShoppingBag,
        applicationTypes: ["order_level"],
        example: "Buy 2 Pizzas, Get 1 Pizza Free",
      },
      {
        id: "cart_threshold_item",
        name: "Free Item on Threshold",
        description: "Free item when cart value exceeds amount",
        icon: Gift,
        applicationTypes: ["order_level"],
        example: "Free Dessert on orders above ₹400",
      },
      {
        id: "item_free_addon",
        name: "Free Add-on Item",
        description: "Free side item with specific purchase",
        icon: Package,
        applicationTypes: ["order_level"],
        example: "Free beverage with any burger",
      },
    ],
  },
  {
    id: "combo",
    name: "Combo & Bundle Offers",
    description: "Special priced combos and bundles",
    icon: Package,
    color: "purple",
    types: [
      {
        id: "combo_meal",
        name: "Combo Meal Deal",
        description: "Fixed price for bundled items",
        icon: ShoppingBag,
        applicationTypes: ["order_level"],
        example: "Burger + Fries + Coke = ₹250",
      },
      {
        id: "item_percentage",
        name: "Item % Discount",
        description: "Percentage discount on specific items",
        icon: Percent,
        applicationTypes: ["order_level"],
        example: "20% off on all pizzas",
      },
    ],
  },
  {
    id: "special",
    name: "Special Offers",
    description: "Time, customer, and code-based offers",
    icon: Sparkles,
    color: "orange",
    types: [
      {
        id: "time_based",
        name: "Time Slot Offer",
        description: "Discounts during specific hours/days",
        icon: Clock,
        applicationTypes: ["session_level"],
        example: "20% off between 2 PM - 5 PM",
      },
      {
        id: "customer_based",
        name: "Customer Segment Offer",
        description: "Offers for specific customer types",
        icon: Users,
        applicationTypes: ["session_level"],
        example: "30% off for first-time customers",
      },
      {
        id: "promo_code",
        name: "Promo/Coupon Code",
        description: "Redeemable with unique code",
        icon: Tag,
        applicationTypes: ["session_level"],
        example: "Use code WELCOME15 for 15% off",
      },
    ],
  },
];

export default function CreateOfferPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedOfferType, setSelectedOfferType] = useState<string | null>(
    null
  );

  const handleOfferTypeSelect = (offerTypeId: string) => {
    router.push(`/admin/offers/create/${offerTypeId}`);
  };

  const selectedCategoryData = offerCategories.find(
    (cat) => cat.id === selectedCategory
  );

  return (
    <RoleGuard requiredRoute="/admin/offers">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/offers")}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="mb-4"
          >
            Back to Offers
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create New Offer
              </h1>
              <p className="text-gray-600 mt-2">
                {!selectedCategory
                  ? "Choose an offer category to get started"
                  : !selectedOfferType
                  ? "Select the type of offer you want to create"
                  : "Configure your offer details"}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  selectedCategory
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {selectedCategory ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  "1"
                )}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Choose Category
              </span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  selectedOfferType
                    ? "bg-blue-600 text-white"
                    : selectedCategory
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                2
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  selectedCategory ? "text-gray-700" : "text-gray-400"
                }`}
              >
                Select Offer Type
              </span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  selectedOfferType
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                3
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  selectedOfferType ? "text-gray-700" : "text-gray-400"
                }`}
              >
                Configure Details
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: Category Selection */}
        {!selectedCategory && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {offerCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 ${
                    selectedCategory === category.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-${category.color}-100 flex items-center justify-center mb-4`}
                  >
                    <Icon className={`w-6 h-6 text-${category.color}-600`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {category.description}
                  </p>
                  <div className="text-xs text-gray-500">
                    {category.types.length} offer types
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Step 2: Offer Type Selection */}
        {selectedCategory && !selectedOfferType && (
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedCategory(null)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="mb-6"
            >
              Change Category
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedCategoryData?.types.map((offerType) => {
                const Icon = offerType.icon;
                return (
                  <Card
                    key={offerType.id}
                    className="p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 border-gray-200 hover:border-blue-300"
                    onClick={() => handleOfferTypeSelect(offerType.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {offerType.applicationTypes.map((type) => (
                          <span
                            key={type}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              type === "order_level"
                                ? "bg-green-100 text-green-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {type === "order_level" ? "At Checkout" : "At Billing"}
                          </span>
                        ))}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {offerType.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {offerType.description}
                    </p>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Example:</p>
                      <p className="text-sm font-medium text-gray-700">
                        {offerType.example}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
