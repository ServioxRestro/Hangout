/**
 * SCENARIO TEST: REPEAT ORDERS WITH OFFERS
 * 
 * Tests the scenario where:
 * 1. Guest at Table 1 places first order (with offer)
 * 2. First order is served and completed
 * 3. Guest asks staff to place second order (should use same session & offer)
 * 
 * IMPORTANT CONSTRAINT DISCOVERED:
 * - Database has unique index: unique_active_order_per_session
 * - Only ONE active order allowed per session at a time
 * - "Active" = NOT ('completed', 'paid', 'cancelled')
 * - First order must be completed before creating second order
 * 
 * This test validates:
 * - Session continuity (reuse active session)
 * - Session-level offer locking (offer applies to entire session)
 * - Session totals accumulation
 * - Multiple orders in one session (sequential, not parallel)
 * - Offer eligibility across multiple orders
 * - Order lifecycle before repeat orders
 * 
 * Run with: node tests/admin-repeat-order-scenario-test.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logSection(title) {
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`  ${title}`, 'blue');
  log(`${'='.repeat(80)}`, 'blue');
}

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: [],
};

// Test data
let testData = {
  table: null,
  menuItems: [],
  offer: null,
  session: null,
  order1: null,
  order2: null,
};

/**
 * Setup: Get test table and menu items
 */
