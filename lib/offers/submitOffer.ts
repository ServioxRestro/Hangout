import { supabase } from "@/lib/supabase/client";

interface OfferFormData {
  name: string;
  description: string;
  image_url: string;
  is_active: boolean;
  priority: number;
  start_date: string;
  end_date: string;
  usage_limit: string;
  promo_code: string;
  valid_days: string[];
  valid_hours_start: string;
  valid_hours_end: string;
  target_customer_type: string;
  discount_percentage: string;
  discount_amount: string;
  max_discount_amount: string;
  max_price: string;
  buy_quantity: string;
  get_quantity: string;
  get_same_item: boolean;
  free_category: string;
  combo_price: string;
  is_customizable: boolean;
  min_amount: string;
  threshold_amount: string;
  min_quantity: string;
  min_orders_count: string;
}

interface SelectedItem {
  type: "item" | "category";
  id: string;
  name: string;
  item_type?: "buy" | "get" | "get_free";
  quantity?: number;
  is_required?: boolean;
  is_selectable?: boolean;
}

export async function submitOffer(
  offerType: string,
  formData: OfferFormData,
  selectedItems: SelectedItem[],
  selectedFreeAddonItems: SelectedItem[],
  isEditMode: boolean,
  editOfferId?: string
) {
  // Build conditions and benefits
  const { conditions, benefits } = buildConditionsAndBenefits(
    offerType,
    formData
  );

  // Build offer object
  const offerData: any = {
    offer_type: offerType,
    name: formData.name,
    description: formData.description,
    image_url: formData.image_url,
    is_active: formData.is_active,
    priority: formData.priority || 5,
    start_date: formData.start_date || null,
    end_date: formData.end_date || null,
    usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
    promo_code: formData.promo_code || null,
    valid_days: formData.valid_days.length > 0 ? formData.valid_days : null,
    valid_hours_start: formData.valid_hours_start || null,
    valid_hours_end: formData.valid_hours_end || null,
    target_customer_type: formData.target_customer_type,
    conditions: Object.keys(conditions).length > 0 ? conditions : null,
    benefits: Object.keys(benefits).length > 0 ? benefits : null,
    min_orders_count: formData.min_orders_count
      ? Number(formData.min_orders_count)
      : null,
  };

  let offer: any;

  if (isEditMode && editOfferId) {
    // Update existing offer
    const { data, error } = await supabase
      .from("offers")
      .update(offerData)
      .eq("id", editOfferId)
      .select()
      .single();

    if (error) throw error;
    offer = data;
  } else {
    // Create new offer
    const { data, error } = await supabase
      .from("offers")
      .insert(offerData)
      .select()
      .single();

    if (error) throw error;
    offer = data;
  }

  // Handle offer_items
  await handleOfferItems(
    offerType,
    offer.id,
    selectedItems,
    selectedFreeAddonItems,
    isEditMode,
    editOfferId
  );

  // Handle combo_meals
  await handleComboMeals(
    offerType,
    offer.id,
    formData,
    selectedItems,
    isEditMode,
    editOfferId
  );

  return offer;
}

function buildConditionsAndBenefits(
  offerType: string,
  formData: OfferFormData
) {
  const conditions: any = {};
  const benefits: any = {};

  // Build conditions based on offer type
  if (formData.min_amount) conditions.min_amount = Number(formData.min_amount);
  if (formData.threshold_amount)
    conditions.threshold_amount = Number(formData.threshold_amount);
  if (formData.min_quantity)
    conditions.min_quantity = Number(formData.min_quantity);
  if (formData.min_orders_count)
    conditions.min_orders_count = Number(formData.min_orders_count);

  // Build benefits based on offer type
  if (formData.discount_percentage)
    benefits.discount_percentage = Number(formData.discount_percentage);
  if (formData.discount_amount)
    benefits.discount_amount = Number(formData.discount_amount);
  if (formData.max_discount_amount)
    benefits.max_discount_amount = Number(formData.max_discount_amount);
  if (formData.max_price) benefits.max_price = Number(formData.max_price);
  if (formData.buy_quantity)
    benefits.buy_quantity = Number(formData.buy_quantity);
  if (formData.get_quantity)
    benefits.get_quantity = Number(formData.get_quantity);
  // Only add get_same_item for BOGO offers
  if (offerType === "item_buy_get_free" && formData.get_same_item !== undefined)
    benefits.get_same_item = formData.get_same_item;
  if (formData.free_category) benefits.free_category = formData.free_category;
  if (formData.combo_price)
    benefits.combo_price = Number(formData.combo_price);
  // Only add is_customizable for combo_meal offers
  if (offerType === "combo_meal" && formData.is_customizable !== undefined)
    benefits.is_customizable = formData.is_customizable;

  return { conditions, benefits };
}

