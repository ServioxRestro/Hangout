// Test: Dine-in Order Placement with Optimized Function
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

async function testDineInOrderPlacement() {
  console.log('\n🧪 TEST: Dine-in Order Placement (Optimized Function)');
  console.log('=' .repeat(60));

  let sessionId = null;
  let orderId = null;

  try {
    // Step 1: Get test data
    console.log('\n📋 Step 1: Preparing test data...');
    const table = await getActiveTable();
    const menuItems = await getMenuItems(3);
    const guestUser = await getOrCreateGuestUser(TEST_PHONE, TEST_GUEST_NAME);

    console.log(`   Table: ${table.table_number} (${table.table_code})`);
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

    // Step 3: Call optimized function
    console.log('\n🚀 Step 2: Calling place_order_optimized function...');
    const startTime = Date.now();

    const { data, error: rpcError } = await supabase.rpc('place_order_optimized', {
      p_table_code: table.table_code,
      p_customer_phone: TEST_PHONE,
      p_cart_items: cartItems,
      p_cart_total: cartTotal,
      p_guest_user_id: guestUser.id,
      p_order_type: 'dine-in',
      p_offer_id: null,
      p_offer_discount: 0
    });

    const duration = measureTime('Order placement', startTime);

    if (rpcError) {
      throw new Error(`RPC Error: ${rpcError.message}`);
    }

    if (!data || !data.success) {
      throw new Error('Function returned unsuccessful result');
    }

    orderId = data.order_id;
    sessionId = data.session_id;

    console.log(`\n✅ Order placed successfully!`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   KOT Number: ${data.kot_number}`);
    console.log(`   KOT Batch ID: ${data.kot_batch_id}`);
    console.log(`   Is New Order: ${data.is_new_order}`);

    logTestResult('Performance Check', duration < 2000,
      `Completed in ${duration}ms (Target: < 2000ms)`);

    // Step 4: Verify session was created
    console.log('\n🔍 Step 3: Verifying session creation...');
    const { data: session, error: sessionError } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw new Error(`Session verification failed: ${sessionError.message}`);

    logTestResult('Session Created', session !== null,
      `Status: ${session.status}, Total: ₹${session.total_amount}`);

    // Step 5: Verify order was created
    console.log('\n🔍 Step 4: Verifying order creation...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw new Error(`Order verification failed: ${orderError.message}`);

    logTestResult('Order Created', order !== null,
      `Status: ${order.status}, Total: ₹${order.total_amount}`);
    logTestResult('Order Total Matches', order.total_amount === cartTotal,
      `Expected: ₹${cartTotal}, Got: ₹${order.total_amount}`);

    // Step 6: Verify order items
    console.log('\n🔍 Step 5: Verifying order items...');
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

    // Step 7: Test adding more items to existing order
    console.log('\n🚀 Step 6: Testing add items to existing order...');
    const additionalItems = [menuItems[0]].map(item => ({
      id: item.id,
      quantity: 1,
      price: item.price
    }));

    const additionalTotal = additionalItems[0].price * additionalItems[0].quantity;

    const startTime2 = Date.now();
    const { data: data2, error: rpcError2 } = await supabase.rpc('place_order_optimized', {
      p_table_code: table.table_code,
      p_customer_phone: TEST_PHONE,
      p_cart_items: additionalItems,
      p_cart_total: additionalTotal,
      p_guest_user_id: guestUser.id,
      p_order_type: 'dine-in',
      p_offer_id: null,
      p_offer_discount: 0
    });

    const duration2 = measureTime('Add items to existing order', startTime2);

    if (rpcError2) throw new Error(`Second order RPC Error: ${rpcError2.message}`);

    logTestResult('Items Added to Existing Order', data2.is_new_order === false,
      `Same Order ID: ${data2.order_id === orderId}`);
    logTestResult('New KOT Number Generated', data2.kot_number !== data.kot_number,
      `First KOT: #${data.kot_number}, Second KOT: #${data2.kot_number}`);

    // Verify total updated
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('id', orderId)
      .single();

    const expectedTotal = cartTotal + additionalTotal;
    logTestResult('Order Total Updated', updatedOrder.total_amount === expectedTotal,
      `Expected: ₹${expectedTotal}, Got: ₹${updatedOrder.total_amount}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL DINE-IN TESTS PASSED!');
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
  testDineInOrderPlacement()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { testDineInOrderPlacement };