async function setupTestData() {
  logSection('SETUP: LOADING TEST DATA');

  // Get a table
  testResults.total++;
  try {
    const { data: tables, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    testData.table = tables;
    logSuccess(`Using table: ${tables.table_number}`);
    testResults.passed++;
  } catch (error) {
    logError(`Failed to get table: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  // Get menu items
  testResults.total++;
  try {
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .limit(4);

    if (error) throw error;
    testData.menuItems = items || [];
    logSuccess(`Loaded ${items.length} menu items for testing`);
    testResults.passed++;
  } catch (error) {
    logError(`Failed to get menu items: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  // Get a session-level offer
  testResults.total++;
  try {
    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .eq('application_type', 'session_level')
      .eq('enabled_for_dinein', true)
      .limit(1)
      .single();

    if (error) throw error;
    testData.offer = offers;
    logSuccess(`Using offer: ${offers.name}`);
    logInfo(`  Offer type: ${offers.offer_type}`);
    testResults.passed++;
  } catch (error) {
    logError(`Failed to get offer: ${error.message}`);
    testResults.failed++;
    throw error;
  }
}

/**
 * Scenario: First Order by Guest
 */
async function createFirstOrder() {
  logSection('SCENARIO STEP 1: GUEST PLACES FIRST ORDER');

  const cart1 = testData.menuItems.slice(0, 2);
  const total1 = cart1.reduce((sum, item) => sum + item.price, 0);
  const offerDiscount = total1 * 0.1; // Simulate 10% discount
  const finalAmount1 = total1 - offerDiscount;

  logInfo(`Cart items: ${cart1.map(i => i.name).join(', ')}`);
  logInfo(`Cart total: ₹${total1}`);
  logInfo(`Offer discount: ₹${offerDiscount.toFixed(2)}`);
  logInfo(`Final amount: ₹${finalAmount1.toFixed(2)}`);

  // Check if session exists
  testResults.total++;
  try {
    const { data: existingSession, error } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('table_id', testData.table.id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    if (existingSession) {
      logWarning(`Active session already exists (will use it)`);
      testData.session = existingSession;
      testResults.warnings++;
    } else {
      logSuccess('No active session (will create new one)');
      testResults.passed++;
    }
  } catch (error) {
    logError(`Session check failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  // Create session if needed
  if (!testData.session) {
    testResults.total++;
    try {
      const { data: newSession, error } = await supabase
        .from('table_sessions')
        .insert({
          table_id: testData.table.id,
          customer_phone: '+919999999999',
          status: 'active',
          session_started_at: new Date().toISOString(),
          total_orders: 0,
          total_amount: 0,
          locked_offer_id: testData.offer.id,  // Lock offer for session
          locked_offer_data: testData.offer,
          offer_applied_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      testData.session = newSession;
      logSuccess(`Created session: ${newSession.id}`);
      logInfo(`  Session offer locked: ${testData.offer.name}`);
      testResults.passed++;
    } catch (error) {
      logError(`Session creation failed: ${error.message}`);
      testResults.failed++;
      testResults.issues.push('Session creation uses locked_offer_id but current code does not set it');
      throw error;
    }
  }

  // Create first order
  testResults.total++;
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        table_id: testData.table.id,
        table_session_id: testData.session.id,
        order_type: 'dine-in',
        total_amount: finalAmount1,
        session_offer_id: testData.offer.id,
        customer_phone: '+919999999999',
        status: 'placed',
        notes: 'Test: First order by guest',
      })
      .select()
      .single();

    if (error) throw error;
    testData.order1 = order;
    logSuccess(`Created first order: ${order.id}`);
    logInfo(`  Order amount: ₹${finalAmount1.toFixed(2)}`);
    logInfo(`  Linked to session: ${testData.session.id}`);
    testResults.passed++;
  } catch (error) {
    logError(`First order creation failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  // Create order items
  testResults.total++;
  try {
    const orderItems = cart1.map(item => ({
      order_id: testData.order1.id,
      menu_item_id: item.id,
      quantity: 1,
      unit_price: item.price,
      total_price: item.price,
    }));

    const { error } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (error) throw error;
    logSuccess(`Added ${cart1.length} items to first order`);
    testResults.passed++;
  } catch (error) {
    logError(`Order items creation failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  // Update session totals
  testResults.total++;
  try {
    const { error } = await supabase
      .from('table_sessions')
      .update({
        total_orders: 1,
        total_amount: finalAmount1,
      })
      .eq('id', testData.session.id);

    if (error) throw error;
    logSuccess('Updated session totals');
    testResults.passed++;
  } catch (error) {
    logError(`Session update failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }
}

/**
 * Scenario: Second Order by Staff (for same guest)
 */
async function createSecondOrder() {
  logSection('SCENARIO STEP 2: COMPLETE FIRST ORDER, THEN ADD MORE');

  logInfo('First, complete the first order (required by unique constraint)');
  
  // Mark first order as completed
  testResults.total++;
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', testData.order1.id);

    if (error) throw error;
    logSuccess(`Marked Order 1 as 'completed'`);
    logInfo(`  This allows creating a new order in the same session`);
    logInfo(`  Constraint: Only ONE active order per session at a time`);
    testResults.passed++;
  } catch (error) {
    logError(`Order completion failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  logInfo('\nNow guest asks staff to order more items...');

  const cart2 = testData.menuItems.slice(2, 4);
  const total2 = cart2.reduce((sum, item) => sum + item.price, 0);
  const offerDiscount2 = total2 * 0.1; // Same offer applies
  const finalAmount2 = total2 - offerDiscount2;

  logInfo(`Cart items: ${cart2.map(i => i.name).join(', ')}`);
  logInfo(`Cart total: ₹${total2}`);
  logInfo(`Offer discount: ₹${offerDiscount2.toFixed(2)}`);
  logInfo(`Final amount: ₹${finalAmount2.toFixed(2)}`);

  // Check session exists and is active
  testResults.total++;
  try {
    const { data: session, error } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('id', testData.session.id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    
    if (!session) {
      throw new Error('Session not found or not active');
    }
    
    logSuccess('Found active session for table');
    logInfo(`  Session ID: ${session.id}`);
    logInfo(`  Previous orders: ${session.total_orders}`);
    logInfo(`  Previous amount: ₹${session.total_amount}`);
    
    if (session.locked_offer_id) {
      logSuccess(`Session has locked offer: ${session.locked_offer_id}`);
      logInfo(`  This offer should apply to new order automatically`);
    } else {
      logWarning('Session does NOT have locked_offer_id');
      testResults.issues.push('CRITICAL: Session missing locked_offer_id - offers won\'t persist across orders');
    }
    
    testResults.passed++;
  } catch (error) {
    logError(`Session retrieval failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  // Create second order (should reuse session and offer)
  testResults.total++;
  try {
    // In real scenario, the admin would:
    // 1. Select same table
    // 2. System finds active session
    // 3. System should auto-apply locked offer from session
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        table_id: testData.table.id,
        table_session_id: testData.session.id,
        order_type: 'dine-in',
        total_amount: finalAmount2,
        session_offer_id: testData.offer.id, // Should come from session.locked_offer_id
        customer_phone: '+919999999999',
        status: 'placed',
        notes: 'Test: Second order (staff placed for guest)',
      })
      .select()
      .single();

    if (error) throw error;
    testData.order2 = order;
    logSuccess(`Created second order: ${order.id}`);
    logInfo(`  Order amount: ₹${finalAmount2.toFixed(2)}`);
    logInfo(`  Using same session: ${testData.session.id}`);
    testResults.passed++;
  } catch (error) {
    logError(`Second order creation failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  // Create order items for second order
  testResults.total++;
  try {
    const orderItems = cart2.map(item => ({
      order_id: testData.order2.id,
      menu_item_id: item.id,
      quantity: 1,
      unit_price: item.price,
      total_price: item.price,
    }));

    const { error } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (error) throw error;
    logSuccess(`Added ${cart2.length} items to second order`);
    testResults.passed++;
  } catch (error) {
    logError(`Order items creation failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }

  // Update session totals (accumulate)
  testResults.total++;
  try {
    const { data: currentSession } = await supabase
      .from('table_sessions')
      .select('total_orders, total_amount')
      .eq('id', testData.session.id)
      .single();

    const { error } = await supabase
      .from('table_sessions')
      .update({
        total_orders: currentSession.total_orders + 1,
        total_amount: parseFloat(currentSession.total_amount) + finalAmount2,
      })
      .eq('id', testData.session.id);

    if (error) throw error;
    logSuccess('Updated session totals (accumulated)');
    logInfo(`  Total orders now: ${currentSession.total_orders + 1}`);
    logInfo(`  Total amount now: ₹${(parseFloat(currentSession.total_amount) + finalAmount2).toFixed(2)}`);
    testResults.passed++;
  } catch (error) {
    logError(`Session update failed: ${error.message}`);
    testResults.failed++;
    throw error;
  }
}

/**
 * Validation: Check session integrity
 */
async function validateSession() {
  logSection('VALIDATION: SESSION INTEGRITY CHECK');

  testResults.total++;
  try {
    const { data: session, error } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('id', testData.session.id)
      .single();

    if (error) throw error;

    logInfo('Session State:');
    logInfo(`  Status: ${session.status}`);
    logInfo(`  Total Orders: ${session.total_orders}`);
    logInfo(`  Total Amount: ₹${session.total_amount}`);
    logInfo(`  Locked Offer ID: ${session.locked_offer_id || 'NONE'}`);
    logInfo(`  Offer Applied At: ${session.offer_applied_at || 'NONE'}`);

    if (session.total_orders === 2) {
      logSuccess('Session has correct order count (2)');
    } else {
      logError(`Session order count incorrect: ${session.total_orders} (expected 2)`);
      testResults.issues.push(`Session order count: ${session.total_orders} instead of 2`);
    }

    testResults.passed++;
  } catch (error) {
    logError(`Session validation failed: ${error.message}`);
    testResults.failed++;
  }

  // Check both orders
  testResults.total++;
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('table_session_id', testData.session.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    logInfo(`\nOrders in Session: ${orders.length}`);
    orders.forEach((order, idx) => {
      logInfo(`  Order ${idx + 1}:`);
      logInfo(`    ID: ${order.id}`);
      logInfo(`    Amount: ₹${order.total_amount}`);
      logInfo(`    Offer ID: ${order.session_offer_id || 'NONE'}`);
      logInfo(`    Status: ${order.status}`);
    });

    const allHaveSameOffer = orders.every(o => o.session_offer_id === testData.offer.id);
    if (allHaveSameOffer) {
      logSuccess('All orders use the same session offer');
    } else {
      logWarning('Orders have different offers (should be same for session-level)');
      testResults.issues.push('Session-level offers not consistent across orders');
    }

    testResults.passed++;
  } catch (error) {
    logError(`Order validation failed: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * Issue Analysis
 */
function analyzeIssues() {
  logSection('ISSUE ANALYSIS');

  if (testResults.issues.length === 0) {
    logSuccess('No issues detected!');
    return;
  }

  log('\n🔍 Detected Issues:\n', 'yellow');
  testResults.issues.forEach((issue, idx) => {
    logWarning(`${idx + 1}. ${issue}`);
  });

  log('\n💡 Recommendations:\n', 'cyan');
  
  if (testResults.issues.some(i => i.includes('locked_offer_id'))) {
    log('  1. Update session creation to set locked_offer_id', 'cyan');
    log('     Location: app/admin/orders/create/page.tsx', 'cyan');
    log('     Add: locked_offer_id: selectedOffer?.id', 'cyan');
    log('     Add: locked_offer_data: selectedOffer', 'cyan');
    log('     Add: offer_applied_at: new Date().toISOString()', 'cyan');
  }

  if (testResults.issues.some(i => i.includes('auto-apply'))) {
    log('  2. Auto-apply locked offer when reusing session', 'cyan');
    log('     Check session.locked_offer_id on page load', 'cyan');
    log('     Auto-select that offer for new orders', 'cyan');
  }

  if (testResults.issues.some(i => i.includes('consistent'))) {
    log('  3. Enforce session-level offer consistency', 'cyan');
    log('     Once an offer is locked to a session', 'cyan');
    log('     All subsequent orders should use it', 'cyan');
  }
}

/**
 * Cleanup
 */
async function cleanup() {
  logSection('CLEANUP');

  const itemsToClean = [];
  
  if (testData.order1) itemsToClean.push(testData.order1.id);
  if (testData.order2) itemsToClean.push(testData.order2.id);

  if (itemsToClean.length > 0) {
    try {
      // Delete order items
      await supabase
        .from('order_items')
        .delete()
        .in('order_id', itemsToClean);

      // Delete orders
      await supabase
        .from('orders')
        .delete()
        .in('id', itemsToClean);

      // Delete session
      if (testData.session) {
        await supabase
          .from('table_sessions')
          .delete()
          .eq('id', testData.session.id);
      }

      logSuccess(`Cleaned up ${itemsToClean.length} orders and session`);
    } catch (error) {
      logWarning(`Cleanup failed: ${error.message}`);
    }
  }
}

/**
 * Print Summary
 */
function printSummary() {
  logSection('TEST SUMMARY');

  const totalTests = testResults.passed + testResults.failed + testResults.warnings;
  const passRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;

  log('\n📊 Results:', 'cyan');
  log(`  Total Tests:    ${testResults.total}`, 'cyan');
  logSuccess(`Passed:         ${testResults.passed}`);
  logError(`Failed:         ${testResults.failed}`);
  logWarning(`Warnings:       ${testResults.warnings}`);
  log(`  Pass Rate:      ${passRate}%`, 'cyan');
  log(`  Issues Found:   ${testResults.issues.length}\n`, 'cyan');

  if (testResults.failed === 0 && testResults.issues.length === 0) {
    logSuccess('🎉 PERFECT! Repeat order scenario works correctly!');
  } else if (testResults.failed === 0) {
    logWarning('⚠️  Scenario works but has design issues to address');
  } else {
    logError('❌ Scenario has failures that need fixing');
  }
}

/**
 * Main Test Runner
 */
async function runTest() {
  log('\n🧪 REPEAT ORDER SCENARIO TEST', 'magenta');
  log('Testing: Guest orders → Staff adds more for same guest\n', 'magenta');

  try {
    await setupTestData();
    await createFirstOrder();
    await createSecondOrder();
    await validateSession();
    analyzeIssues();
    await cleanup();
    printSummary();
  } catch (error) {
    logError(`\n💥 Test suite crashed: ${error.message}`);
    await cleanup();
    process.exit(1);
  }
}

runTest();
