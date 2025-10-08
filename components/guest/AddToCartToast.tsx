"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ShoppingCart, X } from "lucide-react";

interface AddToCartToastProps {
  show: boolean;
  itemName: string;
  quantity: number;
  tableCode: string;
  onClose: () => void;
}

export function AddToCartToast({
  show,
  itemName,
  quantity,
  tableCode,
  onClose,
}: AddToCartToastProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  const handleViewCart = () => {
    router.push(`/t/${tableCode}/cart`);
    onClose();
  };

  if (!show && !isVisible) return null;

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 mx-auto max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">Added to cart</p>
              <p className="text-sm text-gray-600 truncate">
                {quantity}x {itemName}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleViewCart}
          >
            View Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
