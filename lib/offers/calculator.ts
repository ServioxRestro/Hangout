import { supabase } from "@/lib/supabase/client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category_id?: string;
  is_veg?: boolean;
}

export interface AppliedOffer {
  id: string;
  name: string;
  discount_amount: number;
  free_items: any[];
  offer_type: string;
}

export interface OfferCalculationResult {
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  applied_offers: AppliedOffer[];
  free_items: any[];
}

export class OfferCalculator {
  private cart: CartItem[];
  private customerEmail?: string;
  private customerPhone?: string;
  private tableCode?: string;

  constructor(cart: CartItem[], customerData?: {
    email?: string;
    phone?: string;
    tableCode?: string;
  }) {
    this.cart = cart;
    this.customerEmail = customerData?.email;
    this.customerPhone = customerData?.phone;
    this.tableCode = customerData?.tableCode;
  }

  async calculateOffers(promoCode?: string): Promise<OfferCalculationResult> {
    const originalAmount = this.getCartTotal();
    let totalDiscount = 0;
    const appliedOffers: AppliedOffer[] = [];
    const freeItems: any[] = [];

    try {
      // Get applicable offers
      const offers = await this.getApplicableOffers(promoCode);
      
      // Sort by priority (higher priority first)
      offers.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      for (const offer of offers) {
        const offerResult = await this.applyOffer(offer);
        if (offerResult.discount_amount > 0 || offerResult.free_items.length > 0) {
          appliedOffers.push(offerResult);
          totalDiscount += offerResult.discount_amount;
          freeItems.push(...offerResult.free_items);
        }
      }

      return {
        original_amount: originalAmount,
        discount_amount: totalDiscount,
        final_amount: Math.max(0, originalAmount - totalDiscount),
        applied_offers: appliedOffers,
        free_items: freeItems
      };
    } catch (error) {
      console.error('Error calculating offers:', error);
      return {
        original_amount: originalAmount,
        discount_amount: 0,
        final_amount: originalAmount,
        applied_offers: [],
        free_items: []
      };
    }
  }

  private async getApplicableOffers(promoCode?: string): Promise<any[]> {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    let query = supabase
      .from('offers')
      .select(`
        *,
        offer_items (
          id,
          menu_item_id,
          menu_category_id,
          item_type,
          quantity
        )
      `)
      .eq('is_active', true);

    // If promo code is provided, filter by it
    if (promoCode) {
      query = query.eq('promo_code', promoCode.toUpperCase());
    } else {
      // Exclude promo code offers when no code is provided
      query = query.is('promo_code', null);
    }

    const { data: offers, error } = await query;

    if (error) {
      console.error('Error fetching offers:', error);
      return [];
    }

    if (!offers) return [];

    // Filter offers based on conditions
    const applicableOffers = offers.filter(offer => {
      // Check date range
      if (offer.start_date && new Date(offer.start_date) > now) return false;
      if (offer.end_date && new Date(offer.end_date) < now) return false;

      // Check usage limit
      if (offer.usage_limit && (offer.usage_count || 0) >= offer.usage_limit) return false;

      // Check time restrictions
      if (offer.valid_hours_start && offer.valid_hours_end) {
        if (currentTime < offer.valid_hours_start || currentTime > offer.valid_hours_end) {
          return false;
        }
      }

      // Check day restrictions
      if (offer.valid_days && offer.valid_days.length > 0) {
        if (!offer.valid_days.includes(currentDay)) return false;
      }

      // Check if offer conditions are met
      return this.checkOfferConditions(offer);
    });

    return applicableOffers;
  }

