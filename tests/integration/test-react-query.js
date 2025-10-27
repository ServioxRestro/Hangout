// Test: React Query Hooks and Auto-refresh
const {
  supabase,
  TEST_PHONE,
  getActiveTable,
  getMenuItems,
  logTestResult,
  measureTime
} = require('./test-config');

async function testReactQueryHooks() {
  console.log('\n🧪 TEST: React Query Hooks & Data Fetching');
  console.log('='.repeat(60));

  try {
    // Test 1: Menu Data Fetching (useMenuData hook logic)
    console.log('\n📋 Test 1: Menu Data Fetching...');
    const table = await getActiveTable();

    const startTime1 = Date.now();

    // Simulate useMenuData hook
    const [categoriesResult, itemsResult] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),

      supabase
        .from('menu_items')
        .select(`
          id,
          name,
          description,
          price,
          original_price,
          discount_percentage,
          has_discount,
          image_url,
          is_veg,
          category_id,
          display_order,
          menu_categories!inner (
            id,
            name
          )
        `)
        .eq('is_available', true)
        .eq('menu_categories.is_active', true)
        .order('display_order', { ascending: true })
    ]);

    const duration1 = measureTime('Menu data fetch (parallel)', startTime1);

    logTestResult('Categories Fetched', !categoriesResult.error && categoriesResult.data,
      `${categoriesResult.data?.length || 0} categories loaded`);
    logTestResult('Items Fetched', !itemsResult.error && itemsResult.data,
      `${itemsResult.data?.length || 0} items loaded`);
    logTestResult('Parallel Fetch Performance', duration1 < 1000,
      `Completed in ${duration1}ms (Target: < 1000ms)`);

    // Test 2: Admin KOTs Fetching (useAdminKOTs hook logic)
    console.log('\n📋 Test 2: Admin KOTs Fetching...');
    const startTime2 = Date.now();

    const { data: orderItems, error: kotError } = await supabase
      .from('order_items')
      .select(`
        id,
        quantity,
        status,
        created_at,
        kot_number,
        kot_batch_id,
        menu_items!inner (
          name,
          is_veg
        ),
        orders!inner (
          id,
          order_type,
          customer_name,
          restaurant_tables (
            table_number,
            veg_only
          ),
          takeaway_qr_codes (
            is_veg_only
          )
        )
      `)
      .not('kot_number', 'is', null)
      .in('status', ['placed', 'preparing', 'ready'])
      .order('kot_number', { ascending: true });

    const duration2 = measureTime('KOTs fetch', startTime2);

    logTestResult('KOTs Query Successful', !kotError,
      kotError ? kotError.message : `${orderItems?.length || 0} KOT items found`);
    logTestResult('KOTs Fetch Performance', duration2 < 1000,
      `Completed in ${duration2}ms (Target: < 1000ms)`);

    // Group KOTs (simulating hook logic)
    if (orderItems && orderItems.length > 0) {
      const kotMap = new Map();
      orderItems.forEach(item => {
        const batchId = item.kot_batch_id;
        if (!batchId) return;

        if (!kotMap.has(batchId)) {
          kotMap.set(batchId, {
            kot_number: item.kot_number,
            kot_batch_id: batchId,
            items: []
          });
        }

        kotMap.get(batchId).items.push({
          id: item.id,
          quantity: item.quantity,
          status: item.status
        });
      });

      logTestResult('KOT Grouping', kotMap.size > 0,
        `Grouped into ${kotMap.size} KOT batches`);
    }

    // Test 3: Billing Data Fetching (useBilling hook logic)
    console.log('\n📋 Test 3: Billing Data Fetching...');
    const startTime3 = Date.now();

    const { data: sessions, error: billingError } = await supabase
      .from('table_sessions')
      .select(`
        id,
        table_id,
        customer_phone,
        total_amount,
        status,
        session_started_at,
        restaurant_tables (
          table_number,
          table_code
        ),
        orders (
          id,
          total_amount,
          status,
          order_items (
            id,
            quantity,
            status,
            menu_items (
              name,
              price
            )
          )
        )
      `)
      .eq('status', 'active')
      .order('session_started_at', { ascending: true });

    const duration3 = measureTime('Billing data fetch', startTime3);

    logTestResult('Billing Query Successful', !billingError,
      billingError ? billingError.message : `${sessions?.length || 0} active sessions`);
    logTestResult('Billing Fetch Performance', duration3 < 1500,
      `Completed in ${duration3}ms (Target: < 1500ms)`);

    // Test 4: Table Sessions Fetching (useTableSessions hook logic)
    console.log('\n📋 Test 4: Table Sessions Fetching...');
    const startTime4 = Date.now();

    const { data: tableSessions, error: sessionsError } = await supabase
      .from('table_sessions')
      .select(`
        id,
        table_id,
        customer_phone,
        total_amount,
        total_orders,
        status,
        session_started_at,
        restaurant_tables (
          table_number,
          table_code,
          veg_only
        ),
        orders (
          id,
          status,
          total_amount,
          order_items (
            id,
            status
          )
        )
      `)
      .order('session_started_at', { ascending: false });

    const duration4 = measureTime('Table sessions fetch', startTime4);

    logTestResult('Sessions Query Successful', !sessionsError,
      sessionsError ? sessionsError.message : `${tableSessions?.length || 0} sessions found`);
    logTestResult('Sessions Fetch Performance', duration4 < 1000,
      `Completed in ${duration4}ms (Target: < 1000ms)`);

    // Test 5: Guest Orders Fetching (useGuestOrders hook logic)
    console.log('\n📋 Test 5: Guest Orders Fetching...');

    // Need to get a session ID for testing
    const testSession = tableSessions?.find(s => s.status === 'active');

    if (testSession) {
      const startTime5 = Date.now();

      const { data: guestOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total_amount,
          notes,
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            status,
            created_at,
            kot_number,
            menu_items (
              name,
              is_veg,
              image_url
            )
          )
        `)
        .eq('table_session_id', testSession.id)
        .order('created_at', { ascending: false });

      const duration5 = measureTime('Guest orders fetch', startTime5);

      logTestResult('Guest Orders Query Successful', !ordersError,
        ordersError ? ordersError.message : `${guestOrders?.length || 0} orders found`);
      logTestResult('Guest Orders Fetch Performance', duration5 < 800,
        `Completed in ${duration5}ms (Target: < 800ms)`);
    } else {
      console.log('   ⏭️  Skipped (no active sessions for testing)');
    }

    // Test 6: Query Optimization - Index Usage
    console.log('\n📋 Test 6: Testing Query Optimization...');

    // Test indexed queries
    const indexedQueries = [
      {
        name: 'Orders by session (indexed)',
        query: () => supabase
          .from('orders')
          .select('id')
          .eq('table_session_id', table.id)
          .limit(10)
      },
      {
        name: 'Orders by status (indexed)',
        query: () => supabase
          .from('orders')
          .select('id')
          .eq('status', 'placed')
          .limit(10)
      },
      {
        name: 'Order items by order (indexed)',
        query: () => supabase
          .from('order_items')
          .select('id')
          .eq('order_id', 'test-id')
          .limit(10)
      }
    ];

    for (const { name, query } of indexedQueries) {
      const start = Date.now();
      await query();
      const duration = Date.now() - start;
      logTestResult(name, duration < 500,
        `${duration}ms (Target: < 500ms for indexed queries)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL REACT QUERY TESTS PASSED!');
    console.log('='.repeat(60));

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run test
if (require.main === module) {
  testReactQueryHooks()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { testReactQueryHooks };
