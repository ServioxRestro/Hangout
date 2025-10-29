import { supabase } from "@/lib/supabase/client";

export async function loadOfferData(
  offerId: string,
  menuItems: any[],
  menuCategories: any[]
) {
  // Fetch offer with offer_items and combo_meals
  const { data: offer, error } = await supabase
    .from("offers")
    .select(
      `
      *,
      offer_items (
        id,
        menu_item_id,
        menu_category_id,
        item_type,
        quantity
      ),
      combo_meals (
        id,
        name,
        description,
        combo_price,
        is_customizable,
        combo_meal_items (
          id,
          menu_item_id,
          menu_category_id,
          quantity,
          is_required,
          is_selectable
        )
      )
    `
    )
    .eq("id", offerId)
    .single();

  if (error) throw error;
  if (!offer) throw new Error("Offer not found");

  // Set form data
  const conditions = (offer.conditions as any) || {};
  const benefits = (offer.benefits as any) || {};

  const formData = {
    name: offer.name || "",
    description: offer.description || "",
    image_url: offer.image_url || "",
    is_active: offer.is_active,
    priority: offer.priority || 5,
    start_date: offer.start_date || "",
    end_date: offer.end_date || "",
    usage_limit: offer.usage_limit?.toString() || "",
    promo_code: offer.promo_code || "",
    valid_days: offer.valid_days || [],
    valid_hours_start: offer.valid_hours_start || "",
    valid_hours_end: offer.valid_hours_end || "",
    target_customer_type: offer.target_customer_type || "all",
    // Benefits
    discount_percentage: benefits.discount_percentage?.toString() || "",
    discount_amount: benefits.discount_amount?.toString() || "",
    max_discount_amount: benefits.max_discount_amount?.toString() || "",
    max_price: benefits.max_price?.toString() || "",
    buy_quantity: benefits.buy_quantity?.toString() || "",
    get_quantity: benefits.get_quantity?.toString() || "",
    get_same_item: benefits.get_same_item || false,
    free_category: benefits.free_category || "",
    combo_price: benefits.combo_price?.toString() || "",
    is_customizable: benefits.is_customizable || false,
    // Conditions
    min_amount: conditions.min_amount?.toString() || "",
    threshold_amount: conditions.threshold_amount?.toString() || "",
    min_quantity: conditions.min_quantity?.toString() || "",
    min_orders_count:
      offer.min_orders_count?.toString() ||
      conditions.min_orders_count?.toString() ||
      "",
  };

  // Load offer_items into selectedItems and selectedFreeAddonItems
  const qualifyingItems: any[] = [];
  const freeAddonItems: any[] = [];

  if (offer.offer_items && offer.offer_items.length > 0) {
    for (const item of offer.offer_items) {
      let itemData = null;

      if (item.menu_item_id) {
        const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
        itemData = {
          type: "item" as const,
          id: item.menu_item_id,
          name: menuItem?.name || "Unknown Item",
          price: menuItem?.price || 0,
          item_type: item.item_type || undefined,
          quantity: item.quantity || undefined,
        };
      } else if (item.menu_category_id) {
        const category = menuCategories.find(
          (c) => c.id === item.menu_category_id
        );
        itemData = {
          type: "category" as const,
          id: item.menu_category_id,
          name: category?.name || "Unknown Category",
          item_type: item.item_type || undefined,
          quantity: item.quantity || undefined,
        };
      }

      if (itemData) {
        // Separate free addon items from qualifying items
        if (item.item_type === "free_addon") {
          freeAddonItems.push(itemData);
        } else {
          qualifyingItems.push(itemData);
        }
      }
    }
  }

  // Load combo_meal_items into selectedItems (for combo offers)
  const comboItems: any[] = [];
  if (offer.combo_meals && offer.combo_meals.length > 0) {
    const combo = offer.combo_meals[0]; // Assuming one combo per offer
    if (combo.combo_meal_items && combo.combo_meal_items.length > 0) {
      for (const item of combo.combo_meal_items) {
        if (item.menu_item_id) {
          const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
          comboItems.push({
            type: "item" as const,
            id: item.menu_item_id,
            name: menuItem?.name || "Unknown Item",
            quantity: item.quantity || 1,
            is_required: item.is_required ?? true,
            is_selectable: item.is_selectable ?? false,
          });
        } else if (item.menu_category_id) {
          const category = menuCategories.find(
            (c) => c.id === item.menu_category_id
          );
          comboItems.push({
            type: "category" as const,
            id: item.menu_category_id,
            name: category?.name || "Unknown Category",
            quantity: item.quantity || 1,
            is_required: item.is_required ?? true,
            is_selectable: item.is_selectable ?? false,
          });
        }
      }
    }
  }

  return {
    formData,
    selectedItems: comboItems.length > 0 ? comboItems : qualifyingItems,
    selectedFreeAddonItems: freeAddonItems,
  };
}