  private checkOfferConditions(offer: any): boolean {
    const conditions = offer.conditions || {};
    const cartTotal = this.getCartTotal();

    switch (offer.offer_type) {
      case 'cart_percentage':
      case 'cart_flat_amount':
        // Check minimum amount
        if (conditions.min_amount && cartTotal < conditions.min_amount) {
          return false;
        }
        break;

      case 'cart_threshold_item':
        // Check if cart meets threshold + additional amount
        const threshold = (conditions.min_amount || 0) + (conditions.threshold_amount || 0);
        if (cartTotal < threshold) return false;
        break;

      case 'item_buy_get_free':
        // Check if required items are in cart
        return this.hasRequiredItems(offer);

      case 'time_based':
        // Time conditions already checked in getApplicableOffers
        // Check if applies to specific categories
        if (conditions.categories && conditions.categories.length > 0) {
          return this.hasItemsFromCategories(conditions.categories);
        }
        break;

      case 'customer_based':
        // Customer eligibility check is async, return true for now
        // Should be validated separately before offer application
        return true;
    }

    return true;
  }

  private hasRequiredItems(offer: any): boolean {
    const benefits = offer.benefits || {};
    const buyQuantity = benefits.buy_quantity || 1;

    // Get buy items from offer_items
    const buyItems = offer.offer_items?.filter((item: any) => item.item_type === 'buy') || [];
    
    for (const buyItem of buyItems) {
      if (buyItem.menu_item_id) {
        // Check specific item
        const cartItem = this.cart.find(item => item.id === buyItem.menu_item_id);
        if (!cartItem || cartItem.quantity < buyQuantity) return false;
      } else if (buyItem.menu_category_id) {
        // Check category
        const categoryItems = this.cart.filter(item => item.category_id === buyItem.menu_category_id);
        const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQuantity < buyQuantity) return false;
      }
    }

