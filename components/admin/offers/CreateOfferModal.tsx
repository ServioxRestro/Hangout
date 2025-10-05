"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { X, Plus, Minus } from "lucide-react";
import Button from "@/components/admin/Button";
import ImageUpload from "@/components/admin/ImageUpload";

type OfferFormData = {
  name: string;
  description: string;
  offer_type: string;
  is_active: boolean;
  priority: number;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  conditions: any;
  benefits: any;
  valid_days: string[];
  valid_hours_start: string;
  valid_hours_end: string;
  target_customer_type: string;
  promo_code: string;
  image_url: string;
};

type MenuItem = {
  id: string;
  name: string;
  category_id: string;
  price: number;
};

type MenuCategory = {
  id: string;
  name: string;
};

interface CreateOfferModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const offerTypes = [
  { value: 'cart_percentage', label: 'Cart % Discount', description: 'Percentage discount on total cart' },
  { value: 'cart_flat_amount', label: 'Cart Flat Discount', description: 'Fixed amount discount on total cart' },
  { value: 'cart_threshold_item', label: 'Threshold Item', description: 'Free item when spending reaches threshold' },
  { value: 'item_buy_get_free', label: 'Buy X Get Y Free', description: 'Buy certain quantity, get items free' },
  { value: 'item_free_addon', label: 'Free Add-on', description: 'Free side item with purchase' },
  { value: 'item_percentage', label: 'Item % Discount', description: 'Percentage discount on specific items' },
  { value: 'time_based', label: 'Time-based', description: 'Discounts during specific hours/days' },
  { value: 'customer_based', label: 'Customer Segment', description: 'Offers for specific customer types' },
  { value: 'combo_meal', label: 'Combo Meal', description: 'Bundle deals with fixed pricing' },
  { value: 'promo_code', label: 'Promo Code', description: 'Code-based discounts' }
];

const daysOfWeek = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

const customerTypes = [
  { value: 'all', label: 'All Customers' },
  { value: 'first_time', label: 'First-time Customers' },
  { value: 'returning', label: 'Returning Customers' },
  { value: 'loyalty', label: 'Loyalty Members (5+ orders)' }
];

