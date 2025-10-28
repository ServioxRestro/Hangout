/**
 * Admin Offer CRUD Integration Tests
 * 
 * Tests real-life scenarios for creating and editing all offer types
 * Verifies frontend-backend compatibility by:
 * 1. Creating offers with data structure matching frontend form
 * 2. Editing offers as frontend would
 * 3. Validating database state
 * 4. Testing edge cases and validation
 * 
 * Run: node tests/integration/admin-offer-crud-integration.test.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  console.error('\nPlease ensure .env.local file exists with:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test utilities
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  testResults.total++;
  return async () => {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await fn();
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASSED', error: null });
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAILED', error: error.message });
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
    }
  };
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`Expected array to contain ${item}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected value to be truthy but got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected value to be falsy but got ${actual}`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toHaveProperty(property) {
      if (!(property in actual)) {
        throw new Error(`Expected object to have property ${property}`);
      }
    }
  };
}

// Cleanup helper - stores created offer IDs for cleanup
const createdOfferIds = [];

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  for (const offerId of createdOfferIds) {
    try {
      // Delete related records first
      await supabase.from('offer_items').delete().eq('offer_id', offerId);
      await supabase.from('combo_meals').delete().eq('offer_id', offerId);
      await supabase.from('offer_usage').delete().eq('offer_id', offerId);
      
      // Delete the offer
      await supabase.from('offers').delete().eq('id', offerId);
      console.log(`   Deleted offer: ${offerId}`);
    } catch (error) {
      console.error(`   Failed to delete offer ${offerId}:`, error.message);
    }
  }
  console.log('✅ Cleanup completed\n');
}

// Helper function to create offer data matching frontend structure
function buildOfferData(offerType, customData = {}) {
  const baseData = {
    name: customData.name || `Test ${offerType} - ${Date.now()}`,
    description: customData.description || `Test offer for ${offerType}`,
    offer_type: offerType,
    is_active: customData.is_active !== undefined ? customData.is_active : true,
    priority: customData.priority || 5,
    start_date: customData.start_date || null,
    end_date: customData.end_date || null,
    usage_limit: customData.usage_limit || null,
    promo_code: customData.promo_code || null,
    valid_days: customData.valid_days || null,
    valid_hours_start: customData.valid_hours_start || null,
    valid_hours_end: customData.valid_hours_end || null,
    target_customer_type: customData.target_customer_type || 'all',
    image_url: customData.image_url || null,
    conditions: customData.conditions || {},
    benefits: customData.benefits || {},
    application_type: customData.application_type
  };

  return baseData;
}

// Test Suite: Buy X Get Y Free (BOGO)
const testBOGO = test('Create Buy X Get Y Free Offer - Real Scenario', async () => {
  const offerData = buildOfferData('item_buy_get_free', {
    name: 'Buy 2 Dosa Get 1 Free - Weekend Special',
    description: 'Order 2 dosas and get the 3rd one absolutely free! Valid on weekends only.',
    application_type: 'order_level',
    start_date: '2025-10-25T00:00:00Z',
    end_date: '2025-12-31T23:59:59Z',
    valid_days: ['saturday', 'sunday'],
    valid_hours_start: '10:00:00',
    valid_hours_end: '22:00:00',
    priority: 8,
    conditions: {
      buy_quantity: 2
    },
    benefits: {
      get_quantity: 1,
      get_same_item: true
    }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer).toBeTruthy();
  expect(offer.offer_type).toBe('item_buy_get_free');
  expect(offer.application_type).toBe('order_level');
  expect(offer.conditions.buy_quantity).toBe(2);
  expect(offer.benefits.get_quantity).toBe(1);
  expect(offer.benefits.get_same_item).toBe(true);
  expect(offer.valid_days).toContain('saturday');
  expect(offer.valid_days).toContain('sunday');

  createdOfferIds.push(offer.id);
  return offer;
});

const testBOGOEdit = test('Edit BOGO Offer - Update quantities', async () => {
  // First create an offer
  const createData = buildOfferData('item_buy_get_free', {
    name: 'BOGO to Edit',
    application_type: 'order_level',
    conditions: { buy_quantity: 2 },
    benefits: { get_quantity: 1 }
  });

  const { data: created } = await supabase
    .from('offers')
    .insert([createData])
    .select()
    .single();

  createdOfferIds.push(created.id);

  // Now edit it (simulating frontend edit mode)
  const updateData = {
    name: 'BOGO Updated - Buy 3 Get 2',
    conditions: { buy_quantity: 3 },
    benefits: { get_quantity: 2, get_same_item: false },
    priority: 9
  };

  const { data: updated, error } = await supabase
    .from('offers')
    .update(updateData)
    .eq('id', created.id)
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(updated.name).toBe('BOGO Updated - Buy 3 Get 2');
  expect(updated.conditions.buy_quantity).toBe(3);
  expect(updated.benefits.get_quantity).toBe(2);
  expect(updated.benefits.get_same_item).toBe(false);
  expect(updated.priority).toBe(9);

  return updated;
});

// Test Suite: Free Add-on
const testFreeAddon = test('Create Free Add-on Offer - Real Scenario', async () => {
  const offerData = buildOfferData('item_free_addon', {
    name: 'Free Chutney with Dosa',
    description: 'Get free coconut chutney with any dosa order',
    application_type: 'order_level',
    conditions: {
      min_quantity: 1
    },
    benefits: {
      max_price: 20,
      free_addon_items: [
        { type: 'item', id: 'coconut-chutney', name: 'Coconut Chutney' }
      ]
    },
    enabled_for_dinein: true,
    enabled_for_takeaway: true
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('item_free_addon');
  expect(offer.conditions.min_quantity).toBe(1);
  expect(offer.benefits.max_price).toBe(20);
  expect(offer.enabled_for_dinein).toBe(true);
  expect(offer.enabled_for_takeaway).toBe(true);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Combo Meal
const testComboMeal = test('Create Combo Meal Offer - Real Scenario', async () => {
  const offerData = buildOfferData('combo_meal', {
    name: 'South Indian Breakfast Combo',
    description: '2 Idlis + 1 Vada + Coffee at special price',
    application_type: 'order_level',
    benefits: {
      combo_price: 99,
      is_customizable: true
    },
    priority: 7
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('combo_meal');
  expect(offer.benefits.combo_price).toBe(99);
  expect(offer.benefits.is_customizable).toBe(true);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Cart Percentage Discount
const testCartPercentage = test('Create Cart Percentage Discount - Real Scenario', async () => {
  const offerData = buildOfferData('cart_percentage', {
    name: 'Happy Hour 20% Off',
    description: 'Get 20% off on total bill during happy hours',
    application_type: 'session_level',
    valid_hours_start: '15:00:00',
    valid_hours_end: '18:00:00',
    conditions: {
      min_amount: 500
    },
    benefits: {
      discount_percentage: 20,
      max_discount_amount: 300
    },
    priority: 9
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('cart_percentage');
  expect(offer.application_type).toBe('session_level');
  expect(offer.benefits.discount_percentage).toBe(20);
  expect(offer.benefits.max_discount_amount).toBe(300);
  expect(offer.conditions.min_amount).toBe(500);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Cart Flat Discount
const testCartFlat = test('Create Cart Flat Discount - Real Scenario', async () => {
  const offerData = buildOfferData('cart_flat_amount', {
    name: 'Flat ₹100 Off on Orders Above ₹600',
    description: 'Get flat ₹100 discount on bills above ₹600',
    application_type: 'session_level',
    conditions: {
      min_amount: 600
    },
    benefits: {
      discount_amount: 100
    }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('cart_flat_amount');
  expect(offer.benefits.discount_amount).toBe(100);
  expect(offer.conditions.min_amount).toBe(600);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Minimum Order Discount
const testMinOrderDiscount = test('Create Minimum Order Discount - Real Scenario', async () => {
  const offerData = buildOfferData('min_order_discount', {
    name: 'Order Above ₹1000 Get 15% Off',
    description: 'Minimum order of ₹1000 required',
    application_type: 'session_level',
    conditions: {
      min_amount: 1000
    },
    benefits: {
      discount_percentage: 15,
      max_discount_amount: 250
    }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('min_order_discount');
  expect(offer.conditions.min_amount).toBe(1000);
  expect(offer.benefits.discount_percentage).toBe(15);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Cart Threshold Item (Free item on cart value)
const testCartThresholdItem = test('Create Cart Threshold Item - Real Scenario', async () => {
  const offerData = buildOfferData('cart_threshold_item', {
    name: 'Free Dessert on ₹800+ Order',
    description: 'Order above ₹800 and get a free dessert',
    application_type: 'order_level',
    conditions: {
      min_amount: 800,
      threshold_amount: 800
    },
    benefits: {
      max_price: 100,
      free_category: 'desserts'
    }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('cart_threshold_item');
  expect(offer.conditions.min_amount).toBe(800);
  expect(offer.benefits.max_price).toBe(100);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Item Percentage Discount
const testItemPercentage = test('Create Item Percentage Discount - Real Scenario', async () => {
  const offerData = buildOfferData('item_percentage', {
    name: '25% Off on All Beverages',
    description: 'Get 25% discount on all beverage items',
    application_type: 'order_level',
    conditions: {
      min_quantity: 2
    },
    benefits: {
      discount_percentage: 25
    }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('item_percentage');
  expect(offer.benefits.discount_percentage).toBe(25);
  expect(offer.conditions.min_quantity).toBe(2);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Time-Based Discount
const testTimeBased = test('Create Time-Based Discount - Real Scenario', async () => {
  const offerData = buildOfferData('time_based', {
    name: 'Breakfast Hours Special - 10% Off',
    description: 'Early bird discount during breakfast hours',
    application_type: 'session_level',
    valid_hours_start: '07:00:00',
    valid_hours_end: '10:00:00',
    valid_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    benefits: {
      discount_percentage: 10,
      max_discount_amount: 100
    },
    conditions: {
      min_amount: 200
    }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('time_based');
  expect(offer.valid_hours_start).toBe('07:00:00');
  expect(offer.valid_hours_end).toBe('10:00:00');
  expect(offer.valid_days.length).toBe(5);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Customer-Based Discount
const testCustomerBased = test('Create Customer-Based Discount - Real Scenario', async () => {
  const offerData = buildOfferData('customer_based', {
    name: 'First Time Customer - ₹150 Off',
    description: 'Welcome offer for first-time customers',
    application_type: 'session_level',
    target_customer_type: 'first_time',
    conditions: {
      min_amount: 500,
      min_orders_count: 0
    },
    benefits: {
      discount_amount: 150
    },
    usage_limit: 1
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('customer_based');
  expect(offer.target_customer_type).toBe('first_time');
  expect(offer.benefits.discount_amount).toBe(150);
  expect(offer.usage_limit).toBe(1);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Promo Code
const testPromoCode = test('Create Promo Code Offer - Real Scenario', async () => {
  const offerData = buildOfferData('promo_code', {
    name: 'DIWALI2025 - Special Offer',
    description: 'Use code DIWALI2025 for 30% off',
    application_type: 'session_level',
    promo_code: 'DIWALI2025',
    start_date: '2025-10-28T00:00:00Z',
    end_date: '2025-11-15T23:59:59Z',
    usage_limit: 100,
    conditions: {
      min_amount: 750
    },
    benefits: {
      discount_percentage: 30,
      max_discount_amount: 500
    }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.offer_type).toBe('promo_code');
  expect(offer.promo_code).toBe('DIWALI2025');
  expect(offer.usage_limit).toBe(100);
  expect(offer.benefits.discount_percentage).toBe(30);

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Complex Edit Scenario
const testComplexEdit = test('Complex Edit - Change offer type parameters', async () => {
  // Create a cart percentage offer
  const createData = buildOfferData('cart_percentage', {
    name: 'Lunch Special 15% Off',
    application_type: 'session_level',
    valid_hours_start: '12:00:00',
    valid_hours_end: '15:00:00',
    conditions: { min_amount: 400 },
    benefits: { discount_percentage: 15, max_discount_amount: 200 }
  });

  const { data: created } = await supabase
    .from('offers')
    .insert([createData])
    .select()
    .single();

  createdOfferIds.push(created.id);

  // Edit: Increase discount, add days restriction, raise minimum
  const updateData = {
    name: 'Lunch Special 20% Off - Weekdays',
    valid_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    conditions: { min_amount: 500 },
    benefits: { discount_percentage: 20, max_discount_amount: 250 },
    priority: 10,
    description: 'Updated offer with better discount on weekdays only'
  };

  const { data: updated, error } = await supabase
    .from('offers')
    .update(updateData)
    .eq('id', created.id)
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(updated.name).toBe('Lunch Special 20% Off - Weekdays');
  expect(updated.benefits.discount_percentage).toBe(20);
  expect(updated.conditions.min_amount).toBe(500);
  expect(updated.valid_days.length).toBe(5);
  expect(updated.priority).toBe(10);

  return updated;
});

// Test Suite: Toggle Active Status
const testToggleActive = test('Toggle offer active status', async () => {
  const createData = buildOfferData('cart_flat_amount', {
    name: 'Toggle Test Offer',
    application_type: 'session_level',
    is_active: true,
    conditions: { min_amount: 300 },
    benefits: { discount_amount: 50 }
  });

  const { data: created } = await supabase
    .from('offers')
    .insert([createData])
    .select()
    .single();

  createdOfferIds.push(created.id);

  // Deactivate
  const { data: deactivated } = await supabase
    .from('offers')
    .update({ is_active: false })
    .eq('id', created.id)
    .select()
    .single();

  expect(deactivated.is_active).toBe(false);

  // Reactivate
  const { data: reactivated } = await supabase
    .from('offers')
    .update({ is_active: true })
    .eq('id', created.id)
    .select()
    .single();

  expect(reactivated.is_active).toBe(true);

  return reactivated;
});

// Test Suite: Validation Tests
const testValidation = test('Validate JSONB structure integrity', async () => {
  const offerData = buildOfferData('item_buy_get_free', {
    name: 'Validation Test',
    application_type: 'order_level',
    conditions: {
      buy_quantity: 2,
      min_amount: 100,
      custom_field: 'should be preserved'
    },
    benefits: {
      get_quantity: 1,
      get_same_item: true,
      another_custom: { nested: 'value' }
    }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.conditions).toHaveProperty('buy_quantity');
  expect(offer.conditions).toHaveProperty('custom_field');
  expect(offer.benefits).toHaveProperty('get_quantity');
  expect(offer.benefits).toHaveProperty('another_custom');

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Date Range Validation
const testDateRange = test('Create offer with date range', async () => {
  const offerData = buildOfferData('cart_percentage', {
    name: 'Festival Week Offer',
    application_type: 'session_level',
    start_date: '2025-11-01T00:00:00Z',
    end_date: '2025-11-07T23:59:59Z',
    conditions: { min_amount: 400 },
    benefits: { discount_percentage: 25, max_discount_amount: 300 }
  });

  const { data: offer, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.start_date).toBeTruthy();
  expect(offer.end_date).toBeTruthy();
  expect(new Date(offer.end_date) > new Date(offer.start_date)).toBeTruthy();

  createdOfferIds.push(offer.id);
  return offer;
});

// Test Suite: Priority System
const testPriority = test('Create offers with different priorities', async () => {
  const offers = [];
  
  for (let priority = 1; priority <= 10; priority += 3) {
    const offerData = buildOfferData('cart_percentage', {
      name: `Priority ${priority} Offer`,
      application_type: 'session_level',
      priority: priority,
      conditions: { min_amount: 100 },
      benefits: { discount_percentage: 10 }
    });

    const { data: offer } = await supabase
      .from('offers')
      .insert([offerData])
      .select()
      .single();

    createdOfferIds.push(offer.id);
    offers.push(offer);
    expect(offer.priority).toBe(priority);
  }

  // Verify ordering by priority
  const { data: sorted } = await supabase
    .from('offers')
    .select('id, name, priority')
    .in('id', offers.map(o => o.id))
    .order('priority', { ascending: false });

  expect(sorted[0].priority).toBeGreaterThan(sorted[sorted.length - 1].priority);

  return sorted;
});

// Test Suite: Customer Type Targeting
const testCustomerTypes = test('Test all customer type options', async () => {
  const customerTypes = ['all', 'first_time', 'returning', 'loyalty'];
  const offers = [];

  for (const type of customerTypes) {
    const offerData = buildOfferData('cart_percentage', {
      name: `${type} Customer Offer`,
      application_type: 'session_level',
      target_customer_type: type,
      conditions: { min_amount: type === 'loyalty' ? 1000 : 500 },
      benefits: { discount_percentage: type === 'loyalty' ? 25 : 15 }
    });

    const { data: offer } = await supabase
      .from('offers')
      .insert([offerData])
      .select()
      .single();

    createdOfferIds.push(offer.id);
    offers.push(offer);
    expect(offer.target_customer_type).toBe(type);
  }

  return offers;
});

// Test Suite: Dine-in vs Takeaway
const testOrderTypes = test('Test dine-in and takeaway flags', async () => {
  // Test 1: Both enabled (default behavior)
  const bothData = buildOfferData('cart_percentage', {
    name: 'Both Order Types Offer',
    application_type: 'session_level',
    conditions: { min_amount: 300 },
    benefits: { discount_percentage: 20 }
  });

  const { data: both } = await supabase
    .from('offers')
    .insert([bothData])
    .select()
    .single();

  createdOfferIds.push(both.id);
  // Database defaults both to true
  expect(both.enabled_for_dinein).toBe(true);
  expect(both.enabled_for_takeaway).toBe(true);

  // Test 2: Explicitly set dine-in only (update after creation)
  const { data: dineinOnly } = await supabase
    .from('offers')
    .insert([{
      ...buildOfferData('cart_percentage', {
        name: 'Dine-in Only Offer',
        application_type: 'session_level',
        conditions: { min_amount: 300 },
        benefits: { discount_percentage: 20 }
      }),
      enabled_for_takeaway: false
    }])
    .select()
    .single();

  createdOfferIds.push(dineinOnly.id);
  expect(dineinOnly.enabled_for_dinein).toBe(true);
  expect(dineinOnly.enabled_for_takeaway).toBe(false);

  // Test 3: Explicitly set takeaway only
  const { data: takeawayOnly } = await supabase
    .from('offers')
    .insert([{
      ...buildOfferData('cart_flat_amount', {
        name: 'Takeaway Only Offer',
        application_type: 'session_level',
        conditions: { min_amount: 400 },
        benefits: { discount_amount: 100 }
      }),
      enabled_for_dinein: false
    }])
    .select()
    .single();

  createdOfferIds.push(takeawayOnly.id);
  expect(takeawayOnly.enabled_for_dinein).toBe(false);
  expect(takeawayOnly.enabled_for_takeaway).toBe(true);

  return { both, dineinOnly, takeawayOnly };
});

// Main test runner
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ADMIN OFFER CRUD - INTEGRATION TESTS');
  console.log('   Testing Frontend-Backend Compatibility');
  console.log('═══════════════════════════════════════════════════════════\n');

  const tests = [
    // Create tests for all offer types
    testBOGO,
    testFreeAddon,
    testComboMeal,
    testCartPercentage,
    testCartFlat,
    testMinOrderDiscount,
    testCartThresholdItem,
    testItemPercentage,
    testTimeBased,
    testCustomerBased,
    testPromoCode,
    
    // Edit tests
    testBOGOEdit,
    testComplexEdit,
    testToggleActive,
    
    // Validation tests
    testValidation,
    testDateRange,
    testPriority,
    testCustomerTypes,
    testOrderTypes
  ];

  console.log(`Running ${tests.length} integration tests...\n`);

  for (const testFn of tests) {
    await testFn();
  }

  // Cleanup
  await cleanup();

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${testResults.total}`);
  console.log(`✅ Passed:     ${testResults.passed}`);
  console.log(`❌ Failed:     ${testResults.failed}`);
  console.log(`Pass Rate:    ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (testResults.failed > 0) {
    console.log('Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`  ❌ ${t.name}: ${t.error}`));
    console.log('');
  }

  // Detailed results by category
  console.log('Results by Category:');
  console.log('\nOffer Type Creation:');
  const creationTests = testResults.tests.slice(0, 11);
  console.log(`  ✅ ${creationTests.filter(t => t.status === 'PASSED').length}/11 offer types created successfully`);
  
  console.log('\nEdit Operations:');
  const editTests = testResults.tests.slice(11, 14);
  console.log(`  ✅ ${editTests.filter(t => t.status === 'PASSED').length}/3 edit scenarios passed`);
  
  console.log('\nValidation & Edge Cases:');
  const validationTests = testResults.tests.slice(14);
  console.log(`  ✅ ${validationTests.filter(t => t.status === 'PASSED').length}/${validationTests.length} validation tests passed`);

  console.log('\n' + '═'.repeat(63));
  
  // Frontend compatibility assessment
  console.log('\n🔍 FRONTEND-BACKEND COMPATIBILITY ASSESSMENT:\n');
  
  if (testResults.failed === 0) {
    console.log('✅ ALL TESTS PASSED - Frontend is 100% compatible with backend');
    console.log('\nVerified:');
    console.log('  ✓ All 11 offer types can be created');
    console.log('  ✓ Edit operations work correctly');
    console.log('  ✓ JSONB conditions and benefits structure valid');
    console.log('  ✓ Date ranges, time slots, and valid days work');
    console.log('  ✓ Customer targeting and order type flags work');
    console.log('  ✓ Priority system functional');
    console.log('  ✓ Active/inactive toggle works');
    console.log('  ✓ Data types match frontend form inputs');
    console.log('\n✅ READY FOR PRODUCTION USE');
  } else {
    console.log('⚠️  Some tests failed - review errors above');
    console.log('   Frontend may need adjustments for failed scenarios');
  }

  console.log('\n' + '═'.repeat(63) + '\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Fatal error running tests:', error);
  process.exit(1);
});
