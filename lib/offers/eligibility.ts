/**
 * Offer Eligibility Checker
 * Determines if offers are applicable, calculates discounts, and manages free items
 */

import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Offer = Tables<"offers">;
type OfferItem = Tables<"offer_items">;

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category_id?: string;
  isFree?: boolean;
  linkedOfferId?: string;
  originalPrice?: number;
  discountPercentage?: number;
}

export interface OfferEligibility {
  isEligible: boolean;
  reason?: string;
  discount: number;
  freeItems?: CartItem[];
  requiresUserAction?: boolean; // For item_free_addon
  actionType?: "select_free_item";
  availableFreeItems?: Array<{ id: string; name: string; price: number; type: "item" | "category" }>;
}

/**
 * Check if an offer is eligible based on current cart and conditions
 */
export async function checkOfferEligibility(
  offer: Offer,
  cartItems: CartItem[],
  cartTotal: number,
  customerPhone?: string,
  offerItems?: OfferItem[]
): Promise<OfferEligibility> {
  const benefits = offer.benefits as any;
  const conditions = offer.conditions as any;

  // 1. Check date validity
  const now = new Date();
  if (offer.start_date && new Date(offer.start_date) > now) {
    return {
      isEligible: false,
      reason: "Offer not started yet",
      discount: 0,
    };
  }
  if (offer.end_date && new Date(offer.end_date) < now) {
    return {
      isEligible: false,
      reason: "Offer has expired",
      discount: 0,
    };
  }

  // 2. Check time validity
  if (offer.valid_hours_start && offer.valid_hours_end) {
    const currentTime = now.toTimeString().slice(0, 5);
    if (
      currentTime < offer.valid_hours_start ||
      currentTime > offer.valid_hours_end
    ) {
      const formatTime = (time: string) => {
        const [h, m] = time.split(":");
        const hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${m} ${ampm}`;
      };
      return {
        isEligible: false,
        reason: `Available ${formatTime(offer.valid_hours_start)} - ${formatTime(offer.valid_hours_end)}`,
        discount: 0,
      };
    }
  }

  // 3. Check day validity
  if (offer.valid_days && offer.valid_days.length > 0) {
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    if (!offer.valid_days.includes(currentDay)) {
      const validDaysStr = offer.valid_days
        .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
        .join(", ");
      return {
        isEligible: false,
        reason: `Valid only on ${validDaysStr}`,
        discount: 0,
      };
    }
  }

  // 4. Check minimum amount
  if (conditions?.min_amount && cartTotal < conditions.min_amount) {
    const amountNeeded = conditions.min_amount - cartTotal;
    return {
      isEligible: false,
      reason: `Add ₹${amountNeeded} more to unlock`,
      discount: 0,
    };
  }

  // 5. Check customer type (if phone available)
  if (offer.target_customer_type !== "all" && customerPhone) {
    const { data: guestUser } = await supabase
      .from("guest_users")
      .select("visit_count")
      .eq("phone", customerPhone)
      .maybeSingle();

    const visitCount = guestUser?.visit_count || 0;

    if (offer.target_customer_type === "first_time" && visitCount > 0) {
      return {
        isEligible: false,
        reason: "Only for first-time customers",
        discount: 0,
      };
    }
    if (offer.target_customer_type === "returning" && visitCount === 0) {
      return {
        isEligible: false,
        reason: "Only for returning customers",
        discount: 0,
      };
    }
    if (offer.target_customer_type === "loyalty") {
      const minOrders = conditions?.min_orders_count || 5;
      if (visitCount < minOrders) {
        return {
          isEligible: false,
          reason: `Requires ${minOrders}+ previous orders`,
          discount: 0,
        };
      }
    }
  } else if (offer.target_customer_type !== "all" && !customerPhone) {
    return {
      isEligible: false,
      reason: "Sign in to check eligibility",
      discount: 0,
    };
  }

  // 6. Check usage limit
  if (offer.usage_limit && offer.usage_count) {
    if (offer.usage_count >= offer.usage_limit) {
      return {
        isEligible: false,
        reason: "Usage limit reached",
        discount: 0,
      };
    }
  }

  // 7. Type-specific validation and calculation
  switch (offer.offer_type) {
    case "cart_percentage":
      return checkCartPercentage(offer, cartTotal, benefits);

    case "cart_flat_amount":
      return checkCartFlatAmount(offer, cartTotal, benefits);

    case "min_order_discount":
      return checkMinOrderDiscount(offer, cartTotal, benefits, conditions);

    case "cart_threshold_item":
      return checkCartThresholdItem(offer, cartTotal, benefits, conditions);

    case "item_buy_get_free":
      return await checkItemBuyGetFree(offer, cartItems, benefits, conditions, offerItems);

    case "item_free_addon":
      return await checkItemFreeAddon(offer, cartItems, benefits, conditions, offerItems);

    case "item_percentage":
      return await checkItemPercentage(offer, cartItems, benefits, offerItems);

    case "time_based":
      return checkTimeBased(offer, cartTotal, benefits);

    case "customer_based":
      return checkCustomerBased(offer, cartTotal, benefits);

    case "combo_meal":
      return await checkComboMeal(offer, cartItems, benefits);

    case "promo_code":
      return checkPromoCode(offer, cartTotal, benefits);

    default:
      return {
        isEligible: false,
        reason: "Unknown offer type",
        discount: 0,
      };
  }
}

// ============================================================================
// TYPE-SPECIFIC CHECKERS
// ============================================================================

function checkCartPercentage(
  offer: Offer,
  cartTotal: number,
  benefits: any
): OfferEligibility {
  const percentage = benefits.discount_percentage || 0;
  let discount = (cartTotal * percentage) / 100;

  if (benefits.max_discount_amount) {
    discount = Math.min(discount, benefits.max_discount_amount);
  }

  return {
    isEligible: true,
    discount: Math.round(discount),
  };
}

function checkCartFlatAmount(
  offer: Offer,
  cartTotal: number,
  benefits: any
): OfferEligibility {
  const discount = benefits.discount_amount || 0;

  return {
    isEligible: true,
    discount: Math.round(discount),
  };
}

function checkMinOrderDiscount(
  offer: Offer,
  cartTotal: number,
  benefits: any,
  conditions: any
): OfferEligibility {
  const threshold = conditions?.threshold_amount || 0;
  const discount = benefits.discount_amount || 0;

  if (cartTotal < threshold) {
    const amountNeeded = threshold - cartTotal;
    return {
      isEligible: false,
      reason: `Spend ₹${threshold} to unlock (₹${amountNeeded} more needed)`,
      discount: 0,
    };
  }

  return {
    isEligible: true,
    discount: Math.round(discount),
  };
}

async function checkCartThresholdItem(
  offer: Offer,
  cartTotal: number,
  benefits: any,
  conditions: any
): Promise<OfferEligibility> {
  const threshold = conditions?.threshold_amount || 0;

  if (cartTotal < threshold) {
    const amountNeeded = threshold - cartTotal;
    return {
      isEligible: false,
      reason: `Spend ₹${threshold} to unlock (₹${amountNeeded} more)`,
      discount: 0,
    };
  }

  // Fetch the free item details
  const freeItemId = benefits.free_item_id;
  if (!freeItemId) {
    return {
      isEligible: false,
      reason: "Free item not configured",
      discount: 0,
    };
  }

  const { data: menuItem } = await supabase
    .from("menu_items")
    .select("id, name, price, is_veg, category_id")
    .eq("id", freeItemId)
    .single();

  if (!menuItem) {
    return {
      isEligible: false,
      reason: "Free item not available",
      discount: 0,
    };
  }

  const freeItems: CartItem[] = [
    {
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      category_id: menuItem.category_id || undefined,
      isFree: true,
      linkedOfferId: offer.id,
    },
  ];

  return {
    isEligible: true,
    discount: menuItem.price, // Value of free item
    freeItems,
  };
}

async function checkItemBuyGetFree(
  offer: Offer,
  cartItems: CartItem[],
  benefits: any,
  conditions: any,
  offerItems?: OfferItem[]
): Promise<OfferEligibility> {
  if (!offerItems || offerItems.length === 0) {
    return {
      isEligible: false,
      reason: "Qualifying items not configured",
      discount: 0,
    };
  }

  const buyQuantity = benefits?.buy_quantity || 2;
  const freeQuantity = benefits?.get_quantity || 1;

  // Separate buy items and get items
  const buyItems = offerItems.filter((oi) => oi.item_type === "buy");
  const getItems = offerItems.filter((oi) => oi.item_type === "get" || oi.item_type === "get_free");

  if (buyItems.length === 0) {
    return {
      isEligible: false,
      reason: "Buy items not configured",
      discount: 0,
    };
  }

  if (getItems.length === 0) {
    return {
      isEligible: false,
      reason: "Free items not configured",
      discount: 0,
    };
  }

  // Find qualifying BUY items in cart
  const buyItemIds = buyItems
    .filter((oi) => oi.menu_item_id)
    .map((oi) => oi.menu_item_id!);
  const buyCategoryIds = buyItems
    .filter((oi) => oi.menu_category_id)
    .map((oi) => oi.menu_category_id!);

  const matchingBuyItems = cartItems.filter(
    (item) =>
      buyItemIds.includes(item.id) ||
      (item.category_id && buyCategoryIds.includes(item.category_id))
  );

  const totalQualifyingQty = matchingBuyItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  if (totalQualifyingQty < buyQuantity) {
    const needed = buyQuantity - totalQualifyingQty;
    return {
      isEligible: false,
      reason: `Buy ${buyQuantity} to get ${freeQuantity} free (${needed} more needed)`,
      discount: 0,
    };
  }

  // Find the item to give free from GET items (not from buy items!)
  const getItemIds = getItems
    .filter((oi) => oi.menu_item_id)
    .map((oi) => oi.menu_item_id!);

  // If get_same_item is true, give the same item as bought
  if (benefits.get_same_item) {
    // Give the cheapest buy item as free
    const sortedBuyItems = [...matchingBuyItems].sort((a, b) => a.price - b.price);
    const cheapestItem = sortedBuyItems[0];

    if (!cheapestItem) {
      return {
        isEligible: false,
        reason: "No qualifying items found",
        discount: 0,
      };
    }

    const freeItems: CartItem[] = [
      {
        id: cheapestItem.id,
        name: cheapestItem.name,
        price: cheapestItem.price,
        quantity: freeQuantity,
        category_id: cheapestItem.category_id,
        isFree: true,
        linkedOfferId: offer.id,
      },
    ];

    return {
      isEligible: true,
      discount: cheapestItem.price * freeQuantity,
      freeItems,
    };
  }

  // Get the FREE item from the "get" items list
  // Fetch menu item details for the get items
  const { data: freeMenuItems } = await supabase
    .from("menu_items")
    .select("id, name, price, category_id")
    .in("id", getItemIds);

  if (!freeMenuItems || freeMenuItems.length === 0) {
    return {
      isEligible: false,
      reason: "Free item not found",
      discount: 0,
    };
  }

  // Give the first configured free item (or cheapest if multiple)
  const sortedFreeItems = [...freeMenuItems].sort((a, b) => 
    parseFloat(a.price as any) - parseFloat(b.price as any)
  );
  const freeMenuItem = sortedFreeItems[0];

  const freeItems: CartItem[] = [
    {
      id: freeMenuItem.id,
      name: freeMenuItem.name,
      price: parseFloat(freeMenuItem.price as any),
      quantity: freeQuantity,
      category_id: freeMenuItem.category_id || undefined,
      isFree: true,
      linkedOfferId: offer.id,
    },
  ];

  return {
    isEligible: true,
    discount: parseFloat(freeMenuItem.price as any) * freeQuantity,
    freeItems,
  };
}

async function checkItemFreeAddon(
  offer: Offer,
  cartItems: CartItem[],
  benefits: any,
  conditions: any,
  offerItems?: OfferItem[]
): Promise<OfferEligibility> {
  if (!offerItems || offerItems.length === 0) {
    return {
      isEligible: false,
      reason: "Qualifying items not configured",
      discount: 0,
    };
  }

  // Check if cart has qualifying items
  const qualifyingItemIds = offerItems
    .filter((oi) => oi.menu_item_id)
    .map((oi) => oi.menu_item_id!);
  const qualifyingCategoryIds = offerItems
    .filter((oi) => oi.menu_category_id)
    .map((oi) => oi.menu_category_id!);

  const hasQualifyingItem = cartItems.some(
    (item) =>
      qualifyingItemIds.includes(item.id) ||
      (item.category_id && qualifyingCategoryIds.includes(item.category_id))
  );

  if (!hasQualifyingItem) {
    // Get first qualifying item name for message
    const firstOfferItem = offerItems[0];
    let itemName = "qualifying item";
    if (firstOfferItem.menu_item_id) {
      const { data } = await supabase
        .from("menu_items")
        .select("name")
        .eq("id", firstOfferItem.menu_item_id)
        .single();
      itemName = data?.name || "qualifying item";
    } else if (firstOfferItem.menu_category_id) {
      const { data } = await supabase
        .from("menu_categories")
        .select("name")
        .eq("id", firstOfferItem.menu_category_id)
        .single();
      itemName = data?.name || "qualifying category";
    }

    return {
      isEligible: false,
      reason: `Add ${itemName} to unlock`,
      discount: 0,
    };
  }

  // Get available free items
  const freeAddonItems = benefits.free_addon_items || [];
  const maxPrice = benefits.max_price || 0;

  if (freeAddonItems.length === 0 && !maxPrice) {
    return {
      isEligible: false,
      reason: "Free add-on items not configured",
      discount: 0,
    };
  }

  // Fetch actual item/category details
  const availableFreeItems: Array<{
    id: string;
    name: string;
    price: number;
    type: "item" | "category";
  }> = [];

  for (const addonItem of freeAddonItems) {
    if (addonItem.type === "item") {
      const { data } = await supabase
        .from("menu_items")
        .select("id, name, price")
        .eq("id", addonItem.id)
        .single();
      if (data && (!maxPrice || data.price <= maxPrice)) {
        availableFreeItems.push({
          id: data.id,
          name: data.name,
          price: data.price,
          type: "item",
        });
      }
    } else if (addonItem.type === "category") {
      const { data: items } = await supabase
        .from("menu_items")
        .select("id, name, price")
        .eq("category_id", addonItem.id)
        .eq("is_available", true);

      if (items) {
        items.forEach((item) => {
          if (!maxPrice || item.price <= maxPrice) {
            availableFreeItems.push({
              id: item.id,
              name: item.name,
              price: item.price,
              type: "item",
            });
          }
        });
      }
    }
  }

  return {
    isEligible: true,
    discount: 0, // Will be set after user selects item
    requiresUserAction: true,
    actionType: "select_free_item",
    availableFreeItems,
  };
}

async function checkItemPercentage(
  offer: Offer,
  cartItems: CartItem[],
  benefits: any,
  offerItems?: OfferItem[]
): Promise<OfferEligibility> {
  if (!offerItems || offerItems.length === 0) {
    return {
      isEligible: false,
      reason: "Qualifying items not configured",
      discount: 0,
    };
  }

  const discountPercentage = benefits.discount_percentage || 0;

  // Find qualifying items in cart
  const qualifyingItemIds = offerItems
    .filter((oi) => oi.menu_item_id)
    .map((oi) => oi.menu_item_id!);
  const qualifyingCategoryIds = offerItems
    .filter((oi) => oi.menu_category_id)
    .map((oi) => oi.menu_category_id!);

  const matchingItems = cartItems.filter(
    (item) =>
      qualifyingItemIds.includes(item.id) ||
      (item.category_id && qualifyingCategoryIds.includes(item.category_id))
  );

  if (matchingItems.length === 0) {
    return {
      isEligible: false,
      reason: "Add qualifying items to unlock",
      discount: 0,
    };
  }

  const totalMatchingAmount = matchingItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discount = (totalMatchingAmount * discountPercentage) / 100;

  return {
    isEligible: true,
    discount: Math.round(discount),
  };
}

function checkTimeBased(
  offer: Offer,
  cartTotal: number,
  benefits: any
): OfferEligibility {
  // Time validation already done in main check
  // Calculate discount
  let discount = 0;
  if (benefits.discount_percentage) {
    discount = (cartTotal * benefits.discount_percentage) / 100;
    if (benefits.max_discount_amount) {
      discount = Math.min(discount, benefits.max_discount_amount);
    }
  } else if (benefits.discount_amount) {
    discount = benefits.discount_amount;
  }

  return {
    isEligible: true,
    discount: Math.round(discount),
  };
}

function checkCustomerBased(
  offer: Offer,
  cartTotal: number,
  benefits: any
): OfferEligibility {
  // Customer validation already done in main check
  // Calculate discount
  let discount = 0;
  if (benefits.discount_percentage) {
    discount = (cartTotal * benefits.discount_percentage) / 100;
    if (benefits.max_discount_amount) {
      discount = Math.min(discount, benefits.max_discount_amount);
    }
  } else if (benefits.discount_amount) {
    discount = benefits.discount_amount;
  }

  return {
    isEligible: true,
    discount: Math.round(discount),
  };
}

async function checkComboMeal(
  offer: Offer,
  cartItems: CartItem[],
  benefits: any
): Promise<OfferEligibility> {
  // Fetch combo meal by offer_id instead of combo_id from benefits
  const { data: comboMeals } = await supabase
    .from("combo_meals")
    .select(`
      id, 
      combo_price, 
      is_customizable,
      combo_meal_items(
        menu_item_id, 
        quantity, 
        is_required,
        menu_items(id, name, price)
      )
    `)
    .eq("offer_id", offer.id);

  if (!comboMeals || comboMeals.length === 0) {
    return {
      isEligible: false,
      reason: "Combo not configured",
      discount: 0,
    };
  }

  const comboMeal = comboMeals[0];
  if (!comboMeal.combo_meal_items || comboMeal.combo_meal_items.length === 0) {
    return {
      isEligible: false,
      reason: "Combo items not found",
      discount: 0,
    };
  }

  // Check only required items (ignore optional items for eligibility)
  const requiredItems = comboMeal.combo_meal_items.filter(
    (item: any) => item.is_required
  );
  const missingItems: string[] = [];

  for (const reqItem of requiredItems) {
    const cartItem = cartItems.find((ci) => ci.id === reqItem.menu_item_id);
    const requiredQty = reqItem.quantity || 1;
    if (!cartItem || cartItem.quantity < requiredQty) {
      missingItems.push(reqItem.menu_items?.name || "item");
    }
  }

  if (missingItems.length > 0) {
    return {
      isEligible: false,
      reason: `Add ${missingItems.join(", ")} to complete combo`,
      discount: 0,
    };
  }

  // Calculate regular price of required items
  const regularTotal = requiredItems.reduce((sum: number, reqItem: any) => {
    const itemQuantity = reqItem.quantity || 1;
    return sum + (parseFloat(reqItem.menu_items?.price || 0) * itemQuantity);
  }, 0);

  const comboPrice = parseFloat(comboMeal.combo_price as any) || 0;
  const discount = regularTotal - comboPrice;

  return {
    isEligible: true,
    discount: Math.max(0, Math.round(discount)),
  };
}

function checkPromoCode(
  offer: Offer,
  cartTotal: number,
  benefits: any
): OfferEligibility {
  // Promo code validation done when code is entered
  // Calculate discount
  let discount = 0;
  if (benefits.discount_percentage) {
    discount = (cartTotal * benefits.discount_percentage) / 100;
    if (benefits.max_discount_amount) {
      discount = Math.min(discount, benefits.max_discount_amount);
    }
  } else if (benefits.discount_amount) {
    discount = benefits.discount_amount;
  }

  return {
    isEligible: true,
    discount: Math.round(discount),
  };
}

/**
 * Validate promo code and return offer if valid
 */
export async function validatePromoCode(
  code: string,
  cartTotal: number,
  customerPhone?: string
): Promise<{ isValid: boolean; offer?: Offer; reason?: string }> {
  const trimmedCode = code.trim().toUpperCase();

  const { data: offer, error } = await supabase
    .from("offers")
    .select("*")
    .eq("offer_type", "promo_code")
    .eq("is_active", true)
    .ilike("promo_code", trimmedCode)
    .single();

  if (error || !offer) {
    return { isValid: false, reason: "Invalid promo code" };
  }

  // Check eligibility
  const eligibility = await checkOfferEligibility(
    offer,
    [],
    cartTotal,
    customerPhone
  );

  if (!eligibility.isEligible) {
    return { isValid: false, reason: eligibility.reason };
  }

  return { isValid: true, offer };
}
