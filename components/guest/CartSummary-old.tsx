"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/constants";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

interface CartSummaryProps {
  cart: CartItem[];
  onCheckout: () => void;
  onViewCart?: () => void;
  className?: string;
}

const icons = {
  cart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v8a2 2 0 002 2h6a2 2 0 002-2v-8" />
    </svg>
  ),
  arrow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
};

export function CartSummary({
  cart,
  onCheckout,
  onViewCart,
  className = "",
}: CartSummaryProps) {
  if (cart.length === 0) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg 
        border-t border-border-light shadow-xl z-40 safe-area-bottom
        md:hidden ${className}
      `}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Cart Info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              {icons.cart}
              <Badge 
                variant="primary" 
                size="xs" 
                className="absolute -top-2 -right-2 min-w-[18px] h-[18px] text-xs"
              >
                {totalItems}
              </Badge>
            </div>
            
            <div className="flex flex-col min-w-0">
              <div className="text-lg font-bold text-brand-primary">
                {formatCurrency(totalAmount)}
              </div>
              <div className="text-xs text-text-secondary truncate">
                {totalItems} item{totalItems !== 1 ? "s" : ""} in cart
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onViewCart && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewCart}
                className="px-3"
              >
                View Cart
              </Button>
            )}
            
            <Button
              variant="primary"
              size="sm"
              onClick={onCheckout}
              rightIcon={icons.arrow}
              className="shadow-lg px-4"
            >
              Place Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
              🛒 {cart.length} unique item{cart.length !== 1 ? "s" : ""}{" "}
              selected
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            {onViewCart && (
              <Button
                variant="secondary"
                size="lg"
                onClick={onViewCart}
                className="font-bold shadow-lg"
              >
                View Cart
              </Button>
            )}
            <Button
              variant="success"
              size="lg"
              onClick={onCheckout}
              className="font-bold shadow-lg"
            >
              Place Order →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
