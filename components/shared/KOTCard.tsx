// Reusable KOT Card Component for displaying KOT information

import { KOT } from "@/types/kot.types";
import { getKOTAge, getStatusColor, getStatusBadgeClass } from "@/lib/utils/kot";
import Card from "@/components/admin/Card";

interface KOTCardProps {
  kot: KOT;
  showActions?: boolean;
  actions?: React.ReactNode;
  onClick?: () => void;
}

export function KOTCard({ kot, showActions = false, actions, onClick }: KOTCardProps) {
  const age = getKOTAge(kot.created_at);
  const colorClass = getStatusColor(kot.kot_status, age);

  return (
    <Card
      className={`border-2 ${colorClass} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="p-4">
        {/* KOT Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-blue-600">
                KOT #{kot.kot_number}
              </h2>
              {age > 15 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {kot.order_type === "dine-in" ? (
                <>
                  <span className="text-sm font-medium text-gray-700">
                    Table {kot.table_veg_only ? `V${kot.table_number}` : kot.table_number}
                  </span>
                  {kot.table_veg_only && (
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      🟢 VEG-ONLY
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold">
                    TAKEAWAY
                  </span>
                  {kot.customer_name && (
                    <span className="text-sm font-medium text-gray-700">
                      {kot.customer_name}
                    </span>
                  )}
                  {kot.takeaway_qr_is_veg_only && (
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      🟢 VEG-ONLY
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {age} min ago
            </div>
          </div>
          <div
            className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusBadgeClass(
              kot.kot_status
            )}`}
          >
            {kot.kot_status.toUpperCase()}
          </div>
        </div>

        {/* Items - Separated by Veg/Non-Veg - ALWAYS show both sections */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Veg Items - Always Visible */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-green-300">
              <span className="text-sm font-bold text-green-800 uppercase">🟢 Vegetarian Items</span>
            </div>
            {kot.items.filter((item) => item.is_veg).length > 0 ? (
              <div className="space-y-2">
                {kot.items
                  .filter((item) => item.is_veg)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-2 bg-white rounded border border-green-200"
                    >
                      <span className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {item.quantity}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-900">
                            {item.menu_item_name}
                          </span>
                        </div>
                        {item.status !== kot.kot_status && (
                          <div className={`text-xs mt-0.5 px-1 inline-block rounded ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-2 text-sm text-gray-500">
                No veg items
              </div>
            )}
          </div>

          {/* Non-Veg Items - Always Visible */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-red-300">
              <span className="text-sm font-bold text-red-800 uppercase">🔴 Non-Vegetarian Items</span>
            </div>
            {kot.items.filter((item) => !item.is_veg).length > 0 ? (
              <div className="space-y-2">
                {kot.items
                  .filter((item) => !item.is_veg)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-2 bg-white rounded border border-red-200"
                    >
                      <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {item.quantity}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-900">
                            {item.menu_item_name}
                          </span>
                        </div>
                        {item.status !== kot.kot_status && (
                          <div className={`text-xs mt-0.5 px-1 inline-block rounded ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-2 text-sm text-gray-500">
                No non-veg items
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
}
