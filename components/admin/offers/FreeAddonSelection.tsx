"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Info, X } from "lucide-react";

interface FreeAddonSelectionProps {
  offerType: string;
  selectedFreeAddonItems: Array<{
    type: "item" | "category";
    id: string;
    name: string;
    price?: number;
  }>;
  setSelectedFreeAddonItems: React.Dispatch<React.SetStateAction<any[]>>;
  menuItems: any[];
  menuCategories: any[];
}

export default function FreeAddonSelection({
  offerType,
  selectedFreeAddonItems,
  setSelectedFreeAddonItems,
  menuItems,
  menuCategories,
}: FreeAddonSelectionProps) {
  // Only show for item_free_addon offers
  if (offerType !== "item_free_addon") return null;

  const handleAddItem = (value: string) => {
    const [type, id] = value.split(":");
    if (!id) return;

    let name = "";
    let price = 0;

    if (type === "item") {
      const item = menuItems.find((i) => i.id === id);
      name = item?.name || "";
      price = Number(item?.price || 0);
    } else {
      const category = menuCategories.find((c) => c.id === id);
      name = category?.name || "";
    }

    setSelectedFreeAddonItems((prev) => {
      // Check if already added
      if (prev.some((item) => item.id === id)) return prev;

      return [
        ...prev,
        {
          type: type as "item" | "category",
          id,
          name,
          price,
        },
      ];
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedFreeAddonItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Free Add-on Items Selection
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Select which items customers can choose as free add-ons (e.g.,
          beverages, sides, desserts)
        </p>

        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex gap-2">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">How Free Add-on Offers Work:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Main Items (above):</strong> Items customer must
                  purchase (e.g., burgers)
                </li>
                <li>
                  <strong>Free Add-ons (below):</strong> Items customer can
                  choose for free (e.g., drinks)
                </li>
                <li>
                  Customer selects from the free add-on list when ordering
                  qualifying items
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Free Add-on Item Selection Interface */}
        <div className="space-y-4">
          {/* Add Free Add-on Item/Category Dropdown */}
          <div className="flex gap-2">
            <select
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => {
                handleAddItem(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">
                -- Select Free Add-on Item or Category --
              </option>
              <optgroup label="Categories">
                {menuCategories.map((cat) => (
                  <option key={cat.id} value={`category:${cat.id}`}>
                    📁 {cat.name} (All items)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Menu Items">
                {menuItems.map((item) => (
                  <option key={item.id} value={`item:${item.id}`}>
                    {item.is_veg ? "🟢" : "🔴"} {item.name} - ₹{item.price}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Selected Free Add-on Items List */}
          {selectedFreeAddonItems.length > 0 ? (
            <div className="border border-gray-200 rounded-lg divide-y">
              {selectedFreeAddonItems.map((item, index) => (
                <div key={item.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {item.type === "category" ? "📁" : "🍽️"} {item.name}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                        Free Add-on
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {item.type === "category"
                        ? "All items in this category can be chosen as free add-on"
                        : `Customer can choose this item for free (worth ₹${item.price})`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
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
                No free add-on items selected. Add items or categories from the
                dropdown above.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                These are the items customers can choose for free when they
                order qualifying items.
              </p>
            </div>
          )}

          {/* Example Helper */}
          {selectedFreeAddonItems.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>Example:</strong> Customer buys qualifying item (e.g.,
                burger) → Can choose{" "}
                {selectedFreeAddonItems.length === 1
                  ? selectedFreeAddonItems[0].name
                  : `any item from ${selectedFreeAddonItems.length} options`}{" "}
                for free
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