async function handleOfferItems(
  offerType: string,
  offerId: string,
  selectedItems: SelectedItem[],
  selectedFreeAddonItems: SelectedItem[],
  isEditMode: boolean,
  editOfferId?: string
) {
  const hasItemBasedOffer = [
    "item_buy_get_free",
    "cart_threshold_item",
    "item_free_addon",
    "item_percentage",
  ].includes(offerType);

  if (!hasItemBasedOffer || selectedItems.length === 0) return;

  // In edit mode, delete existing offer_items first
  if (isEditMode && editOfferId) {
    await supabase.from("offer_items").delete().eq("offer_id", editOfferId);
  }

  // Insert qualifying items
  const offerItems = selectedItems.map((item) => ({
    offer_id: offerId,
    item_type: item.item_type || null,
    menu_item_id: item.type === "item" ? item.id : null,
    menu_category_id: item.type === "category" ? item.id : null,
    quantity: item.quantity || null,
  }));

  const { error: itemsError } = await supabase
    .from("offer_items")
    .insert(offerItems);

  if (itemsError) throw itemsError;

  // Insert free add-on items for item_free_addon offers
  if (offerType === "item_free_addon" && selectedFreeAddonItems.length > 0) {
    const freeAddonItems = selectedFreeAddonItems.map((item) => ({
      offer_id: offerId,
      item_type: "free_addon",
      menu_item_id: item.type === "item" ? item.id : null,
      menu_category_id: item.type === "category" ? item.id : null,
      quantity: 1,
    }));

    const { error: freeAddonError } = await supabase
      .from("offer_items")
      .insert(freeAddonItems);

    if (freeAddonError) throw freeAddonError;
  }
}

async function handleComboMeals(
  offerType: string,
  offerId: string,
  formData: OfferFormData,
  selectedItems: SelectedItem[],
  isEditMode: boolean,
  editOfferId?: string
) {
  if (offerType !== "combo_meal" || selectedItems.length === 0) return;

  // In edit mode, delete existing combo_meal and items first
  if (isEditMode && editOfferId) {
    const { data: existingCombo } = await supabase
      .from("combo_meals")
      .select("id")
      .eq("offer_id", editOfferId)
      .single();

    if (existingCombo) {
      await supabase
        .from("combo_meal_items")
        .delete()
        .eq("combo_meal_id", existingCombo.id);

      await supabase.from("combo_meals").delete().eq("id", existingCombo.id);
    }
  }

  // Create combo meal
  const { data: comboMeal, error: comboError } = await supabase
    .from("combo_meals")
    .insert({
      offer_id: offerId,
      name: formData.name,
      description: formData.description,
      combo_price: Number(formData.combo_price),
      is_customizable: formData.is_customizable,
    })
    .select()
    .single();

  if (comboError) throw comboError;

  // Insert combo items
  const comboItems = selectedItems.map((item) => ({
    combo_meal_id: comboMeal.id,
    menu_item_id: item.type === "item" ? item.id : null,
    menu_category_id: item.type === "category" ? item.id : null,
    quantity: item.quantity || 1,
    is_required: item.is_required ?? true,
    is_selectable: item.is_selectable ?? false,
  }));

  const { error: comboItemsError } = await supabase
    .from("combo_meal_items")
    .insert(comboItems);

  if (comboItemsError) throw comboItemsError;
}
