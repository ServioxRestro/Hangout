// Reusable KOT Card Component for displaying KOT information

import { KOT } from "@/types/kot.types";
import {
  getKOTAge,
  getStatusColor,
  getStatusBadgeClass,
} from "@/lib/utils/kot";
import Card from "@/components/admin/Card";

interface KOTCardProps {
  kot: KOT;
  showActions?: boolean;
  actions?: React.ReactNode;
  onClick?: () => void;
  filterType?: "veg" | "non-veg" | "all"; // Filter which items to show
}

export function KOTCard({
  kot,
  showActions = false,
  actions,
  onClick,
  filterType = "all",
}: KOTCardProps) {
  const age = getKOTAge(kot.created_at);
  const colorClass = getStatusColor(kot.kot_status, age);

  // Filter items based on filterType
  const displayItems =
    filterType === "all"
      ? kot.items
      : kot.items.filter((item) =>
          filterType === "veg" ? item.is_veg : !item.is_veg
        );

  const vegItems = displayItems.filter((item) => item.is_veg);
  const nonVegItems = displayItems.filter((item) => !item.is_veg);
  const totalItems = displayItems.reduce((sum, item) => sum + item.quantity, 0);

  // Format time
  const time = new Date(kot.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card
      className={`border-2 ${colorClass} ${
        onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""
      }`}
      onClick={onClick}
    >
      <div className="p-3 sm:p-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-blue-600 leading-none">
                #{kot.kot_number}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                {time}
              </span>
            </div>

            {age > 15 && (
              <span className="relative flex h-2 w-2 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-red-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <div
              className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full border font-semibold ${getStatusBadgeClass(
                kot.kot_status
              )}`}
            >
              {kot.kot_status.toUpperCase()}
            </div>
            {kot.order_type === "dine-in" ? (
              <span className="text-xs sm:text-sm font-bold text-gray-700">
                Table {kot.table_number}
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                TAKEAWAY
              </span>
            )}
          </div>
        </div>

        {/* Items List - Compact */}
        <div className="space-y-2 mb-3">
          {/* Veg Items */}
          {vegItems.length > 0 && (
            <div>
              {filterType === "all" && (
                <div className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-600"></span>
                  VEG
                </div>
              )}
              <div className="space-y-1.5">
                {vegItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-600"></span>
                    <span className="flex-1 font-medium text-gray-900 text-sm sm:text-base">
                      {item.menu_item_name}
                    </span>
                    <span className="flex-shrink-0 min-w-[2rem] text-center font-bold text-green-700 text-base sm:text-lg">
                      {item.quantity}
                    </span>
                    {item.status !== kot.kot_status && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-Veg Items */}
          {nonVegItems.length > 0 && (
            <div>
              {filterType === "all" && (
                <div className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  NON-VEG
                </div>
              )}
              <div className="space-y-1.5">
                {nonVegItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-600"></span>
                    <span className="flex-1 font-medium text-gray-900 text-sm sm:text-base">
                      {item.menu_item_name}
                    </span>
                    <span className="flex-shrink-0 min-w-[2rem] text-center font-bold text-red-700 text-base sm:text-lg">
                      {item.quantity}
                    </span>
                    {item.status !== kot.kot_status && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs text-gray-600">
          <span className="font-medium">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </span>
          <span>{age} min ago</span>
        </div>

        {/* Actions */}
        {showActions && actions && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
}
