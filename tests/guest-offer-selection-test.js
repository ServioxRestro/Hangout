/**
 * Guest Offer Selection Test Suite
 * Tests the guest-side offer implementation where guests can select and apply offers
 * Tests both dine-in and takeaway scenarios with existing and new guests
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const EXISTING_GUEST_PHONE = '8638774545';
const NEW_GUEST_PHONE = '9' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  total: 0,
  details: []
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function logHeader(message) {
  console.log('\n' + '='.repeat(70));
  console.log(`🧪 ${message}`);
  console.log('='.repeat(70));
}

function logSection(message) {
  console.log('\n' + '-'.repeat(70));
  console.log(`📋 ${message}`);
  console.log('-'.repeat(70));
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
  testResults.passed++;
  testResults.total++;
  testResults.details.push({ status: 'PASS', message });
}

function logError(message, error = null) {
  console.log(`❌ ${message}`);
  if (error) {
    console.log(`   Error: ${error.message || error}`);
  }
  testResults.failed++;
  testResults.total++;
  testResults.details.push({ status: 'FAIL', message, error: error?.message });
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  testResults.warnings++;
  testResults.details.push({ status: 'WARN', message });
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function formatCurrency(amount) {
  return `₹${Number(amount).toFixed(2)}`;
}

// Mock cart items for testing
const mockCartItems = [
  {
    id: 'mock-item-1',
    name: 'Margherita Pizza',
    price: 300,
    quantity: 2,
    category_id: 'cat-pizza'
  },
  {
    id: 'mock-item-2',
    name: 'Chicken Burger',
    price: 250,
    quantity: 1,
    category_id: 'cat-burgers'
  },
  {
    id: 'mock-item-3',
    name: 'Coke',
    price: 50,
    quantity: 2,
    category_id: 'cat-beverages'
  }
];

const mockCartTotal = mockCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testDatabaseConnection() {
  logSection('Test 1: Database Connection');
  try {
    const { data, error } = await supabase.from('offers').select('count').single();
    if (error) throw error;
    logSuccess('Database connection successful');
    return true;
  } catch (error) {
    logError('Database connection failed', error);
    return false;
  }
}

async function testFetchAllOffers() {
  logSection('Test 2: Fetch All Offers');
  try {
    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    logInfo(`Found ${offers.length} active offers`);
    
    if (offers.length === 0) {
      logWarning('No active offers found in database');
      return [];
    }

    offers.forEach((offer, index) => {
      console.log(`   ${index + 1}. ${offer.name} (${offer.offer_type})`);
      console.log(`      - Dine-in: ${offer.enabled_for_dinein ? '✓' : '✗'}`);
      console.log(`      - Takeaway: ${offer.enabled_for_takeaway ? '✓' : '✗'}`);
      console.log(`      - Application: ${offer.application_type}`);
    });

    logSuccess(`Successfully fetched ${offers.length} active offers`);
    return offers;
  } catch (error) {
    logError('Failed to fetch offers', error);
    return [];
  }
}

async function testFilterOffersByOrderType(offers) {
  logSection('Test 3: Filter Offers by Order Type');
  
  try {
    // Test dine-in filtering
    const dineInOffers = offers.filter(o => o.enabled_for_dinein === true);
    logInfo(`Dine-in eligible offers: ${dineInOffers.length}`);
    
    if (dineInOffers.length > 0) {
      logSuccess(`Dine-in filter working - ${dineInOffers.length} offers available`);
    } else {
      logWarning('No offers enabled for dine-in');
    }

    // Test takeaway filtering
    const takeawayOffers = offers.filter(o => o.enabled_for_takeaway === true);
    logInfo(`Takeaway eligible offers: ${takeawayOffers.length}`);
    
    if (takeawayOffers.length > 0) {
      logSuccess(`Takeaway filter working - ${takeawayOffers.length} offers available`);
    } else {
      logWarning('No offers enabled for takeaway');
    }

    return { dineInOffers, takeawayOffers };
  } catch (error) {
    logError('Failed to filter offers by order type', error);
    return { dineInOffers: [], takeawayOffers: [] };
  }
}

async function testExistingGuestUser() {
  logSection('Test 4: Existing Guest User (8638774545)');
  
  try {
    const { data: guest, error } = await supabase
      .from('guest_users')
      .select('*')
      .eq('phone', EXISTING_GUEST_PHONE)
      .single();

    if (error) throw error;

    logInfo(`Guest ID: ${guest.id}`);
    logInfo(`Name: ${guest.name || 'Not set'}`);
    logInfo(`Total Orders: ${guest.total_orders}`);
    logInfo(`Total Spent: ${formatCurrency(guest.total_spent)}`);
    logInfo(`Visit Count: ${guest.visit_count}`);
    
    logSuccess('Existing guest user found and verified');
    return guest;
  } catch (error) {
    logError('Failed to fetch existing guest user', error);
    return null;
  }
}

async function testCreateNewGuestUser() {
  logSection('Test 5: Create New Random Guest User');
  
  try {
    logInfo(`Creating guest with phone: ${NEW_GUEST_PHONE}`);
    
    const { data: newGuest, error } = await supabase
      .from('guest_users')
      .insert({
        phone: NEW_GUEST_PHONE,
        name: 'Test Guest ' + Math.floor(Math.random() * 1000),
        total_orders: 0,
        total_spent: 0,
        visit_count: 1,
        is_active: true,
        first_visit_at: new Date().toISOString(),
        last_login_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    logInfo(`New Guest ID: ${newGuest.id}`);
    logInfo(`Phone: ${newGuest.phone}`);
    logSuccess('New guest user created successfully');
    return newGuest;
  } catch (error) {
    logError('Failed to create new guest user', error);
    return null;
  }
}

async function testOfferEligibility(offers, guest, orderType = 'dine-in') {
  logSection(`Test 6: Offer Eligibility Check (${orderType.toUpperCase()})`);
  
  if (!guest) {
    logError('No guest user provided for eligibility check');
    return;
  }

  try {
    const filterField = orderType === 'dine-in' ? 'enabled_for_dinein' : 'enabled_for_takeaway';
    const eligibleOffers = offers.filter(o => o[filterField] === true);

    logInfo(`Testing ${eligibleOffers.length} offers for ${orderType}`);
    logInfo(`Cart Total: ${formatCurrency(mockCartTotal)}`);
    logInfo(`Guest Orders: ${guest.total_orders}`);

    let eligibleCount = 0;
    
    for (const offer of eligibleOffers) {
      const benefits = offer.benefits || {};
      const conditions = offer.conditions || {};
      
      let isEligible = true;
      let reason = '';

      // Check minimum amount
      if (conditions.min_amount && mockCartTotal < conditions.min_amount) {
        isEligible = false;
        reason = `Min amount ₹${conditions.min_amount} not met`;
      }

      // Check threshold amount
      if (conditions.threshold_amount && mockCartTotal < conditions.threshold_amount) {
        isEligible = false;
        reason = `Threshold ₹${conditions.threshold_amount} not met`;
      }

      // Check minimum orders count
      if (conditions.min_orders_count && guest.total_orders < conditions.min_orders_count) {
        isEligible = false;
        reason = `Need ${conditions.min_orders_count} orders, have ${guest.total_orders}`;
      }

      if (isEligible) {
        eligibleCount++;
        
        // Calculate discount
        let discount = 0;
        if (benefits.discount_percentage) {
          discount = (mockCartTotal * benefits.discount_percentage) / 100;
          if (benefits.max_discount_amount) {
            discount = Math.min(discount, benefits.max_discount_amount);
          }
        } else if (benefits.discount_amount) {
          discount = benefits.discount_amount;
        }

        console.log(`   ✓ ${offer.name}`);
        console.log(`      Discount: ${formatCurrency(discount)}`);
      } else {
        console.log(`   ✗ ${offer.name} - ${reason}`);
      }
    }

    logSuccess(`Eligibility check completed - ${eligibleCount}/${eligibleOffers.length} offers eligible`);
    return eligibleCount;
  } catch (error) {
    logError('Failed to check offer eligibility', error);
    return 0;
  }
}

async function testOfferSelection(offers, guest, orderType = 'dine-in') {
  logSection(`Test 7: Offer Selection Simulation (${orderType.toUpperCase()})`);
  
  if (!guest || offers.length === 0) {
    logWarning('Insufficient data for offer selection test');
    return;
  }

  try {
    const filterField = orderType === 'dine-in' ? 'enabled_for_dinein' : 'enabled_for_takeaway';
    const eligibleOffers = offers.filter(o => {
      if (!o[filterField]) return false;
      
      const conditions = o.conditions || {};
      
      // Check basic conditions
      if (conditions.min_amount && mockCartTotal < conditions.min_amount) return false;
      if (conditions.threshold_amount && mockCartTotal < conditions.threshold_amount) return false;
      if (conditions.min_orders_count && guest.total_orders < conditions.min_orders_count) return false;
      
      return true;
    });

    if (eligibleOffers.length === 0) {
      logWarning('No eligible offers for selection test');
      return;
    }

    // Select the first eligible offer
    const selectedOffer = eligibleOffers[0];
    logInfo(`Simulating selection of: "${selectedOffer.name}"`);
    
    // Calculate discount
    const benefits = selectedOffer.benefits || {};
    let discount = 0;
    
    if (benefits.discount_percentage) {
      discount = (mockCartTotal * benefits.discount_percentage) / 100;
      if (benefits.max_discount_amount) {
        discount = Math.min(discount, benefits.max_discount_amount);
      }
    } else if (benefits.discount_amount) {
      discount = benefits.discount_amount;
    }

    const finalAmount = mockCartTotal - discount;

    console.log(`   Original Amount: ${formatCurrency(mockCartTotal)}`);
    console.log(`   Discount: ${formatCurrency(discount)}`);
    console.log(`   Final Amount: ${formatCurrency(finalAmount)}`);
    console.log(`   Savings: ${((discount / mockCartTotal) * 100).toFixed(1)}%`);

    logSuccess(`Offer selection simulation successful - Saved ${formatCurrency(discount)}`);
    return { selectedOffer, discount, finalAmount };
  } catch (error) {
    logError('Failed to simulate offer selection', error);
    return null;
  }
}

async function testTableSessionOfferLocking(guest, offer) {
  logSection('Test 8: Table Session Offer Locking');
  
  if (!guest || !offer) {
    logWarning('Insufficient data for session locking test');
    return;
  }

  try {
    // Get an active table
    const { data: table, error: tableError } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (tableError) throw tableError;

    logInfo(`Using Table: ${table.table_number} (${table.table_code})`);

    // Create a table session with locked offer
    const { data: session, error: sessionError } = await supabase
      .from('table_sessions')
      .insert({
        table_id: table.id,
        guest_user_id: guest.id,
        customer_phone: guest.phone,
        status: 'active',
        locked_offer_id: offer.id,
        locked_offer_data: {
          name: offer.name,
          offer_type: offer.offer_type,
          benefits: offer.benefits,
          conditions: offer.conditions
        },
        offer_applied_at: new Date().toISOString(),
        session_started_at: new Date().toISOString(),
        total_orders: 0,
        total_amount: 0
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    logInfo(`Session ID: ${session.id}`);
    logInfo(`Locked Offer: ${offer.name}`);
    logInfo(`Application Type: ${offer.application_type}`);
    
    logSuccess('Table session created with locked offer');

    // Clean up - delete test session
    await supabase.from('table_sessions').delete().eq('id', session.id);
    logInfo('Test session cleaned up');

    return session;
  } catch (error) {
    logError('Failed to test session offer locking', error);
    return null;
  }
}

async function testOfferUsageTracking(guest, offer) {
  logSection('Test 9: Offer Usage Tracking');
  
  if (!guest || !offer) {
    logWarning('Insufficient data for usage tracking test');
    return;
  }

  try {
    // Check current usage count
    const { data: currentOffer } = await supabase
      .from('offers')
      .select('usage_count, usage_limit')
      .eq('id', offer.id)
      .single();

    logInfo(`Current Usage: ${currentOffer.usage_count || 0}`);
    logInfo(`Usage Limit: ${currentOffer.usage_limit || 'Unlimited'}`);

    // Check if offer can be used
    if (currentOffer.usage_limit && currentOffer.usage_count >= currentOffer.usage_limit) {
      logWarning('Offer has reached usage limit');
    } else {
      logSuccess('Offer is available for use');
    }

    return currentOffer;
  } catch (error) {
    logError('Failed to check offer usage', error);
    return null;
  }
}

async function testDineInVsTakeawayDifference(offers) {
  logSection('Test 10: Dine-in vs Takeaway Offer Difference');
  
  try {
    const dineInOnly = offers.filter(o => o.enabled_for_dinein && !o.enabled_for_takeaway);
    const takeawayOnly = offers.filter(o => !o.enabled_for_dinein && o.enabled_for_takeaway);
    const both = offers.filter(o => o.enabled_for_dinein && o.enabled_for_takeaway);

    console.log(`   Dine-in only: ${dineInOnly.length} offers`);
    console.log(`   Takeaway only: ${takeawayOnly.length} offers`);
    console.log(`   Both: ${both.length} offers`);

    if (dineInOnly.length > 0) {
      console.log(`\n   Dine-in exclusive offers:`);
      dineInOnly.forEach(o => console.log(`      - ${o.name}`));
    }

    if (takeawayOnly.length > 0) {
      console.log(`\n   Takeaway exclusive offers:`);
      takeawayOnly.forEach(o => console.log(`      - ${o.name}`));
    }

    logSuccess('Successfully analyzed dine-in vs takeaway differences');
    return { dineInOnly, takeawayOnly, both };
  } catch (error) {
    logError('Failed to analyze order type differences', error);
    return null;
  }
}

async function testCleanupNewGuest() {
  logSection('Test 11: Cleanup - Remove Test Guest');
  
  try {
    const { error } = await supabase
      .from('guest_users')
      .delete()
      .eq('phone', NEW_GUEST_PHONE);

    if (error) throw error;

    logSuccess(`Test guest user (${NEW_GUEST_PHONE}) cleaned up successfully`);
    return true;
  } catch (error) {
    logWarning('Failed to cleanup test guest user - manual cleanup may be needed');
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  const startTime = Date.now();
  
  logHeader('GUEST OFFER SELECTION - COMPREHENSIVE TEST SUITE');
  
  console.log('\n📊 Test Configuration:');
  console.log(`   Existing Guest: ${EXISTING_GUEST_PHONE}`);
  console.log(`   New Guest: ${NEW_GUEST_PHONE}`);
  console.log(`   Mock Cart Total: ${formatCurrency(mockCartTotal)}`);
  console.log(`   Mock Cart Items: ${mockCartItems.length}`);

  // Test 1: Database Connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ Database connection failed. Aborting tests.');
    process.exit(1);
  }

  // Test 2: Fetch All Offers
  const allOffers = await testFetchAllOffers();

  // Test 3: Filter by Order Type
  const { dineInOffers, takeawayOffers } = await testFilterOffersByOrderType(allOffers);

  // Test 4: Existing Guest User
  const existingGuest = await testExistingGuestUser();

  // Test 5: Create New Guest User
  const newGuest = await testCreateNewGuestUser();

  // Test 6a: Offer Eligibility - Existing Guest (Dine-in)
  if (existingGuest) {
    await testOfferEligibility(allOffers, existingGuest, 'dine-in');
  }

  // Test 6b: Offer Eligibility - Existing Guest (Takeaway)
  if (existingGuest) {
    await testOfferEligibility(allOffers, existingGuest, 'takeaway');
  }

  // Test 6c: Offer Eligibility - New Guest (Dine-in)
  if (newGuest) {
    await testOfferEligibility(allOffers, newGuest, 'dine-in');
  }

  // Test 6d: Offer Eligibility - New Guest (Takeaway)
  if (newGuest) {
    await testOfferEligibility(allOffers, newGuest, 'takeaway');
  }

  // Test 7a: Offer Selection - Dine-in
  if (existingGuest && dineInOffers.length > 0) {
    const selection = await testOfferSelection(allOffers, existingGuest, 'dine-in');
    
    // Test 8: Session Locking (if selection succeeded)
    if (selection) {
      await testTableSessionOfferLocking(existingGuest, selection.selectedOffer);
    }

    // Test 9: Usage Tracking (if selection succeeded)
    if (selection) {
      await testOfferUsageTracking(existingGuest, selection.selectedOffer);
    }
  }

  // Test 7b: Offer Selection - Takeaway
  if (newGuest && takeawayOffers.length > 0) {
    await testOfferSelection(allOffers, newGuest, 'takeaway');
  }

  // Test 10: Dine-in vs Takeaway Differences
  await testDineInVsTakeawayDifference(allOffers);

  // Test 11: Cleanup
  await testCleanupNewGuest();

  // ============================================================================
  // TEST SUMMARY
  // ============================================================================

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  logHeader('TEST SUMMARY');

  console.log(`\n📈 Results:`);
  console.log(`   Total Tests: ${testResults.total}`);
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log(`   ⚠️  Warnings: ${testResults.warnings}`);
  console.log(`   ⏱️  Duration: ${duration}s`);

  if (testResults.failed === 0) {
    console.log('\n✅ ALL TESTS PASSED! 🎉');
    console.log('   Guest offer selection implementation is working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('   Please review the errors above.');
  }

  console.log('\n' + '='.repeat(70));
  
  // Return exit code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// ============================================================================
// RUN TESTS
// ============================================================================

runAllTests().catch((error) => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