    return buyItems.length > 0;
  }

  private hasItemsFromCategories(categoryIds: string[]): boolean {
    return this.cart.some(item => 
      item.category_id && categoryIds.includes(item.category_id)
    );
  }

  private async checkCustomerEligibility(offer: any): Promise<boolean> {
    const conditions = offer.conditions || {};
    
    if (conditions.customer_type === 'first_time') {
      // Check if this is customer's first order
      if (!this.customerEmail && !this.customerPhone) return false;
      
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('id')
        .or(`customer_email.eq.${this.customerEmail},customer_phone.eq.${this.customerPhone}`)
        .limit(1);
      
      return !previousOrders || previousOrders.length === 0;
    }

    if (conditions.customer_type === 'loyalty') {
      // Check if customer has minimum number of orders
      if (!this.customerEmail && !this.customerPhone) return false;
      
      const minOrdersCount = conditions.min_orders_count || 5;
      const { data: orders, count } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .or(`customer_email.eq.${this.customerEmail},customer_phone.eq.${this.customerPhone}`);
      
      return count ? count >= minOrdersCount : false;
    }

    return true;
  }

  private async applyOffer(offer: any): Promise<AppliedOffer> {
    const benefits = offer.benefits || {};
    let discountAmount = 0;
    const freeItems: any[] = [];

    switch (offer.offer_type) {
      case 'cart_percentage':
        discountAmount = this.getCartTotal() * (benefits.discount_percentage / 100);
        break;

      case 'cart_flat_amount':
        discountAmount = Math.min(benefits.discount_amount, this.getCartTotal());
        break;

      case 'cart_threshold_item':
        // Get available free items from offer_items
        const thresholdFreeItems = offer.offer_items?.filter((item: any) => item.item_type === 'free_threshold') || [];
        const maxPrice = benefits.max_price || 999999;
        
        // For threshold offers, customer can choose one free item up to max price
        if (thresholdFreeItems.length > 0) {
          // Add the first eligible item (in a real app, customer would choose)
          const freeItem = {
            category: 'threshold_free',
            max_price: maxPrice,
            available_items: thresholdFreeItems.length,
            message: `Choose 1 free item (up to ₹${maxPrice})`
          };
          freeItems.push(freeItem);
        }
        break;

      case 'item_buy_get_free':
        // Calculate free items based on buy quantity
        const freeItemsFromOffer = this.calculateFreeItems(offer);
        freeItems.push(...freeItemsFromOffer);
        break;

      case 'item_percentage':
      case 'time_based':
        discountAmount = this.calculateCategoryDiscount(offer);
        break;

      case 'promo_code':
        if (benefits.discount_percentage) {
          discountAmount = this.getCartTotal() * (benefits.discount_percentage / 100);
        } else if (benefits.discount_amount) {
          discountAmount = Math.min(benefits.discount_amount, this.getCartTotal());
        }
        break;
    }

    return {
      id: offer.id,
      name: offer.name,
      discount_amount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
      free_items: freeItems,
      offer_type: offer.offer_type
    };
  }

  private calculateFreeItems(offer: any): any[] {
    const benefits = offer.benefits || {};
    const buyQuantity = benefits.buy_quantity || 1;
    const getFreeQuantity = benefits.get_quantity || 1;
    const freeItems: any[] = [];

    const buyItems = offer.offer_items?.filter((item: any) => item.item_type === 'buy') || [];
    const getFreeItems = offer.offer_items?.filter((item: any) => item.item_type === 'get_free') || [];
    
    // Calculate how many sets of free items customer qualifies for
    let qualifiedSets = 0;
    
    for (const buyItem of buyItems) {
      if (buyItem.menu_item_id) {
        const cartItem = this.cart.find(item => item.id === buyItem.menu_item_id);
        if (cartItem && cartItem.quantity >= buyQuantity) {
          const setsFromThisItem = Math.floor(cartItem.quantity / buyQuantity);
          qualifiedSets = Math.max(qualifiedSets, setsFromThisItem);
        }
      }
    }

    if (qualifiedSets > 0) {
      if (benefits.get_same_item) {
        // Same item for buy and get free
        for (const buyItem of buyItems) {
          if (buyItem.menu_item_id) {
            const cartItem = this.cart.find(item => item.id === buyItem.menu_item_id);
            if (cartItem && cartItem.quantity >= buyQuantity) {
              const freeCount = qualifiedSets * getFreeQuantity;
              freeItems.push({
                item_id: cartItem.id,
                item_name: cartItem.name,
                quantity: freeCount,
                unit_price: cartItem.price,
                source: 'buy_get_same'
              });
              break; // Only add once for same item offers
            }
          }
        }
      } else {
        // Different items - customer gets to choose from getFreeItems
        if (getFreeItems.length > 0) {
          const totalFreeItems = qualifiedSets * getFreeQuantity;
          freeItems.push({
            category: 'buy_get_different',
            quantity: totalFreeItems,
            available_items: getFreeItems.length,
            message: `Choose ${totalFreeItems} free item(s) from eligible options`,
            source: 'buy_get_different'
          });
        }
      }
    }

    return freeItems;
  }

  private calculateCategoryDiscount(offer: any): number {
    const benefits = offer.benefits || {};
    const conditions = offer.conditions || {};
    let discount = 0;

    if (conditions.categories && conditions.categories.length > 0) {
      // Apply discount only to items in specified categories
      const categoryItems = this.cart.filter(item => 
        item.category_id && conditions.categories.includes(item.category_id)
      );
      
      const categoryTotal = categoryItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      if (benefits.discount_percentage) {
        discount = categoryTotal * (benefits.discount_percentage / 100);
      } else if (benefits.discount_amount) {
        discount = Math.min(benefits.discount_amount, categoryTotal);
      }
    }

    return discount;
  }

  private getCartTotal(): number {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  async recordOfferUsage(appliedOffers: AppliedOffer[], orderId: string): Promise<void> {
    const usageRecords = appliedOffers.map(offer => ({
      offer_id: offer.id,
      order_id: orderId,
      customer_email: this.customerEmail || null,
      customer_phone: this.customerPhone || null,
      discount_amount: offer.discount_amount,
      free_items: offer.free_items
    }));

    if (usageRecords.length > 0) {
      const { error: usageError } = await supabase
        .from('offer_usage')
        .insert(usageRecords);

      if (usageError) {
        console.error('Error recording offer usage:', usageError);
      }

      // Update usage count for each offer
      for (const offer of appliedOffers) {
        // Increment usage count using RPC function
        const { error: updateError } = await supabase
          .rpc('increment_offer_usage', { offer_id: offer.id });

        if (updateError) {
          console.error('Error updating offer usage count:', updateError);
        }
      }
    }
  }
}