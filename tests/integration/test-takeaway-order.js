// Test: Takeaway Order Placement with Optimized Function
const {
  supabase,
  TEST_PHONE,
  TEST_GUEST_NAME,
  getMenuItems,
  getOrCreateGuestUser,
  cleanupTestData,
  logTestResult,
  measureTime
} = require('./test-config');

async function testTakeawayOrderPlacement() {
  console.log('\n🧪 TEST: Takeaway Order Placement (Optimized Function)');
  console.log('='.repeat(60));

  let orderId = null;

  try {
    // Step 1: Get test data
    console.log('\n📋 Step 1: Preparing test data...');
    const menuItems = await getMenuItems(3);
    const guestUser = await getOrCreateGuestUser(TEST_PHONE, TEST_GUEST_NAME);

    console.log(`   Guest: ${guestUser.name} (${guestUser.phone})`);
    console.log(`   Menu Items: ${menuItems.length} items selected`);
    menuItems.forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.name} - ₹${item.price}`);
    });

    // Step 2: Prepare cart items
    const cartItems = menuItems.map(item => ({
      id: item.id,
      quantity: 2,
      price: item.price
    }));

    const cartTotal = cartItems.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );

    console.log(`\n💰 Cart Total: ₹${cartTotal}`);

    // Step 3: Call optimized function for takeaway
    console.log('\n🚀 Step 2: Calling place_order_optimized function (takeaway)...');
    const startTime = Date.now();

    const { data, error: rpcError } = await supabase.rpc('place_order_optimized', {
      p_table_code: '', // Not needed for takeaway
      p_customer_phone: TEST_PHONE,
      p_cart_items: cartItems,
      p_cart_total: cartTotal,
      p_guest_user_id: guestUser.id,
      p_order_type: 'takeaway',
      p_offer_id: null,
      p_offer_discount: 0
    });

    const duration = measureTime('Takeaway order placement', startTime);

    if (rpcError) {
      throw new Error(`RPC Error: ${rpcError.message}`);
    }

    if (!data || !data.success) {
      throw new Error('Function returned unsuccessful result');
    }

    orderId = data.order_id;

    console.log(`\n✅ Takeaway order placed successfully!`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Session ID: ${data.session_id || 'N/A (takeaway)'}`);
    console.log(`   KOT Number: ${data.kot_number}`);
    console.log(`   KOT Batch ID: ${data.kot_batch_id}`);
    console.log(`   Is New Order: ${data.is_new_order}`);

    logTestResult('Performance Check', duration < 2000,
      `Completed in ${duration}ms (Target: < 2000ms)`);

    // Step 4: Verify order was created
    console.log('\n🔍 Step 3: Verifying order creation...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw new Error(`Order verification failed: ${orderError.message}`);

    logTestResult('Order Created', order !== null,
      `Status: ${order.status}, Total: ₹${order.total_amount}`);
    logTestResult('Order Type is Takeaway', order.order_type === 'takeaway',
      `Order type: ${order.order_type}`);
    logTestResult('No Table Session', order.table_session_id === null,
      'Takeaway orders should not have table sessions');
    logTestResult('Order Total Matches', order.total_amount === cartTotal,
      `Expected: ₹${cartTotal}, Got: ₹${order.total_amount}`);

    // Step 5: Verify order items
    console.log('\n🔍 Step 4: Verifying order items...');
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw new Error(`Order items verification failed: ${itemsError.message}`);

    logTestResult('Order Items Created', orderItems.length === cartItems.length,
      `Expected: ${cartItems.length}, Got: ${orderItems.length}`);

    // Check KOT numbers
    const kotNumber = orderItems[0]?.kot_number;
    const kotBatchId = orderItems[0]?.kot_batch_id;
    const allSameKOT = orderItems.every(item =>
      item.kot_number === kotNumber && item.kot_batch_id === kotBatchId
    );

    logTestResult('KOT Numbers Consistent', allSameKOT,
      `All items have KOT #${kotNumber}`);

    // Step 6: Verify items have correct status
    const allPlaced = orderItems.every(item => item.status === 'placed');
    logTestResult('All Items Status "placed"', allPlaced,
      'Items should start with "placed" status');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TAKEAWAY TESTS PASSED!');
    console.log('='.repeat(60));

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    // Cleanup
    if (orderId) {
      await cleanupTestData(null, orderId);
    }
  }
}

// Run test
if (require.main === module) {
  testTakeawayOrderPlacement()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { testTakeawayOrderPlacement };
