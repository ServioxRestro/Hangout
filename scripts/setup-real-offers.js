/**
 * Setup Real-World Offers
 * Deletes all test offers and creates realistic production-ready offers
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanupTestOffers() {
  console.log('🗑️  Cleaning up test offers...\n');
  
  // First, clear locked_offer_id from table_sessions
  console.log('  Clearing offer references from table_sessions...');
  const { error: clearSessionsError } = await supabase
    .from('table_sessions')
    .update({ locked_offer_id: null })
    .not('locked_offer_id', 'is', null);

  if (clearSessionsError) {
    console.error('  Error clearing table_sessions:', clearSessionsError);
    throw clearSessionsError;
  }

  // Clear offer references from orders
  console.log('  Clearing offer references from orders...');
  const { error: clearOrdersError } = await supabase
    .from('orders')
    .update({ session_offer_id: null })
    .not('session_offer_id', 'is', null);

  if (clearOrdersError) {
    console.error('  Error clearing orders:', clearOrdersError);
    throw clearOrdersError;
  }

  // Delete all offer_items first (child table)
  console.log('  Deleting offer_items...');
  const { error: deleteItemsError } = await supabase
    .from('offer_items')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteItemsError) {
    console.error('  Error deleting offer_items:', deleteItemsError);
    throw deleteItemsError;
  }

  // Delete all combo_meal_items (if exists)
  console.log('  Deleting combo_meal_items...');
  await supabase
    .from('combo_meal_items')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  // Delete all combo_meals (if exists)
  console.log('  Deleting combo_meals...');
  await supabase
    .from('combo_meals')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  // Now delete all offers
  console.log('  Deleting offers...');
  const { error: deleteOffersError } = await supabase
    .from('offers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteOffersError) {
    console.error('  Error deleting offers:', deleteOffersError);
    throw deleteOffersError;
  }

  console.log('✅ All test offers and related data deleted\n');
}

async function createRealOffers() {
  console.log('🎯 Creating real-world offers...\n');

  const offers = [
    // 1. Happy Hour Discount (Time-based)
    {
      name: 'Happy Hour - 20% Off',
      description: 'Get 20% off on all orders during happy hour!',
      offer_type: 'time_based',
      application_type: 'session_level',
      target_customer_type: 'all',
      is_active: true,
      priority: 10,
      valid_hours_start: '16:00:00',
      valid_hours_end: '19:00:00',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      benefits: {
        discount_percentage: 20,
        max_discount_amount: 200
      },
      conditions: {
        min_amount: 200
      }
    },

    // 2. Weekend Special (Cart percentage)
    {
      name: 'Weekend Bonanza - 15% Off',
      description: 'Enjoy 15% discount on all orders this weekend!',
      offer_type: 'cart_percentage',
      application_type: 'session_level',
      target_customer_type: 'all',
      is_active: true,
      priority: 9,
      valid_days: ['saturday', 'sunday'],
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      benefits: {
        discount_percentage: 15,
        max_discount_amount: 300
      },
      conditions: {
        min_amount: 300
      }
    },

    // 3. First Order Discount (Customer-based)
    {
      name: 'Welcome Offer - ₹150 Off',
      description: 'First time here? Get ₹150 off on your first order!',
      offer_type: 'customer_based',
      application_type: 'session_level',
      target_customer_type: 'first_time',
      is_active: true,
      priority: 10,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      benefits: {
        discount_amount: 150
      },
      conditions: {
        min_amount: 400
      }
    },

    // 4. Large Order Discount (Min order discount)
    {
      name: 'Big Order Bonus - ₹200 Off',
      description: 'Order above ₹1000 and save ₹200!',
      offer_type: 'min_order_discount',
      application_type: 'session_level',
      target_customer_type: 'all',
      is_active: true,
      priority: 8,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      benefits: {
        discount_amount: 200
      },
      conditions: {
        threshold_amount: 1000
      }
    },

    // 5. Loyalty Reward (Customer-based)
    {
      name: 'Loyalty Reward - 25% Off',
      description: 'Thank you for being a loyal customer! Get 25% off',
      offer_type: 'customer_based',
      application_type: 'session_level',
      target_customer_type: 'loyalty',
      is_active: true,
      priority: 9,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      benefits: {
        discount_percentage: 25,
        max_discount_amount: 400
      },
      conditions: {
        min_amount: 500,
        min_orders_count: 5
      }
    },

    // 6. Flat Discount (Cart flat amount)
    {
      name: 'Flat ₹100 Off',
      description: 'Get flat ₹100 discount on orders above ₹500',
      offer_type: 'cart_flat_amount',
      application_type: 'session_level',
      target_customer_type: 'all',
      is_active: true,
      priority: 7,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      benefits: {
        discount_amount: 100
      },
      conditions: {
        min_amount: 500
      }
    },

    // 7. Promo Code Offer
    {
      name: 'SAVE10 - 10% Off',
      description: 'Use code SAVE10 to get 10% off on your order',
      offer_type: 'promo_code',
      application_type: 'session_level',
      target_customer_type: 'all',
      promo_code: 'SAVE10',
      is_active: true,
      priority: 6,
      start_date: '2025-01-01',
      end_date: '2025-03-31',
      benefits: {
        discount_percentage: 10,
        max_discount_amount: 150
      },
      conditions: {
        min_amount: 300
      },
      usage_limit: 1000
    },

    // 8. Early Bird Offer (Time-based)
    {
      name: 'Early Bird - ₹80 Off',
      description: 'Order early and save ₹80! Valid 11 AM - 2 PM',
      offer_type: 'time_based',
      application_type: 'session_level',
      target_customer_type: 'all',
      is_active: true,
      priority: 7,
      valid_hours_start: '11:00:00',
      valid_hours_end: '14:00:00',
      valid_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      benefits: {
        discount_amount: 80
      },
      conditions: {
        min_amount: 400
      }
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const offer of offers) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert(offer)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Created: ${offer.name}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create ${offer.name}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n📊 Summary: ${successCount} created, ${failCount} failed\n`);
}

async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('   REAL-WORLD OFFERS SETUP');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    await cleanupTestOffers();
    await createRealOffers();

    console.log('════════════════════════════════════════════════════════');
    console.log('✅ SETUP COMPLETE!');
    console.log('════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
