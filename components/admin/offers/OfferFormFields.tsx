"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Info } from "lucide-react";

interface OfferFormFieldsProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  offerType: string;
  daysOfWeek: Array<{ value: string; label: string }>;
}

export default function OfferFormFields({
  formData,
  setFormData,
  offerType,
  daysOfWeek,
}: OfferFormFieldsProps) {
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleDay = (day: string) => {
    setFormData((prev: any) => ({
      ...prev,
      valid_days: prev.valid_days.includes(day)
        ? prev.valid_days.filter((d: string) => d !== day)
        : [...prev.valid_days, day],
    }));
  };

  return (
    <>
      {/* Basic Information */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offer Name *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Summer Special 50% Off"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe this offer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <Input
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <label className="text-sm text-gray-700">
                Active (offer is live and visible to customers)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority (1-10)
              </label>
              <Input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                min="1"
                max="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher priority offers are displayed first
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Validity Period */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Validity Period
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      formData.valid_days.includes(day.value)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid From (Time)
                </label>
                <Input
                  type="time"
                  name="valid_hours_start"
                  value={formData.valid_hours_start}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until (Time)
                </label>
                <Input
                  type="time"
                  name="valid_hours_end"
                  value={formData.valid_hours_end}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usage Limit (Optional)
              </label>
              <Input
                type="number"
                name="usage_limit"
                value={formData.usage_limit}
                onChange={handleChange}
                placeholder="Leave empty for unlimited"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Target Customers */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Target Customers
          </h3>
          <select
            name="target_customer_type"
            value={formData.target_customer_type}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Customers</option>
            <option value="new">New Customers Only</option>
            <option value="returning">Returning Customers Only</option>
          </select>
        </div>
      </Card>

      {/* Promo Code (if applicable) */}
      {offerType === "promo_code" && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Promotional Code
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promo Code *
              </label>
              <Input
                name="promo_code"
                value={formData.promo_code}
                onChange={handleChange}
                placeholder="e.g., SUMMER50"
                required
                className="uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">
                Customers will enter this code to redeem the offer
              </p>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
