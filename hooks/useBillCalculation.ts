import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  calculateBill as calculateBillUtil,
  type BillItem,
  type BillCalculation,
} from "@/lib/utils/billing";

interface TaxSetting {
  id: string;
  name: string;
  rate: number;
  is_active: boolean | null;
  display_order?: number | null;
  applies_to?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface UseBillCalculationProps {
  items: BillItem[];
  discountPercentage?: number;
  offerDiscount?: number;
  offerName?: string | null;
}

interface UseBillCalculationReturn {
  calculation: BillCalculation;
  taxSettings: TaxSetting[];
  taxInclusive: boolean;
  loading: boolean;
  effectiveDiscountPercentage: number;
  offerInfo: { name: string; discount: number } | null;
}

/**
 * Centralized hook for bill calculations
 * Handles tax settings, tax mode (inclusive/exclusive), and discount calculations
 */
export function useBillCalculation({
  items,
  discountPercentage = 0,
  offerDiscount,
  offerName,
}: UseBillCalculationProps): UseBillCalculationReturn {
  const [taxSettings, setTaxSettings] = useState<TaxSetting[]>([]);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch tax settings
      const { data: taxData, error: taxError } = await supabase
        .from("tax_settings")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (taxError) throw taxError;
      setTaxSettings(taxData || []);

      // Fetch tax mode
      const { data: taxModeData, error: taxModeError } = await supabase
        .from("restaurant_settings")
        .select("setting_value")
        .eq("setting_key", "tax_inclusive")
        .single();

      if (taxModeError && taxModeError.code !== "PGRST116") {
        console.error("Error fetching tax mode:", taxModeError);
      } else {
        setTaxInclusive(taxModeData?.setting_value === "true");
      }
    } catch (error) {
      console.error("Error fetching billing settings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate effective discount percentage
  const effectiveDiscountPercentage = useMemo(() => {
    if (offerDiscount) {
      const itemsTotal = items.reduce((sum, item) => sum + item.total_price, 0);
      return itemsTotal > 0 ? (offerDiscount / itemsTotal) * 100 : 0;
    }
    return discountPercentage;
  }, [offerDiscount, discountPercentage, items]);

  // Offer info for display
  const offerInfo = useMemo(() => {
    if (offerDiscount && offerName) {
      return { name: offerName, discount: offerDiscount };
    }
    return null;
  }, [offerDiscount, offerName]);

  // Calculate bill using utility function
  const calculation = useMemo(() => {
    if (items.length === 0 || taxSettings.length === 0) {
      return {
        items_with_taxes: [],
        subtotal: 0,
        taxable_subtotal: 0,
        total_gst: 0,
        subtotal_with_tax: 0,
        discount_amount: 0,
        final_amount: 0,
      };
    }

    return calculateBillUtil(
      items,
      effectiveDiscountPercentage,
      taxSettings.map((tax) => ({ name: tax.name, rate: tax.rate })),
      taxInclusive
    );
  }, [items, effectiveDiscountPercentage, taxSettings, taxInclusive]);

  return {
    calculation,
    taxSettings,
    taxInclusive,
    loading,
    effectiveDiscountPercentage,
    offerInfo,
  };
}
