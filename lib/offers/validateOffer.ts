export function validateOfferForm(
  offerType: string,
  formData: any,
  selectedItems: any[],
  selectedFreeAddonItems: any[]
): string | null {
  // Validate item selection for offers that require it
  const needsItemSelection = [
    "item_buy_get_free",
    "cart_threshold_item",
    "item_free_addon",
    "item_percentage",
    "combo_meal",
  ].includes(offerType);

  if (needsItemSelection && selectedItems.length === 0) {
    return "Please select at least one menu item or category for this offer type";
  }

  // Validate item_free_addon has both qualifying items and free addon items
  if (offerType === "item_free_addon") {
    if (selectedItems.length === 0) {
      return "Please select qualifying items (main items that customer must purchase)";
    }
    if (selectedFreeAddonItems.length === 0) {
      return "Please select free add-on items (items that customer can choose for free)";
    }
  }

  // Validate BOGO has both buy and get items
  if (offerType === "item_buy_get_free") {
    const hasBuyItem = selectedItems.some((item) => item.item_type === "buy");
    const hasGetItem = selectedItems.some((item) => item.item_type === "get");
    if (!hasBuyItem || !hasGetItem) {
      return 'BOGO offers must have at least one "Buy" item and one "Get Free" item';
    }
  }

  // Validate promo code offers
  if (offerType === "promo_code") {
    if (!formData.discount_percentage && !formData.discount_amount) {
      return "Promo code offers must have either a discount percentage or flat discount amount";
    }
  }

  // Validate min_order_discount
  if (offerType === "min_order_discount") {
    if (!formData.discount_percentage && !formData.discount_amount) {
      return "This offer type must have either a discount percentage or flat discount amount";
    }
  }

  // Validate cart_threshold_item
  if (offerType === "cart_threshold_item") {
    if (!formData.threshold_amount) {
      return "Please specify the cart threshold amount";
    }
  }

  // Validate combo_meal
  if (offerType === "combo_meal") {
    if (!formData.combo_price) {
      return "Please specify the combo price";
    }
  }

  // Validate repeat customer
  if (offerType === "repeat_customer_discount") {
    if (!formData.min_orders_count) {
      return "Please specify minimum orders count";
    }
  }

  return null; // No errors
}
