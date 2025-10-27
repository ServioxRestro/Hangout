import { formatCurrency } from "@/lib/constants";
import type { BillCalculation } from "@/lib/utils/billing";

interface BillSummaryProps {
  calculation: BillCalculation;
  offerInfo?: { name: string; discount: number } | null;
  discountPercentage?: number;
  onDiscountChange?: (percentage: number) => void;
  showDiscountInput?: boolean;
  className?: string;
}

/**
 * Reusable Bill Summary Component
 * Displays billing breakdown matching reference bill format:
 * - Subtotal (Base Price)
 * - Total GST
 * - Total Before Discount
 * - Discount (if applicable)
 * - Grand Total
 */
export function BillSummary({
  calculation,
  offerInfo,
  discountPercentage = 0,
  onDiscountChange,
  showDiscountInput = false,
  className = "",
}: BillSummaryProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Subtotal (Base Price) */}
      <div className="flex justify-between text-gray-700">
        <span>Subtotal (Base Price):</span>
        <span className="font-medium">
          {formatCurrency(calculation.subtotal)}
        </span>
      </div>

      {/* Total GST */}
      <div className="flex justify-between text-sm text-gray-600">
        <span>Total GST:</span>
        <span>{formatCurrency(calculation.total_gst)}</span>
      </div>

      {/* Total Before Discount */}
      <div className="flex justify-between text-gray-700 border-t pt-2">
        <span>Total Before Discount:</span>
        <span className="font-medium">
          {formatCurrency(calculation.subtotal_with_tax)}
        </span>
      </div>

      {/* Discount Section */}
      {offerInfo ? (
        // Offer Applied (Read-only)
        <div className="flex justify-between items-center bg-green-50 p-2 rounded">
          <span className="text-gray-700">
            Discount{" "}
            <span className="text-xs text-green-600 font-medium">
              ({offerInfo.name})
            </span>
            :
          </span>
          <span className="text-sm font-medium text-green-600">
            -{formatCurrency(calculation.discount_amount)}
          </span>
        </div>
      ) : showDiscountInput && onDiscountChange ? (
        // Manual Discount Input
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Discount:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercentage}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 border rounded text-center text-sm focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm">%</span>
            <span className="text-sm font-medium text-red-600">
              -{formatCurrency(calculation.discount_amount)}
            </span>
          </div>
        </div>
      ) : calculation.discount_amount > 0 ? (
        // Discount Applied (Read-only, no input)
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Discount:</span>
          <span className="text-sm font-medium text-red-600">
            -{formatCurrency(calculation.discount_amount)}
          </span>
        </div>
      ) : null}

      {/* Grand Total */}
      <div className="border-t pt-3 flex justify-between font-bold text-lg">
        <span>Grand Total:</span>
        <span className="text-green-600">
          {formatCurrency(calculation.final_amount)}
        </span>
      </div>
    </div>
  );
}
