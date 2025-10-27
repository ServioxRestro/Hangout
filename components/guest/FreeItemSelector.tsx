"use client";

import { useState } from "react";
import { X, Search, Gift, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface FreeItem {
  id: string;
  name: string;
  price: number;
  type: "item" | "category";
}

interface FreeItemSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  availableItems: FreeItem[];
  maxPrice?: number;
  offerName: string;
  onSelect: (item: FreeItem) => void;
}

export function FreeItemSelector({
  isOpen,
  onClose,
  availableItems,
  maxPrice,
  offerName,
  onSelect,
}: FreeItemSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FreeItem | null>(null);

  if (!isOpen) return null;

  // Filter items by search
  const filteredItems = availableItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item: FreeItem) => {
    setSelectedItem(item);
  };

  const handleConfirm = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      setSelectedItem(null);
      setSearchQuery("");
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedItem(null);
    setSearchQuery("");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full sm:rounded-2xl">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl z-10">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-green-100 rounded-xl">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  Choose Your Free Item
                </h2>
                <p className="text-sm text-gray-600 truncate">{offerName}</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Max Price Info */}
          {maxPrice && maxPrice > 0 && (
            <div className="px-6 py-3 bg-green-50 border-b border-green-100">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-800 font-medium">
                  Choose any item up to {formatCurrency(maxPrice)} for free
                </span>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200 sticky top-[73px] sm:top-[89px] bg-white z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {filteredItems.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600">
                  {searchQuery ? "No items found" : "No items available"}
                </p>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-2">
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const exceedsMaxPrice = !!(
                    maxPrice &&
                    maxPrice > 0 &&
                    item.price > maxPrice
                  );

                  return (
                    <button
                      key={item.id}
                      onClick={() => !exceedsMaxPrice && handleSelect(item)}
                      disabled={exceedsMaxPrice}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-green-500 bg-green-50"
                          : exceedsMaxPrice
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                          : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {item.name}
                            </h3>
                            {isSelected && (
                              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm ${
                                exceedsMaxPrice
                                  ? "text-gray-500 line-through"
                                  : isSelected
                                  ? "text-green-700 font-semibold line-through"
                                  : "text-gray-600 line-through"
                              }`}
                            >
                              {formatCurrency(item.price)}
                            </span>
                            {!exceedsMaxPrice && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                FREE
                              </span>
                            )}
                            {exceedsMaxPrice && maxPrice && (
                              <span className="text-xs text-red-600">
                                Exceeds {formatCurrency(maxPrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Radio Button Visual */}
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            isSelected
                              ? "border-green-500 bg-green-500"
                              : exceedsMaxPrice
                              ? "border-gray-300 bg-gray-100"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0 rounded-b-3xl sm:rounded-b-2xl">
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirm}
                disabled={!selectedItem}
                className="flex-1"
              >
                {selectedItem ? "Add Free Item" : "Select an Item"}
              </Button>
            </div>
            {selectedItem && (
              <p className="text-center text-sm text-green-700 mt-3 font-medium">
                {selectedItem.name} ({formatCurrency(selectedItem.price)}) •
                FREE 🎁
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @media (min-width: 640px) {
          @keyframes slide-up {
            from {
              transform: translate(-50%, -50%) scale(0.95);
              opacity: 0;
            }
            to {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
