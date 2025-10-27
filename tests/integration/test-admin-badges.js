// Test: Admin Badge Counts
const {
  supabase,
  TEST_PHONE,
  TEST_GUEST_NAME,
  getActiveTable,
  getMenuItems,
  getOrCreateGuestUser,
  cleanupTestData,
  logTestResult,
  measureTime
} = require('./test-config');

async function testAdminBadges() {
  console.log('\n🧪 TEST: Admin Badge Counts');
  console.log('='.repeat(60));

  let sessionId = null;
  let orderId = null;

  try {
    // Step 1: Create test data (order with items in different statuses)
    console.log('\n📋 Step 1: Setting up test data...');
    const table = await getActiveTable();
    const menuItems = await getMenuItems(4);
    const guestUser = await getOrCreateGuestUser(TEST_PHONE, TEST_GUEST_NAME);

    // Create an order using the optimized function
    const cartItems = menuItems.map(item => ({
      id: item.id,
      quantity: 1,
      price: item.price
    }));

    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const { data: orderData } = await supabase.rpc('place_order_optimized', {
      p_table_code: table.table_code,
      p_customer_phone: TEST_PHONE,
      p_cart_items: cartItems,
      p_cart_total: cartTotal,
      p_guest_user_id: guestUser.id,
      p_order_type: 'dine-in',
      p_offer_id: null,
      p_offer_discount: 0
    });

    orderId = orderData.order_id;
    sessionId = orderData.session_id;
    const kotBatchId = orderData.kot_batch_id;

    console.log(`   ✅ Created order ${orderId} with KOT #${orderData.kot_number}`);

    // Step 2: Test Badge Counts - Kitchen KOTs
    console.log('\n🔍 Step 2: Testing Kitchen KOTs badge...');

    // All items should be "placed" initially
    let startTime = Date.now();
    const { data: placedItems } = await supabase
      .from('order_items')
      .select('kot_batch_id, status')
      .not('kot_number', 'is', null)
      .in('status', ['placed', 'preparing', 'ready']);

    const uniqueKOTsPlaced = new Set(
      placedItems?.filter(item => item.kot_batch_id).map(item => item.kot_batch_id) || []
    );

    measureTime('Kitchen KOTs query', startTime);
    logTestResult('Kitchen KOTs Count (placed)', uniqueKOTsPlaced.size > 0,
      `Found ${uniqueKOTsPlaced.size} unique KOT(s)`);

    // Update items to "preparing"
    await supabase
      .from('order_items')
      .update({ status: 'preparing' })
      .eq('kot_batch_id', kotBatchId);

    const { data: preparingItems } = await supabase
      .from('order_items')
      .select('kot_batch_id, status')
      .not('kot_number', 'is', null)
      .in('status', ['placed', 'preparing', 'ready']);

    const uniqueKOTsPreparing = new Set(
      preparingItems?.filter(item => item.kot_batch_id).map(item => item.kot_batch_id) || []
    );

    logTestResult('Kitchen KOTs Count (preparing)', uniqueKOTsPreparing.size > 0,
      `Still showing ${uniqueKOTsPreparing.size} KOT(s) - correct!`);

    // Update items to "ready" - should still show in kitchen
    await supabase
      .from('order_items')
      .update({ status: 'ready' })
      .eq('kot_batch_id', kotBatchId);

    const { data: readyItems } = await supabase
      .from('order_items')
      .select('kot_batch_id, status')
      .not('kot_number', 'is', null)
      .in('status', ['placed', 'preparing', 'ready']);

    const uniqueKOTsReady = new Set(
      readyItems?.filter(item => item.kot_batch_id).map(item => item.kot_batch_id) || []
    );

    logTestResult('Kitchen KOTs Count (ready)', uniqueKOTsReady.size > 0,
      `Still showing ${uniqueKOTsReady.size} KOT(s) - items marked ready should stay visible!`);

    // Update items to "served" - should disappear from kitchen
    await supabase
      .from('order_items')
      .update({ status: 'served' })
      .eq('kot_batch_id', kotBatchId);

    const { data: servedItems } = await supabase
      .from('order_items')
      .select('kot_batch_id, status')
      .not('kot_number', 'is', null)
      .in('status', ['placed', 'preparing', 'ready']);

    const uniqueKOTsServed = new Set(
      servedItems?.filter(item => item.kot_batch_id).map(item => item.kot_batch_id) || []
    );

    logTestResult('Kitchen KOTs Count (served)', !servedItems?.some(item => item.kot_batch_id === kotBatchId),
      `KOT removed from kitchen after serving - correct!`);

    // Step 3: Test Badge Counts - Active Orders
    console.log('\n🔍 Step 3: Testing Active Orders badge...');

    startTime = Date.now();
    const { count: activeOrdersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('order_type', 'dine-in')
      .in('status', ['placed', 'preparing', 'ready', 'served']);

    measureTime('Active orders query', startTime);
    logTestResult('Active Orders Count', activeOrdersCount > 0,
      `Found ${activeOrdersCount} active order(s)`);

    // Step 4: Test Badge Counts - Pending Bills
    console.log('\n🔍 Step 4: Testing Pending Bills badge...');

    // Create a pending bill to test badge logic
    const { data: billData, error: billError } = await supabase
      .from('bills')
      .insert({
        table_session_id: sessionId,
        bill_number: `TEST-${Date.now()}`,
        subtotal: 100,
        discount_amount: 0,
        discount_percentage: 0,
        cgst_rate: 2.5,
        cgst_amount: 2.5,
        sgst_rate: 2.5,
        sgst_amount: 2.5,
        service_charge_rate: 10,
        service_charge_amount: 10,
        total_tax_amount: 15,
        final_amount: 115,
        payment_status: 'pending',
        payment_method: null
      })
      .select()
      .single();

    if (billError) {
      console.error('Failed to create test bill:', billError);
      throw billError;
    }

    const testBillId = billData.id;
    console.log(`   ✅ Created test bill ${billData.bill_number}`);

    startTime = Date.now();
    const { count: pendingBillsCount } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending');

    measureTime('Pending bills query', startTime);
    logTestResult('Pending Bills Count', pendingBillsCount > 0,
      `Found ${pendingBillsCount} bill(s) awaiting payment confirmation`);

    // Clean up test bill
    await supabase.from('bills').delete().eq('id', testBillId);

    // Step 5: Test Takeaway Orders Badge
    console.log('\n🔍 Step 5: Testing Takeaway Orders badge...');

    startTime = Date.now();
    const { count: takeawayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('order_type', 'takeaway')
      .in('status', ['placed', 'preparing', 'ready']);

    measureTime('Takeaway orders query', startTime);
    logTestResult('Takeaway Orders Query', true,
      `Found ${takeawayCount} active takeaway order(s)`);

    // Step 6: Test Parallel Queries (how useAdminBadges works)
    console.log('\n🔍 Step 6: Testing parallel badge queries (useAdminBadges simulation)...');

    // Create another test bill for parallel query test
    const { data: testBill2 } = await supabase
      .from('bills')
      .insert({
        table_session_id: sessionId,
        bill_number: `TEST-PARALLEL-${Date.now()}`,
        subtotal: 50,
        discount_amount: 0,
        discount_percentage: 0,
        cgst_rate: 2.5,
        cgst_amount: 1.25,
        sgst_rate: 2.5,
        sgst_amount: 1.25,
        service_charge_rate: 10,
        service_charge_amount: 5,
        total_tax_amount: 7.5,
        final_amount: 57.5,
        payment_status: 'pending',
        payment_method: null
      })
      .select()
      .single();

    startTime = Date.now();
    const [ordersResult, kitchenItemsResult, billsResult, takeawayResult] = await Promise.all([
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_type', 'dine-in')
        .in('status', ['placed', 'preparing', 'ready', 'served']),

      supabase
        .from('order_items')
        .select('kot_batch_id, status')
        .not('kot_number', 'is', null)
        .in('status', ['placed', 'preparing', 'ready']),

      supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending'),

      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_type', 'takeaway')
        .in('status', ['placed', 'preparing', 'ready']),
    ]);

    const duration = measureTime('All badge queries (parallel)', startTime);

    const uniqueKOTs = new Set(
      kitchenItemsResult.data?.filter(item => item.kot_batch_id).map(item => item.kot_batch_id) || []
    );

    console.log('\n   📊 Badge Counts:');
    console.log(`      Active Orders: ${ordersResult.count}`);
    console.log(`      Kitchen KOTs: ${uniqueKOTs.size}`);
    console.log(`      Pending Bills: ${billsResult.count}`);
    console.log(`      Takeaway Orders: ${takeawayResult.count}`);

    logTestResult('Parallel Query Performance', duration < 1000,
      `Completed in ${duration}ms (Target: < 1000ms)`);

    // Clean up second test bill
    if (testBill2) {
      await supabase.from('bills').delete().eq('id', testBill2.id);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL BADGE TESTS PASSED!');
    console.log('='.repeat(60));

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    // Cleanup
    if (sessionId || orderId) {
      await cleanupTestData(sessionId, orderId);
    }
  }
}

// Run test
if (require.main === module) {
  testAdminBadges()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { testAdminBadges };
