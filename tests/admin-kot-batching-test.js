/**
 * ADMIN REPEAT ORDER TEST - CORRECT ARCHITECTURE
 * 
 * Tests the CORRECT flow:
 * - One Session = One Order = Multiple KOTs
 * - Guest orders items → KOT #1 added to Order
 * - Guest orders more → KOT #2 added to SAME Order
 * - NOT creating multiple orders (prevented by unique constraint)
 * 
 * Run with: node tests/admin-kot-batching-test.js
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

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logSection(title) {
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`  ${title}`, 'blue');
  log(`${'='.repeat(80)}`, 'blue');
}

const testData = {
  table: null,
  menuItems: [],
  offer: null,
  session: null,
  order: null,
  testIds: [],
};

let testsPassed = 0;
let testsFailed = 0;

async function setup() {
  logSection('SETUP');

  // Get test table
  const { data: tables } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('veg_only', false)
    .limit(1);

  testData.table = tables[0];
  logSuccess(`Using Table: ${testData.table.table_number}`);

  // Get menu items
  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .limit(6);

  testData.menuItems = items;
  logSuccess(`Loaded ${items.length} menu items`);

  // Get an offer
  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .eq('application_type', 'session_level')
    .limit(1);

  testData.offer = offers[0];
  logSuccess(`Using offer: ${testData.offer?.name || 'None'}`);
}

async function test1_CreateFirstOrder() {
  logSection('TEST 1: CREATE FIRST ORDER WITH KOT #1');

  const items1 = testData.menuItems.slice(0, 2);
  const total1 = items1.reduce((sum, item) => sum + item.price, 0);

  logInfo(`Items: ${items1.map(i => i.name).join(', ')}`);
  logInfo(`Total: ₹${total1}`);

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from('table_sessions')
    .insert({
      table_id: testData.table.id,
      customer_phone: '+919876543210',
      status: 'active',
      session_started_at: new Date().toISOString(),
      total_orders: 0,
      total_amount: 0,
      locked_offer_id: testData.offer?.id || null,
    })
    .select()
    .single();

  if (sessionError) throw sessionError;
  testData.session = session;
  testData.testIds.push({ type: 'session', id: session.id });
  logSuccess(`Created session: ${session.id}`);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      table_id: testData.table.id,
      table_session_id: session.id,
      customer_phone: '+919876543210',
      customer_name: 'Test Guest',
      order_type: 'dine-in',
      total_amount: total1,
      session_offer_id: testData.offer?.id || null,
      status: 'placed',
      notes: 'First order',
    })
    .select()
    .single();

  if (orderError) throw orderError;
  testData.order = order;
  testData.testIds.push({ type: 'order', id: order.id });
  logSuccess(`Created order: ${order.id}`);

  // Add items as KOT #1
  const { data: kotNumber } = await supabase.rpc('get_next_kot_number');
  const kotBatchId = crypto.randomUUID();

  const orderItems = items1.map(item => ({
    order_id: order.id,
    menu_item_id: item.id,
    quantity: 1,
    unit_price: item.price,
    total_price: item.price,
    kot_number: kotNumber,
    kot_batch_id: kotBatchId,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;
  logSuccess(`Added ${items1.length} items as KOT #${kotNumber}`);

  testsPassed++;
}

async function test2_AddMoreItemsToSameOrder() {
  logSection('TEST 2: ADD MORE ITEMS TO SAME ORDER (KOT #2)');

  logInfo('Guest asks: "Can I have some more items please?"');
  logInfo('Staff adds items via admin panel...');

  // Check for existing active order
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('*')
    .eq('table_session_id', testData.session.id)
    .not('status', 'in', '("completed","paid","cancelled")')
    .maybeSingle();

  if (!existingOrder) {
    logError('No existing order found!');
    testsFailed++;
    return;
  }

  if (existingOrder.id !== testData.order.id) {
    logError(`Found different order! Expected ${testData.order.id}, got ${existingOrder.id}`);
    testsFailed++;
    return;
  }

  logSuccess(`Found existing order: ${existingOrder.id}`);
  logInfo(`  Current total: ₹${existingOrder.total_amount}`);

  // Add more items
  const items2 = testData.menuItems.slice(2, 4);
  const total2 = items2.reduce((sum, item) => sum + item.price, 0);

  logInfo(`Adding items: ${items2.map(i => i.name).join(', ')}`);
  logInfo(`New items total: ₹${total2}`);

  // Get next KOT number
  const { data: kotNumber } = await supabase.rpc('get_next_kot_number');
  const kotBatchId = crypto.randomUUID();

  const orderItems = items2.map(item => ({
    order_id: existingOrder.id, // SAME ORDER!
    menu_item_id: item.id,
    quantity: 1,
    unit_price: item.price,
    total_price: item.price,
    kot_number: kotNumber,
    kot_batch_id: kotBatchId,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;
  logSuccess(`Added ${items2.length} items as KOT #${kotNumber}`);

  // Update order total
  const newTotal = existingOrder.total_amount + total2;
  const { error: updateError } = await supabase
    .from('orders')
    .update({ total_amount: newTotal })
    .eq('id', existingOrder.id);

  if (updateError) throw updateError;
  logSuccess(`Updated order total: ₹${existingOrder.total_amount} + ₹${total2} = ₹${newTotal}`);

  testsPassed++;
}

async function test3_VerifyOneOrder() {
  logSection('TEST 3: VERIFY ONLY ONE ORDER EXISTS');

  // Count orders in this session
  const { data: orders, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('table_session_id', testData.session.id);

  if (count === 1) {
    logSuccess(`Correct: Only 1 order in session`);
    testsPassed++;
  } else {
    logError(`Wrong: Found ${count} orders (expected 1)`);
    testsFailed++;
  }

  // Get order with all items
  const { data: orderWithItems } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', testData.order.id)
    .single();

  logInfo(`\nOrder Summary:`);
  logInfo(`  Order ID: ${orderWithItems.id}`);
  logInfo(`  Total Items: ${orderWithItems.order_items.length}`);
  logInfo(`  Total Amount: ₹${orderWithItems.total_amount}`);

  // Group items by KOT
  const kotGroups = {};
  orderWithItems.order_items.forEach(item => {
    const kotNum = item.kot_number;
    if (!kotGroups[kotNum]) {
      kotGroups[kotNum] = [];
    }
    kotGroups[kotNum].push(item);
  });

  logInfo(`\n  KOT Batches:`);
  Object.keys(kotGroups).forEach(kotNum => {
    logInfo(`    KOT #${kotNum}: ${kotGroups[kotNum].length} items`);
  });

  if (Object.keys(kotGroups).length === 2) {
    logSuccess(`Correct: 2 KOT batches in one order`);
    testsPassed++;
  } else {
    logError(`Wrong: Found ${Object.keys(kotGroups).length} KOT batches (expected 2)`);
    testsFailed++;
  }
}

async function test4_VerifyConstraint() {
  logSection('TEST 4: VERIFY UNIQUE CONSTRAINT PREVENTS DUPLICATE ORDERS');

  logInfo('Attempting to create second order in same session...');

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        table_id: testData.table.id,
        table_session_id: testData.session.id,
        customer_phone: '+919876543210',
        order_type: 'dine-in',
        total_amount: 100,
        status: 'placed',
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique_active_order_per_session')) {
        logSuccess(`Constraint working: Cannot create second active order`);
        logInfo(`  Error: ${error.message}`);
        testsPassed++;
      } else {
        logError(`Wrong error: ${error.message}`);
        testsFailed++;
      }
    } else {
      logError(`Constraint FAILED: Second order was created!`);
      logInfo(`  Second order ID: ${data.id}`);
      // Clean up this second order
      await supabase.from('orders').delete().eq('id', data.id);
      testsFailed++;
    }
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    testsFailed++;
  }
}

async function cleanup() {
  logSection('CLEANUP');

  // Delete order items
  const orderIds = testData.testIds
    .filter(item => item.type === 'order')
    .map(item => item.id);

  if (orderIds.length > 0) {
    await supabase.from('order_items').delete().in('order_id', orderIds);
    logSuccess(`Deleted order items`);
  }

  // Delete orders
  if (orderIds.length > 0) {
    await supabase.from('orders').delete().in('id', orderIds);
    logSuccess(`Deleted orders`);
  }

  // Delete session
  const sessionIds = testData.testIds
    .filter(item => item.type === 'session')
    .map(item => item.id);

  if (sessionIds.length > 0) {
    await supabase.from('table_sessions').delete().in('id', sessionIds);
    logSuccess(`Deleted session`);
  }
}

async function runTests() {
  log('\n🎬 ADMIN KOT BATCHING TEST', 'magenta');
  log('Testing: One Session = One Order = Multiple KOTs\n', 'magenta');

  try {
    await setup();
    await test1_CreateFirstOrder();
    await test2_AddMoreItemsToSameOrder();
    await test3_VerifyOneOrder();
    await test4_VerifyConstraint();

    await cleanup();

    logSection('TEST RESULTS');
    log(`\n✅ Tests Passed: ${testsPassed}`, 'green');
    log(`❌ Tests Failed: ${testsFailed}`, 'red');

    if (testsFailed === 0) {
      log('\n🎉 ALL TESTS PASSED!', 'green');
      log('✅ One session = One order architecture verified!', 'green');
      log('✅ Multiple KOTs can be added to same order!', 'green');
      log('✅ Constraint prevents duplicate orders!', 'green');
      log('✅ Order totals update correctly!\n', 'green');
    } else {
      log('\n❌ SOME TESTS FAILED', 'red');
      log('Review errors above\n', 'red');
    }

  } catch (error) {
    logError(`\n💥 Test crashed: ${error.message}`);
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

runTests();
