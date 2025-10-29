"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface ItemSelectionProps {
  offerType: string;
  selectedItems: Array<{
    type: "item" | "category";
    id: string;
    name: string;
    item_type?: "buy" | "get" | "get_free";
    quantity?: number;
    is_required?: boolean;
    is_selectable?: boolean;
  }>;
  setSelectedItems: React.Dispatch<React.SetStateAction<any[]>>;
  menuItems: any[];
  menuCategories: any[];
}

export default function ItemSelection({
  offerType,
  selectedItems,
  setSelectedItems,
  menuItems,
  menuCategories,
}: ItemSelectionProps) {
  // Only show for specific offer types
  const shouldShow = [
    "item_buy_get_free",
    "cart_threshold_item",
    "item_free_addon",
    "item_percentage",
    "combo_meal",
  ].includes(offerType);

  if (!shouldShow) return null;

  const getTitle = () => {
    if (offerType === "combo_meal") return "Combo Items Selection";
    return "Applicable Menu Items";
  };

  const getDescription = () => {
    switch (offerType) {
      case "item_buy_get_free":
        return "Select items that customers must buy to get the offer (Buy items)";
      case "cart_threshold_item":
        return "Select items or categories that customers can choose as free items";
      case "item_free_addon":
        return "Select the main items that qualify for free add-on";
      case "item_percentage":
        return "Select items or categories this discount applies to";
      case "combo_meal":
        return "Select all items included in this combo meal";
      default:
        return "";
    }
  };

  const handleAddItem = (value: string) => {
    const [type, id] = value.split(":");
    if (!id) return;

    let name = "";
    if (type === "item") {
      const item = menuItems.find((i) => i.id === id);
      name = item?.name || "";
    } else {
      const category = menuCategories.find((c) => c.id === id);
      name = category?.name || "";
    }

    setSelectedItems((prev) => {
      // Check if already added
      if (prev.some((item) => item.id === id)) return prev;

      const newItem: any = {
        type: type as "item" | "category",
        id,
        name,
        quantity: 1,
      };

      // Set item_type based on offer type
      if (offerType === "item_buy_get_free") {
        // For BOGO offers, mark first item as 'buy', rest as 'get'
        newItem.item_type = prev.length === 0 ? "buy" : "get";
      } else if (offerType === "cart_threshold_item") {
        // Free item given when cart threshold is met
        newItem.item_type = "get_free";
      } else if (offerType === "item_free_addon") {
        // Default to 'buy' (qualifying items)
        // Free addon items are added separately via selectedFreeAddonItems
        newItem.item_type = "buy";
      }

      // For combo meals, mark as required by default
      if (offerType === "combo_meal") {
        newItem.is_required = true;
        newItem.is_selectable = false;
      }

      return [...prev, newItem];
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemTypeChange = (index: number, newType: "buy" | "get") => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index].item_type = newType;
      return updated;
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = quantity;
      return updated;
    });
  };

  const handleRequiredChange = (index: number, isRequired: boolean) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index].is_required = isRequired;
      return updated;
    });
  };

  const handleSelectableChange = (index: number, isSelectable: boolean) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index].is_selectable = isSelectable;
      return updated;
    });
  };

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {getTitle()}
        </h3>
        <p className="text-sm text-gray-600 mb-4">{getDescription()}</p>

        {/* Item Selection Interface */}
        <div className="space-y-4">
          {/* Add Item/Category Dropdown */}
          <div className="flex gap-2">
            <select
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => {
                handleAddItem(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">-- Select Menu Item or Category --</option>
              <optgroup label="Categories">
                {menuCategories.map((cat) => (
                  <option key={cat.id} value={`category:${cat.id}`}>
                    📁 {cat.name} (Category)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Menu Items">
                {menuItems.map((item) => (
                  <option key={item.id} value={`item:${item.id}`}>
                    {item.is_veg ? "🟢" : "🔴"} {item.name}
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
                        {item.type === "category" ? "📁" : "🍽️"} {item.name}
                      </span>
                      {item.item_type && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            item.item_type === "buy"
                              ? "bg-blue-100 text-blue-800"
                              : item.item_type === "get_free"
                              ? "bg-green-100 text-green-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {item.item_type === "buy"
                            ? "Customer Buys"
                            : "Customer Gets Free"}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {item.type === "category"
                        ? "All items in category"
                        : "Specific menu item"}
                    </div>
                  </div>

                  {/* Quantity for combo meals */}
                  {offerType === "combo_meal" && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700">Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) =>
                          handleQuantityChange(index, Number(e.target.value))
                        }
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                      />
                    </div>
                  )}

                  {/* Required/Selectable for combo meals */}
                  {offerType === "combo_meal" && (
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.is_required ?? true}
                          onChange={(e) =>
                            handleRequiredChange(index, e.target.checked)
                          }
                          className="rounded"
                        />
                        Required
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.is_selectable ?? false}
                          onChange={(e) =>
                            handleSelectableChange(index, e.target.checked)
                          }
                          className="rounded"
                        />
                        Customer can swap
                      </label>
                    </div>
                  )}

                  {/* BOGO item type toggle */}
                  {offerType === "item_buy_get_free" && (
                    <select
                      value={item.item_type || "buy"}
                      onChange={(e) =>
                        handleItemTypeChange(
                          index,
                          e.target.value as "buy" | "get"
                        )
                      }
                      className="border border-gray-300 rounded px-3 py-1 text-sm"
                    >
                      <option value="buy">Buy</option>
                      <option value="get">Get Free</option>
                    </select>
                  )}

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
                No items selected. Add items or categories from the dropdown
                above.
              </p>
            </div>
          )}

          {/* Helper text for combo meals */}
          {offerType === "combo_meal" && selectedItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Required:</strong> Item must be included in combo
                <br />
                <strong>Customer can swap:</strong> Customer can choose
                alternative items from category
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