export default function CreateOfferModal({ onClose, onSuccess }: CreateOfferModalProps) {
  const [formData, setFormData] = useState<OfferFormData>({
    name: '',
    description: '',
    offer_type: 'cart_percentage',
    is_active: true,
    priority: 0,
    start_date: '',
    end_date: '',
    usage_limit: null,
    conditions: {},
    benefits: {},
    valid_days: [],
    valid_hours_start: '',
    valid_hours_end: '',
    target_customer_type: 'all',
    promo_code: '',
    image_url: ''
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // Separate selections for Buy X Get Y Free
  const [buyItems, setBuyItems] = useState<string[]>([]);
  const [getFreeItems, setGetFreeItems] = useState<string[]>([]);
  // Selection for threshold free items
  const [thresholdFreeItems, setThresholdFreeItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      const [itemsResponse, categoriesResponse] = await Promise.all([
        supabase.from('menu_items').select('id, name, category_id, price').eq('is_available', true),
        supabase.from('menu_categories').select('id, name').eq('is_active', true)
      ]);

      if (itemsResponse.data) setMenuItems(itemsResponse.data as any);
      if (categoriesResponse.data) setMenuCategories(categoriesResponse.data as any);
    } catch (error) {
      console.error('Error fetching menu data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data based on offer type
      const offerData = {
        ...formData,
        conditions: buildConditions(),
        benefits: buildBenefits(),
        valid_days: formData.valid_days.length > 0 ? formData.valid_days : null,
        valid_hours_start: formData.valid_hours_start || null,
        valid_hours_end: formData.valid_hours_end || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        promo_code: formData.offer_type === 'promo_code' ? formData.promo_code : null
      };

      const { data: offer, error } = await supabase
        .from('offers')
        .insert([offerData])
        .select()
        .single();

      if (error) throw error;

      // Insert related data for item-based offers
      const offerItems: any[] = [];

      // Handle Buy X Get Y Free offers
      if (formData.offer_type === 'item_buy_get_free') {
        if (formData.benefits.get_same_item) {
          // Same item for buy and get free
          buyItems.forEach(itemId => {
            offerItems.push({
              offer_id: offer.id,
              menu_item_id: itemId,
              item_type: 'buy'
            });
            offerItems.push({
              offer_id: offer.id,
              menu_item_id: itemId,
              item_type: 'get_free'
            });
          });
        } else {
          // Different items for buy and get free
          buyItems.forEach(itemId => {
            offerItems.push({
              offer_id: offer.id,
              menu_item_id: itemId,
              item_type: 'buy'
            });
          });
          getFreeItems.forEach(itemId => {
            offerItems.push({
              offer_id: offer.id,
              menu_item_id: itemId,
              item_type: 'get_free'
            });
          });
        }
      }
      
      // Handle Threshold Item offers
      else if (formData.offer_type === 'cart_threshold_item') {
        thresholdFreeItems.forEach(itemId => {
          offerItems.push({
            offer_id: offer.id,
            menu_item_id: itemId,
            item_type: 'free_threshold'
          });
        });
      }
      
      // Handle other item-based offers
      else if (formData.offer_type.includes('item_') && (selectedItems.length > 0 || selectedCategories.length > 0)) {
        // Add selected items
        selectedItems.forEach(itemId => {
          offerItems.push({
            offer_id: offer.id,
            menu_item_id: itemId,
            item_type: getItemType(formData.offer_type)
          });
        });

        // Add selected categories
        selectedCategories.forEach(categoryId => {
          offerItems.push({
            offer_id: offer.id,
            menu_category_id: categoryId,
            item_type: getItemType(formData.offer_type)
          });
        });
      }

      if (offerItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('offer_items')
          .insert(offerItems);

        if (itemsError) throw itemsError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating offer:', error);
      alert('Failed to create offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const buildConditions = () => {
    const conditions: any = {};
    
    switch (formData.offer_type) {
      case 'cart_percentage':
      case 'cart_flat_amount':
        if (formData.conditions.min_amount) {
          conditions.min_amount = Number(formData.conditions.min_amount);
        }
        break;
      case 'cart_threshold_item':
        conditions.min_amount = Number(formData.conditions.min_amount || 0);
        conditions.threshold_amount = Number(formData.conditions.threshold_amount || 0);
        break;
      case 'item_buy_get_free':
        conditions.buy_quantity = Number(formData.conditions.buy_quantity || 1);
        break;
      case 'customer_based':
        conditions.customer_type = formData.target_customer_type;
        if (formData.target_customer_type === 'loyalty') {
          conditions.min_orders_count = Number(formData.conditions.min_orders_count || 5);
        }
        break;
    }

    if (selectedCategories.length > 0) {
      conditions.categories = selectedCategories;
    }

    return conditions;
  };

  const buildBenefits = () => {
    const benefits: any = {};

    switch (formData.offer_type) {
      case 'cart_percentage':
      case 'item_percentage':
        benefits.discount_percentage = Number(formData.benefits.discount_percentage || 0);
        break;
      case 'cart_flat_amount':
        benefits.discount_amount = Number(formData.benefits.discount_amount || 0);
        break;
      case 'cart_threshold_item':
        benefits.free_category = formData.benefits.free_category || '';
        benefits.max_price = Number(formData.benefits.max_price || 0);
        break;
      case 'item_buy_get_free':
        benefits.get_quantity = Number(formData.benefits.get_quantity || 1);
        benefits.get_same_item = formData.benefits.get_same_item || false;
        break;
      case 'time_based':
        if (formData.benefits.discount_percentage) {
          benefits.discount_percentage = Number(formData.benefits.discount_percentage);
        } else if (formData.benefits.discount_amount) {
          benefits.discount_amount = Number(formData.benefits.discount_amount);
        }
        break;
      case 'promo_code':
        if (formData.benefits.discount_percentage) {
          benefits.discount_percentage = Number(formData.benefits.discount_percentage);
        } else if (formData.benefits.discount_amount) {
          benefits.discount_amount = Number(formData.benefits.discount_amount);
        }
        break;
    }

    return benefits;
  };

  const getItemType = (offerType: string) => {
    switch (offerType) {
      case 'item_buy_get_free': return 'buy';
      case 'item_free_addon': return 'addon';
      case 'item_percentage': return 'discount';
      case 'cart_threshold_item': return 'free_threshold';
      default: return 'buy';
    }
  };

  const renderOfferTypeSpecificFields = () => {
    switch (formData.offer_type) {
      case 'cart_percentage':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.benefits.discount_percentage || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  benefits: { ...prev.benefits, discount_percentage: e.target.value }
                }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order Amount (Optional)
              </label>
              <input
                type="number"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.conditions.min_amount || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  conditions: { ...prev.conditions, min_amount: e.target.value }
                }))}
                placeholder="e.g., 500"
              />
            </div>
          </div>
        );

      case 'cart_flat_amount':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.benefits.discount_amount || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  benefits: { ...prev.benefits, discount_amount: e.target.value }
                }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order Amount
              </label>
              <input
                type="number"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.conditions.min_amount || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  conditions: { ...prev.conditions, min_amount: e.target.value }
                }))}
                required
                placeholder="e.g., 300"
              />
            </div>
          </div>
        );

      case 'promo_code':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promo Code
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase"
                value={formData.promo_code}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  promo_code: e.target.value.toUpperCase()
                }))}
                required
                placeholder="e.g., WELCOME10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.benefits.discount_percentage || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, discount_percentage: e.target.value, discount_amount: '' }
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OR Discount Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.benefits.discount_amount || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, discount_amount: e.target.value, discount_percentage: '' }
                  }))}
                />
              </div>
            </div>
          </div>
        );

      case 'item_buy_get_free':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Buy X Get Y Free Configuration</h4>
              <p className="text-xs text-blue-600">Follow the steps below to set up your Buy X Get Y offer</p>
            </div>

            {/* Step 1: Configure Quantities */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">1</div>
                <h4 className="text-sm font-semibold text-gray-800">Configure Quantities</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buy Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.conditions.buy_quantity || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, buy_quantity: e.target.value }
                    }))}
                    required
                    placeholder="e.g., 2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of items customer must buy</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Get Free Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.benefits.get_quantity || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      benefits: { ...prev.benefits, get_quantity: e.target.value }
                    }))}
                    required
                    placeholder="e.g., 1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of items customer gets free</p>
                </div>
              </div>
            </div>

            {/* Step 2: Offer Type */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">2</div>
                <h4 className="text-sm font-semibold text-gray-800">Choose Offer Type</h4>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="get_same_item"
                  checked={formData.benefits.get_same_item || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, get_same_item: e.target.checked }
                  }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="get_same_item" className="text-sm font-medium text-gray-700">
                  Get same item for free
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.benefits.get_same_item 
                  ? "Example: Buy 2 pizzas, get 1 pizza free" 
                  : "Example: Buy 2 burgers, get 1 fries free (select different items below)"}
              </p>
            </div>

            {formData.benefits.get_same_item ? (
              /* Same Item Selection */
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">3</div>
                  <h4 className="text-sm font-semibold text-gray-800">Select Items for Buy & Get Free</h4>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Choose which items qualify for this offer (customer buys and gets same item free)
                </p>
                {buyItems.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
                    <p className="text-xs text-blue-700 font-medium">
                      {buyItems.length} item(s) selected for buy & get free
                    </p>
                  </div>
                )}
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-4">
                    {menuCategories.map(category => (
                      <div key={category.id}>
                        <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                          {category.name}
                          <span className="text-xs text-gray-500 ml-2">
                            ({menuItems.filter(item => item.category_id === category.id && buyItems.includes(item.id)).length} selected)
                          </span>
                        </h5>
                        <div className="space-y-1 ml-4">
                          {menuItems.filter(item => item.category_id === category.id).map(item => (
                            <label key={item.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={buyItems.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBuyItems(prev => [...prev, item.id]);
                                  } else {
                                    setBuyItems(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm flex-1">{item.name}</span>
                              <span className="text-sm text-gray-500">₹{item.price}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Separate Buy and Free Item Selection */
              <>
                {/* Step 3A: Select Buy Items */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">3</div>
                    <h4 className="text-sm font-semibold text-gray-800">Select Items Customers Must Buy</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Choose which items customers must purchase to qualify for free items
                  </p>
                  {buyItems.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
                      <p className="text-xs text-blue-700 font-medium">
                        {buyItems.length} purchase item(s) selected
                      </p>
                    </div>
                  )}
                  <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-4">
                      {menuCategories.map(category => (
                        <div key={category.id}>
                          <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                            {category.name}
                            <span className="text-xs text-gray-500 ml-2">
                              ({menuItems.filter(item => item.category_id === category.id && buyItems.includes(item.id)).length} selected)
                            </span>
                          </h5>
                          <div className="space-y-1 ml-4">
                            {menuItems.filter(item => item.category_id === category.id).map(item => (
                              <label key={item.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={buyItems.includes(item.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBuyItems(prev => [...prev, item.id]);
                                    } else {
                                      setBuyItems(prev => prev.filter(id => id !== item.id));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm flex-1">{item.name}</span>
                                <span className="text-sm text-gray-500">₹{item.price}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 3B: Select Free Items */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">4</div>
                    <h4 className="text-sm font-semibold text-gray-800">Select Items Customers Get Free</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Choose which items customers can get free when they buy the required items
                  </p>
                  {getFreeItems.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-4">
                      <p className="text-xs text-green-700 font-medium">
                        {getFreeItems.length} free item(s) selected
                      </p>
                    </div>
                  )}
                  <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-4">
                      {menuCategories.map(category => (
                        <div key={category.id}>
                          <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                            {category.name}
                            <span className="text-xs text-gray-500 ml-2">
                              ({menuItems.filter(item => item.category_id === category.id && getFreeItems.includes(item.id)).length} selected)
                            </span>
                          </h5>
                          <div className="space-y-1 ml-4">
                            {menuItems.filter(item => item.category_id === category.id).map(item => (
                              <label key={item.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={getFreeItems.includes(item.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setGetFreeItems(prev => [...prev, item.id]);
                                    } else {
                                      setGetFreeItems(prev => prev.filter(id => id !== item.id));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm flex-1">{item.name}</span>
                                <span className="text-sm text-gray-500">₹{item.price}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'item_percentage':
        return (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">Item Discount Configuration</h4>
              <p className="text-xs text-purple-600">Apply percentage discount to specific menu items</p>
            </div>

            {/* Step 1: Set Discount Percentage */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">1</div>
                <h4 className="text-sm font-semibold text-gray-800">Set Discount Percentage</h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.benefits.discount_percentage || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, discount_percentage: e.target.value }
                  }))}
                  required
                  placeholder="e.g., 20"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This discount will be applied to all selected items below
                </p>
              </div>
            </div>

            {/* Step 2: Select Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">2</div>
                <h4 className="text-sm font-semibold text-gray-800">Select Items for Discount</h4>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Choose which items will receive the {formData.benefits.discount_percentage || 'X'}% discount
              </p>
              {selectedItems.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-4">
                  <p className="text-xs text-purple-700 font-medium">
                    {selectedItems.length} item(s) selected for discount
                  </p>
                </div>
              )}
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-4">
                  {menuCategories.map(category => (
                    <div key={category.id}>
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                        {category.name}
                        <span className="text-xs text-gray-500 ml-2">
                          ({menuItems.filter(item => item.category_id === category.id && selectedItems.includes(item.id)).length} selected)
                        </span>
                      </h5>
                      <div className="space-y-1 ml-4">
                        {menuItems.filter(item => item.category_id === category.id).map(item => (
                          <label key={item.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(prev => [...prev, item.id]);
                                } else {
                                  setSelectedItems(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm flex-1">{item.name}</span>
                            <div className="text-xs text-gray-500">
                              <span className="line-through">₹{item.price}</span>
                              {formData.benefits.discount_percentage && (
                                <span className="ml-2 text-green-600 font-medium">
                                  ₹{Math.round(item.price * (1 - Number(formData.benefits.discount_percentage) / 100))}
                                </span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'item_free_addon':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Free Add-on Configuration</h4>
              <p className="text-xs text-green-600">Follow these steps to set up your free add-on offer</p>
            </div>

            {/* Step 1: Select Main Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">1</div>
                <h4 className="text-sm font-semibold text-gray-800">Select Main Items</h4>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Choose which items customers must purchase to get free add-ons
              </p>
              <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                {selectedItems.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
                    <p className="text-xs text-blue-700 font-medium">
                      {selectedItems.length} main item(s) selected
                    </p>
                  </div>
                )}
                <div className="space-y-4">
                  {menuCategories.map(category => (
                    <div key={category.id}>
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                        {category.name}
                        <span className="text-xs text-gray-500 ml-2">
                          ({menuItems.filter(item => item.category_id === category.id && selectedItems.includes(item.id)).length} selected)
                        </span>
                      </h5>
                      <div className="space-y-1 ml-4">
                        {menuItems.filter(item => item.category_id === category.id).map(item => (
                          <label key={item.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(prev => [...prev, item.id]);
                                } else {
                                  setSelectedItems(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm flex-1">{item.name}</span>
                            <span className="text-sm text-gray-500">₹{item.price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Select Free Add-on Categories */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">2</div>
                <h4 className="text-sm font-semibold text-gray-800">Select Free Add-on Categories</h4>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Choose which categories customers can select free items from
              </p>
              {selectedCategories.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-4">
                  <p className="text-xs text-green-700 font-medium">
                    {selectedCategories.length} add-on categor{selectedCategories.length > 1 ? 'ies' : 'y'} selected
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {menuCategories.map(category => (
                  <label key={category.id} className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories(prev => [...prev, category.id]);
                        } else {
                          setSelectedCategories(prev => prev.filter(id => id !== category.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {menuItems.filter(item => item.category_id === category.id).length} items
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 3: Set Price Limit */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">3</div>
                <h4 className="text-sm font-semibold text-gray-800">Set Maximum Free Item Price</h4>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Set the maximum price limit for free add-on items
              </p>
              <input
                type="number"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.benefits.max_free_price || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  benefits: { ...prev.benefits, max_free_price: e.target.value }
                }))}
                placeholder="e.g., 100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only items priced at or below this amount will be available as free add-ons
              </p>
            </div>
          </div>
        );

      case 'customer_based':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-800 mb-1">Customer Targeting</h4>
              <p className="text-xs text-purple-600">Define which customers are eligible for this offer</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Customer Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.target_customer_type}
                onChange={(e) => setFormData(prev => ({ ...prev, target_customer_type: e.target.value }))}
                required
              >
                <option value="first_time">First-time Customers</option>
                <option value="returning">Returning Customers</option>
                <option value="loyalty">Loyalty Members (5+ orders)</option>
                <option value="high_value">High-value Customers (₹2000+ spent)</option>
                <option value="inactive">Inactive Customers (30+ days no order)</option>
              </select>
            </div>

            {formData.target_customer_type === 'loyalty' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Orders Required
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.conditions.min_orders_count || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: { ...prev.conditions, min_orders_count: e.target.value }
                  }))}
                  placeholder="e.g., 5"
                />
              </div>
            )}

            {formData.target_customer_type === 'high_value' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Total Spent (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.conditions.min_spent_amount || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: { ...prev.conditions, min_spent_amount: e.target.value }
                  }))}
                  placeholder="e.g., 2000"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usage Limit per Customer
              </label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.conditions.usage_limit_per_customer || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  conditions: { ...prev.conditions, usage_limit_per_customer: e.target.value }
                }))}
                placeholder="e.g., 1 (one-time use per customer)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.benefits.discount_percentage || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, discount_percentage: e.target.value, discount_amount: '' }
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OR Discount Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.benefits.discount_amount || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, discount_amount: e.target.value, discount_percentage: '' }
                  }))}
                />
              </div>
            </div>
          </div>
        );

      case 'combo_meal':
        const originalPrice = selectedItems.reduce((total, itemId) => {
          const item = menuItems.find(i => i.id === itemId);
          return total + (item ? item.price : 0);
        }, 0);
        const comboPrice = Number(formData.benefits.combo_price) || 0;
        const savings = Math.max(0, originalPrice - comboPrice);
        
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-orange-800 mb-2">Combo Meal Builder</h4>
              <p className="text-xs text-orange-600">Create bundle deals step by step with clear pricing</p>
            </div>

            {/* Step 1: Combo Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">1</div>
                <h4 className="text-sm font-semibold text-gray-800">Combo Details</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Combo Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.benefits.combo_name || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      benefits: { ...prev.benefits, combo_name: e.target.value }
                    }))}
                    placeholder="e.g., Burger Combo"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Give your combo a catchy name</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="is_customizable"
                      checked={formData.benefits.is_customizable || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        benefits: { ...prev.benefits, is_customizable: e.target.checked }
                      }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="is_customizable" className="text-sm font-medium text-gray-700">
                      Allow customers to customize combo items
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Select Combo Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">2</div>
                <h4 className="text-sm font-semibold text-gray-800">Select Items for Combo</h4>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Choose which items will be included in this combo deal
              </p>
              {selectedItems.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-blue-800">
                      {selectedItems.length} item(s) selected
                    </p>
                    <p className="text-sm text-blue-700">
                      Original Total: ₹{originalPrice}
                    </p>
                  </div>
                  {selectedItems.map(itemId => {
                    const item = menuItems.find(i => i.id === itemId);
                    return item ? (
                      <div key={item.id} className="flex justify-between items-center mt-1">
                        <span className="text-xs text-blue-600">• {item.name}</span>
                        <span className="text-xs text-blue-600">₹{item.price}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-4">
                  {menuCategories.map(category => (
                    <div key={category.id}>
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                        {category.name}
                        <span className="text-xs text-gray-500 ml-2">
                          ({menuItems.filter(item => item.category_id === category.id && selectedItems.includes(item.id)).length} selected)
                        </span>
                      </h5>
                      <div className="space-y-1 ml-4">
                        {menuItems.filter(item => item.category_id === category.id).map(item => (
                          <label key={item.id} className="flex items-center justify-between hover:bg-gray-50 p-1 rounded">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedItems(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-sm text-gray-500">₹{item.price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Set Combo Price */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">3</div>
                <h4 className="text-sm font-semibold text-gray-800">Set Combo Price</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Combo Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.benefits.combo_price || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      benefits: { ...prev.benefits, combo_price: e.target.value }
                    }))}
                    placeholder="e.g., 199"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Set your combo's special price</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Price
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                    value={`₹${originalPrice}`}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Sum of selected items</p>
                </div>
              </div>
              {selectedItems.length > 0 && comboPrice > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Customer Savings:</span>
                    <span className="text-lg font-bold text-green-800">₹{savings}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {savings > 0 ? `${((savings / originalPrice) * 100).toFixed(1)}% discount` : 'No savings - combo price equals original price'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'cart_threshold_item':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">Threshold Item Configuration</h4>
              <p className="text-xs text-yellow-600">Give customers free items when they reach spending thresholds</p>
            </div>

            {/* Step 1: Set Threshold Amount */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">1</div>
                <h4 className="text-sm font-semibold text-gray-800">Set Spending Threshold</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.conditions.min_amount || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, min_amount: e.target.value }
                    }))}
                    required
                    placeholder="e.g., 500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Base amount customer must spend</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Threshold Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.conditions.threshold_amount || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, threshold_amount: e.target.value }
                    }))}
                    required
                    placeholder="e.g., 800"
                  />
                  <p className="text-xs text-gray-500 mt-1">Amount to trigger free item</p>
                </div>
              </div>
            </div>

            {/* Step 2: Free Item Selection */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">2</div>
                <h4 className="text-sm font-semibold text-gray-800">Select Free Items</h4>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Choose which items customers can get free when they reach the threshold
              </p>
              {thresholdFreeItems.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-4">
                  <p className="text-xs text-yellow-700 font-medium">
                    {thresholdFreeItems.length} free item(s) selected
                  </p>
                </div>
              )}
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-4">
                  {menuCategories.map(category => (
                    <div key={category.id}>
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                        {category.name}
                        <span className="text-xs text-gray-500 ml-2">
                          ({menuItems.filter(item => item.category_id === category.id && thresholdFreeItems.includes(item.id)).length} selected)
                        </span>
                      </h5>
                      <div className="space-y-1 ml-4">
                        {menuItems.filter(item => item.category_id === category.id).map(item => (
                          <label key={item.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={thresholdFreeItems.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setThresholdFreeItems(prev => [...prev, item.id]);
                                } else {
                                  setThresholdFreeItems(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm flex-1">{item.name}</span>
                            <span className="text-sm text-gray-500">₹{item.price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Set Maximum Free Item Price */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2">3</div>
                <h4 className="text-sm font-semibold text-gray-800">Set Maximum Free Item Price</h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Free Item Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.benefits.max_price || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, max_price: e.target.value }
                  }))}
                  placeholder="e.g., 200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only items at or below this price can be selected as free items
                </p>
              </div>
            </div>
          </div>
        );

      case 'time_based':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.valid_hours_start}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    valid_hours_start: e.target.value
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.valid_hours_end}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    valid_hours_end: e.target.value
                  }))}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid Days (Select multiple)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {daysOfWeek.map(day => (
                  <label key={day.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.valid_days.includes(day.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            valid_days: [...prev.valid_days, day.value]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            valid_days: prev.valid_days.filter(d => d !== day.value)
                          }));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.benefits.discount_percentage || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, discount_percentage: e.target.value, discount_amount: '' }
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OR Discount Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.benefits.discount_amount || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefits: { ...prev.benefits, discount_amount: e.target.value, discount_percentage: '' }
                  }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apply to Categories
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {menuCategories.map(category => (
                  <label key={category.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories(prev => [...prev, category.id]);
                        } else {
                          setSelectedCategories(prev => prev.filter(id => id !== category.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Offer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offer Name
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="e.g., 10% Off Above ₹500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                placeholder="Brief description of the offer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promotional Image (Optional)
              </label>
              <ImageUpload
                currentImage={formData.image_url}
                onImageChange={(imageUrl) =>
                  setFormData(prev => ({ ...prev, image_url: imageUrl || "" }))
                }
                folder="offers"
                maxSizeInMB={5}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offer Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.offer_type}
                onChange={(e) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    offer_type: e.target.value,
                    conditions: {},
                    benefits: {},
                    promo_code: ''
                  }));
                  // Clear selections when offer type changes
                  setSelectedItems([]);
                  setSelectedCategories([]);
                  setBuyItems([]);
                  setGetFreeItems([]);
                  setThresholdFreeItems([]);
                }}
              >
                {offerTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Offer Type Specific Fields */}
          {renderOfferTypeSpecificFields()}

          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usage Limit (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.usage_limit || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    usage_limit: e.target.value ? Number(e.target.value) : null 
                  }))}
                  placeholder="Unlimited"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (0-10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Activate offer immediately
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}