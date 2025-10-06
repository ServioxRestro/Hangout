/**
 * Guest User Management
 * Handles creating and updating guest user profiles in the database
 */

import { supabase } from '@/lib/supabase/client';

export interface GuestUser {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  total_orders: number;
  total_spent: number;
  is_active: boolean;
  preferences: Record<string, any>;
  first_visit_at: string;
  visit_count: number;
  last_table_code: string | null;
}

/**
 * Create or update guest user in database
 * Called automatically after successful OTP verification
 */
export async function createOrUpdateGuestUser(phone: string): Promise<GuestUser | null> {
  try {
    // Check if guest user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('guest_users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching guest user:', fetchError);
      throw fetchError;
    }

    if (existingUser) {
      // Update existing user - increment visit count and update last login
      const { data: updatedUser, error: updateError } = await supabase
        .from('guest_users')
        .update({
          last_login_at: new Date().toISOString(),
          visit_count: existingUser.visit_count + 1,
          is_active: true
        })
        .eq('phone', phone)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating guest user:', updateError);
        throw updateError;
      }

      console.log('Guest user updated:', updatedUser);
      return updatedUser as GuestUser;
    } else {
      // Create new guest user
      const { data: newUser, error: insertError } = await supabase
        .from('guest_users')
        .insert({
          phone: phone,
          last_login_at: new Date().toISOString(),
          visit_count: 1,
          total_orders: 0,
          total_spent: 0,
          is_active: true,
          preferences: {}
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating guest user:', insertError);
        throw insertError;
      }

      console.log('Guest user created:', newUser);
      return newUser as GuestUser;
    }
  } catch (error) {
    console.error('Error in createOrUpdateGuestUser:', error);
    return null;
  }
}

/**
 * Get guest user by phone number
 */
export async function getGuestUserByPhone(phone: string): Promise<GuestUser | null> {
  try {
    const { data, error } = await supabase
      .from('guest_users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Error fetching guest user:', error);
      return null;
    }

    return data as GuestUser;
  } catch (error) {
    console.error('Error in getGuestUserByPhone:', error);
    return null;
  }
}

/**
 * Update guest user profile information
 */
export async function updateGuestUserProfile(
  phone: string,
  updates: {
    name?: string;
    email?: string;
    preferences?: Record<string, any>;
  }
): Promise<GuestUser | null> {
  try {
    const { data, error } = await supabase
      .from('guest_users')
      .update(updates)
      .eq('phone', phone)
      .select()
      .single();

    if (error) {
      console.error('Error updating guest user profile:', error);
      return null;
    }

    return data as GuestUser;
  } catch (error) {
    console.error('Error in updateGuestUserProfile:', error);
    return null;
  }
}

/**
 * Get guest user order history with statistics
 */
export async function getGuestUserStats(phone: string): Promise<{
  user: GuestUser | null;
  recentOrders: any[];
  favoriteItems: any[];
} | null> {
  try {
    // Get guest user
    const user = await getGuestUserByPhone(phone);
    if (!user) return null;

    // Get recent orders (last 10)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        )
      `)
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('Error fetching guest orders:', ordersError);
    }

    // Calculate favorite items (most ordered)
    const { data: favoriteItemsData, error: favError } = await supabase
      .from('order_items')
      .select(`
        menu_item_id,
        quantity,
        menu_items (
          id,
          name,
          price,
          image_url
        )
      `)
      .in(
        'order_id',
        orders?.map(o => o.id) || []
      );

    if (favError) {
      console.error('Error fetching favorite items:', favError);
    }

    // Aggregate favorite items
    const itemCounts = new Map<string, { item: any; totalQty: number }>();
    favoriteItemsData?.forEach(item => {
      const menuItem = item.menu_items as any;
      if (menuItem) {
        const existing = itemCounts.get(menuItem.id);
        if (existing) {
          existing.totalQty += item.quantity;
        } else {
          itemCounts.set(menuItem.id, {
            item: menuItem,
            totalQty: item.quantity
          });
        }
      }
    });

    const favoriteItems = Array.from(itemCounts.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5)
      .map(({ item, totalQty }) => ({
        ...item,
        order_count: totalQty
      }));

    return {
      user,
      recentOrders: orders || [],
      favoriteItems
    };
  } catch (error) {
    console.error('Error in getGuestUserStats:', error);
    return null;
  }
}

/**
 * Update last visited table
 */
export async function updateLastVisitedTable(
  phone: string,
  tableCode: string
): Promise<void> {
  try {
    await supabase
      .from('guest_users')
      .update({ last_table_code: tableCode })
      .eq('phone', phone);
  } catch (error) {
    console.error('Error updating last visited table:', error);
  }
}

/**
 * Get all guest users (for admin panel)
 */
export async function getAllGuestUsers(limit = 50, offset = 0): Promise<GuestUser[]> {
  try {
    const { data, error } = await supabase
      .from('guest_users')
      .select('*')
      .order('last_login_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching all guest users:', error);
      return [];
    }

    return data as GuestUser[];
  } catch (error) {
    console.error('Error in getAllGuestUsers:', error);
    return [];
  }
}

/**
 * Search guest users by phone or name
 */
export async function searchGuestUsers(query: string): Promise<GuestUser[]> {
  try {
    const { data, error } = await supabase
      .from('guest_users')
      .select('*')
      .or(`phone.ilike.%${query}%,name.ilike.%${query}%`)
      .order('last_login_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching guest users:', error);
      return [];
    }

    return data as GuestUser[];
  } catch (error) {
    console.error('Error in searchGuestUsers:', error);
    return [];
  }
}
