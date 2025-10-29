"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface OfferTypeFieldsProps {
  offerType: string;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function OfferTypeFields({
  offerType,
  formData,
  setFormData,
}: OfferTypeFieldsProps) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <>
      {/* Cart Percentage Discount Fields */}
      {offerType === "cart_percentage" && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cart Percentage Discount Configuration
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage (%) *
                  </label>
                  <Input
                    type="number"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    placeholder="10"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentage off on entire cart (1-100%)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Discount Amount (₹)
                  </label>
                  <Input
                    type="number"
                    name="max_discount_amount"
                    value={formData.max_discount_amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cap maximum discount (e.g., ₹500 max)
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Cart Value (₹)
                </label>
                <Input
                  type="number"
                  name="min_amount"
                  value={formData.min_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum cart value required to avail this offer
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Cart Flat Amount Discount Fields */}
      {offerType === "cart_flat_amount" && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cart Flat Discount Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flat Discount Amount (₹) *
                </label>
                <Input
                  type="number"
                  name="discount_amount"
                  value={formData.discount_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="100"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fixed amount off on entire cart (e.g., ₹100 off)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Cart Value (₹)
                </label>
                <Input
                  type="number"
                  name="min_amount"
                  value={formData.min_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum cart value required to avail this offer
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* BOGO Specific Fields */}
      {offerType === "item_buy_get_free" && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Buy X Get Y Configuration
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buy Quantity
                  </label>
                  <Input
                    type="number"
                    name="buy_quantity"
                    value={formData.buy_quantity}
                    onChange={handleChange}
                    min="1"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Get Quantity
                  </label>
                  <Input
                    type="number"
                    name="get_quantity"
                    value={formData.get_quantity}
                    onChange={handleChange}
                    min="1"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="get_same_item"
                  checked={formData.get_same_item}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">
                  Get same item (e.g., Buy 1 Burger Get 1 Burger Free)
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Cart Threshold Fields */}
      {offerType === "cart_threshold_item" && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cart Threshold
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order Amount (₹) *
              </label>
              <Input
                type="number"
                name="threshold_amount"
                value={formData.threshold_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Customer gets free item when order reaches this amount
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Promo Code & Item Percentage Discount Fields */}
      {(offerType === "promo_code" || offerType === "item_percentage") && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {offerType === "promo_code"
                ? "Promo Code Configuration"
                : "Item Discount Configuration"}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage (%)
                  </label>
                  <Input
                    type="number"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OR Flat Discount (₹)
                  </label>
                  <Input
                    type="number"
                    name="discount_amount"
                    value={formData.discount_amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Discount Amount (₹)
                </label>
                <Input
                  type="number"
                  name="max_discount_amount"
                  value={formData.max_discount_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cap the maximum discount (useful for percentage-based
                  discounts)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Cart Value (₹)
                </label>
                <Input
                  type="number"
                  name="min_amount"
                  value={formData.min_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Minimum cart value to avail this offer
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Combo Meal Fields */}
      {offerType === "combo_meal" && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Combo Meal Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Combo Price (₹) *
                </label>
                <Input
                  type="number"
                  name="combo_price"
                  value={formData.combo_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="299"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_customizable"
                  checked={formData.is_customizable}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">
                  Allow customer customization (swap items within categories)
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* First Order Discount Fields */}
      {offerType === "first_order_discount" && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              First Order Discount
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage (%)
                  </label>
                  <Input
                    type="number"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OR Flat Discount (₹)
                  </label>
                  <Input
                    type="number"
                    name="discount_amount"
                    value={formData.discount_amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Discount Amount (₹)
                </label>
                <Input
                  type="number"
                  name="max_discount_amount"
                  value={formData.max_discount_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="200"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Repeat Customer Fields */}
      {offerType === "repeat_customer_discount" && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Repeat Customer Reward
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Orders Count *
                </label>
                <Input
                  type="number"
                  name="min_orders_count"
                  value={formData.min_orders_count}
                  onChange={handleChange}
                  min="2"
                  placeholder="5"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Customer must have completed this many orders
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage (%)
                  </label>
                  <Input
                    type="number"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OR Flat Discount (₹)
                  </label>
                  <Input
                    type="number"
                    name="discount_amount"
                    value={formData.discount_amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
