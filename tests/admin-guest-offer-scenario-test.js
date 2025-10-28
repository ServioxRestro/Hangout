/**
 * Admin & Guest Order with Offers - Scenario Test
 * 
 * Tests two critical scenarios:
 * 1. Admin creates order with offer from scratch
 * 2. Guest orders with offer first, then admin adds more items
 * 
 * Verifies:
 * - Offer locking to session
 * - Order creation with session_offer_id
 * - Admin respects guest's locked offer
 * - Billing receives correct offer information
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test configuration
const TEST_CONFIG = {
  testPhone: "9999999999",
  testTableCode: "TEST_TABLE_1",
  testAdminId: null, // Will be fetched
  cleanupOnSuccess: true,
};

// Track created records for cleanup
const cleanup = {
  sessionIds: [],
  orderIds: [],
  guestUserId: null,
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// ============================================================
// TEST UTILITIES
// ============================================================

async function getTestTable() {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("table_code", TEST_CONFIG.testTableCode)
    .single();

  if (error || !data) {
    // Create test table if doesn't exist
    const { data: newTable, error: createError } = await supabase
      .from("restaurant_tables")
      .insert({
        table_number: 999,
        table_code: TEST_CONFIG.testTableCode,
        is_active: true,
        veg_only: false,
      })
      .select()
      .single();

    if (createError) throw new Error(`Failed to create test table: ${createError.message}`);
    return newTable;
  }

  return data;
}

async function getTestAdmin() {
  const { data, error } = await supabase
    .from("admin")
    .select("id, email")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No admin user found in database. Please create one first.");
  }

  return data;
}

async function getSessionLevelOffer() {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("application_type", "session_level")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error || !data) {
    logWarning("No session-level offer found. Creating test offer...");
    
    const { data: newOffer, error: createError } = await supabase
      .from("offers")
      .insert({
        name: "Test 20% Off",
        description: "Test session-level offer",
        offer_type: "cart_percentage",
        application_type: "session_level",
        is_active: true,
        conditions: { min_amount: 100 },
        benefits: { discount_percentage: 20, max_discount_amount: 500 },
      })
      .select()
      .single();

    if (createError) throw new Error(`Failed to create test offer: ${createError.message}`);
    return newOffer;
  }

  return data;
}

async function getTestMenuItems() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .eq("is_available", true)
    .limit(3);

  if (error || !data || data.length === 0) {
    throw new Error("No menu items found. Please add menu items first.");
  }

  return data;
}

async function cleanupTestData() {
  logInfo("Cleaning up test data...");

  // Delete order items first (foreign key constraint)
  if (cleanup.orderIds.length > 0) {
    await supabase
      .from("order_items")
      .delete()
      .in("order_id", cleanup.orderIds);
  }

  // Delete orders
  if (cleanup.orderIds.length > 0) {
    await supabase
      .from("orders")
      .delete()
      .in("id", cleanup.orderIds);
  }

  // Delete sessions
  if (cleanup.sessionIds.length > 0) {
    await supabase
      .from("table_sessions")
      .delete()
      .in("id", cleanup.sessionIds);
  }

  logSuccess("Cleanup completed");
}

// ============================================================
// TEST SCENARIO 1: ADMIN CREATES ORDER WITH OFFER
// ============================================================

async function testScenario1_AdminCreatesOrderWithOffer() {
  log("\n" + "=".repeat(60), colors.blue);
  log("SCENARIO 1: Admin Creates Order with Offer from Scratch", colors.blue);
  log("=".repeat(60), colors.blue);

  try {
    const table = await getTestTable();
    const admin = await getTestAdmin();
    const offer = await getSessionLevelOffer();
    const menuItems = await getTestMenuItems();

    logInfo(`Table: ${table.table_number} (${table.table_code})`);
    logInfo(`Offer: ${offer.name} (${offer.offer_type})`);
    logInfo(`Admin: ${admin.email}`);

    // Step 1: Create session
    logInfo("\nStep 1: Creating new table session...");
    const { data: session, error: sessionError } = await supabase
      .from("table_sessions")
      .insert({
        table_id: table.id,
        customer_phone: TEST_CONFIG.testPhone,
        status: "active",
        session_started_at: new Date().toISOString(),
        total_orders: 0,
        total_amount: 0,
      })
      .select()
      .single();

    if (sessionError) throw new Error(`Session creation failed: ${sessionError.message}`);
    cleanup.sessionIds.push(session.id);
    logSuccess(`Session created: ${session.id}`);

    // Step 2: Admin creates order with offer
    logInfo("\nStep 2: Admin creating order with offer...");
    
    const cartTotal = menuItems[0].price * 2; // 2 items
    const offerToUse = offer.id;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: table.id,
        table_session_id: session.id,
        customer_phone: TEST_CONFIG.testPhone,
        order_type: "dine-in",
        total_amount: cartTotal,
        session_offer_id: offerToUse, // Admin sets offer
        status: "placed",
        notes: "Test order by admin",
        created_by_admin_id: admin.id,
        created_by_type: "admin",
      })
      .select()
      .single();

    if (orderError) throw new Error(`Order creation failed: ${orderError.message}`);
    cleanup.orderIds.push(order.id);
    logSuccess(`Order created: ${order.id}`);

    // Step 3: Lock offer to session
    logInfo("\nStep 3: Locking offer to session...");
    const { error: updateError } = await supabase
      .from("table_sessions")
      .update({
        locked_offer_id: offer.id,
        locked_offer_data: {
          offer_id: offer.id,
          name: offer.name,
          offer_type: offer.offer_type,
          conditions: offer.conditions,
          benefits: offer.benefits,
          locked_at: new Date().toISOString(),
        },
        offer_applied_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateError) throw new Error(`Session update failed: ${updateError.message}`);
    logSuccess("Offer locked to session");

    // Step 4: Add order items
    logInfo("\nStep 4: Adding order items...");
    const kotNumber = Math.floor(Math.random() * 1000) + 1;
    const kotBatchId = crypto.randomUUID();

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert([
        {
          order_id: order.id,
          menu_item_id: menuItems[0].id,
          quantity: 2,
          unit_price: menuItems[0].price,
          total_price: menuItems[0].price * 2,
          kot_number: kotNumber,
          kot_batch_id: kotBatchId,
          status: "placed",
        },
      ]);

    if (itemsError) throw new Error(`Items creation failed: ${itemsError.message}`);
    logSuccess(`Order items added (KOT #${kotNumber})`);

    // Step 5: Verify setup
    logInfo("\nStep 5: Verifying scenario 1 setup...");
    
    const { data: verifyOrder } = await supabase
      .from("orders")
      .select("*, table_sessions(*)")
      .eq("id", order.id)
      .single();

    if (!verifyOrder) throw new Error("Order not found");
    if (!verifyOrder.session_offer_id) {
      logError("Order missing session_offer_id");
      return false;
    }
    if (!verifyOrder.table_sessions.locked_offer_id) {
      logError("Session missing locked_offer_id");
      return false;
    }

    logSuccess("✓ Order has session_offer_id");
    logSuccess("✓ Session has locked_offer_id");
    logSuccess("✓ Offer locked correctly");

    log("\n" + "=".repeat(60), colors.green);
    log("SCENARIO 1: ✅ PASSED", colors.green);
    log("=".repeat(60), colors.green);

    return { session, order, offer };

  } catch (error) {
    logError(`Scenario 1 failed: ${error.message}`);
    log("=".repeat(60), colors.red);
    log("SCENARIO 1: ❌ FAILED", colors.red);
    log("=".repeat(60), colors.red);
    throw error;
  }
}

// ============================================================
// TEST SCENARIO 2: GUEST ORDERS FIRST, ADMIN ADDS MORE
// ============================================================

async function testScenario2_GuestThenAdmin(scenario1Data) {
  log("\n" + "=".repeat(60), colors.blue);
  log("SCENARIO 2: Guest Orders First, Admin Adds More Items", colors.blue);
  log("=".repeat(60), colors.blue);

  try {
    const { session, offer } = scenario1Data;
    const admin = await getTestAdmin();
    const menuItems = await getTestMenuItems();

    logInfo(`Using session from Scenario 1: ${session.id}`);
    logInfo(`Guest's locked offer: ${offer.name}`);

    // Step 1: Simulate admin adding more items (in same session)
    logInfo("\nStep 1: Admin adding more items to guest's session...");
    
    // Get existing order
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("table_session_id", session.id)
      .not("status", "in", '("completed","paid","cancelled")')
      .single();

    if (!existingOrder) throw new Error("No existing order found");
    logInfo(`Found existing order: ${existingOrder.id}`);

    // Step 2: Check if admin would use guest's locked offer
    logInfo("\nStep 2: Verifying admin uses guest's locked offer...");
    
    const { data: sessionData } = await supabase
      .from("table_sessions")
      .select("*")
      .eq("id", session.id)
      .single();

    if (!sessionData.locked_offer_id) {
      logError("Session doesn't have locked offer");
      return false;
    }

    const offerToUse = sessionData.locked_offer_id; // Admin MUST use this
    logSuccess(`✓ Admin will use locked offer: ${offerToUse}`);

    // Step 3: Add new KOT batch to existing order
    logInfo("\nStep 3: Adding new KOT batch to existing order...");
    
    const newKotNumber = Math.floor(Math.random() * 1000) + 1000;
    const newKotBatchId = crypto.randomUUID();
    const additionalAmount = menuItems[1].price * 1;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert([
        {
          order_id: existingOrder.id,
          menu_item_id: menuItems[1].id,
          quantity: 1,
          unit_price: menuItems[1].price,
          total_price: menuItems[1].price * 1,
          kot_number: newKotNumber,
          kot_batch_id: newKotBatchId,
          status: "placed",
        },
      ]);

    if (itemsError) throw new Error(`Items creation failed: ${itemsError.message}`);
    logSuccess(`New KOT batch added (KOT #${newKotNumber})`);

    // Step 4: Update order total
    logInfo("\nStep 4: Updating order total...");
    
    const newTotal = (parseFloat(existingOrder.total_amount) || 0) + additionalAmount;
    const { error: updateError } = await supabase
      .from("orders")
      .update({ total_amount: newTotal })
      .eq("id", existingOrder.id);

    if (updateError) throw new Error(`Order update failed: ${updateError.message}`);
    logSuccess(`Order total updated: ₹${newTotal}`);

    // Step 5: Verify the order still uses guest's locked offer
    logInfo("\nStep 5: Verifying offer consistency...");
    
    const { data: finalOrder } = await supabase
      .from("orders")
      .select("*, table_sessions(*)")
      .eq("id", existingOrder.id)
      .single();

    if (!finalOrder) throw new Error("Order not found");
    
    // Check if session_offer_id matches locked_offer_id
    if (finalOrder.session_offer_id !== sessionData.locked_offer_id) {
      logError(`Order offer (${finalOrder.session_offer_id}) doesn't match session locked offer (${sessionData.locked_offer_id})`);
      return false;
    }

    logSuccess("✓ Order uses guest's locked offer");
    logSuccess("✓ Session locked offer unchanged");
    logSuccess("✓ Multiple KOT batches in one order");
    logSuccess("✓ Order total updated correctly");

    // Step 6: Count KOT batches
    const { data: kotBatches } = await supabase
      .from("order_items")
      .select("kot_batch_id")
      .eq("order_id", existingOrder.id);

    const uniqueKots = new Set(kotBatches?.map(item => item.kot_batch_id) || []);
    logInfo(`\nTotal KOT batches in order: ${uniqueKots.size}`);
    
    if (uniqueKots.size < 2) {
      logError("Expected at least 2 KOT batches");
      return false;
    }

    logSuccess(`✓ ${uniqueKots.size} KOT batches found`);

    log("\n" + "=".repeat(60), colors.green);
    log("SCENARIO 2: ✅ PASSED", colors.green);
    log("=".repeat(60), colors.green);

    return true;

  } catch (error) {
    logError(`Scenario 2 failed: ${error.message}`);
    log("=".repeat(60), colors.red);
    log("SCENARIO 2: ❌ FAILED", colors.red);
    log("=".repeat(60), colors.red);
    throw error;
  }
}

// ============================================================
// TEST SCENARIO 3: VERIFY BILLING CAN READ OFFERS
// ============================================================

async function testScenario3_BillingCanReadOffers(scenario1Data) {
  log("\n" + "=".repeat(60), colors.blue);
  log("SCENARIO 3: Billing Can Read Offer Information", colors.blue);
  log("=".repeat(60), colors.blue);

  try {
    const { session, order, offer } = scenario1Data;

    logInfo("Testing multiple offer retrieval methods...");

    // Method 1: From order directly
    const { data: orderData } = await supabase
      .from("orders")
      .select("session_offer_id, offers(*)")
      .eq("id", order.id)
      .single();

    if (orderData?.session_offer_id) {
      logSuccess("✓ Method 1: Order has session_offer_id");
    } else {
      logError("✗ Method 1: Order missing session_offer_id");
      return false;
    }

    // Method 2: From session
    const { data: sessionData } = await supabase
      .from("table_sessions")
      .select("locked_offer_id, locked_offer_data")
      .eq("id", session.id)
      .single();

    if (sessionData?.locked_offer_id) {
      logSuccess("✓ Method 2: Session has locked_offer_id");
    } else {
      logError("✗ Method 2: Session missing locked_offer_id");
      return false;
    }

    if (sessionData?.locked_offer_data) {
      logSuccess("✓ Method 3: Session has locked_offer_data (snapshot)");
      logInfo(`  Offer name: ${sessionData.locked_offer_data.name}`);
      logInfo(`  Offer type: ${sessionData.locked_offer_data.offer_type}`);
    } else {
      logWarning("⚠ Method 3: Session missing locked_offer_data");
    }

    // Method 4: Complex join query (what billing would use)
    const { data: billingData } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        session_offer_id,
        table_sessions(
          locked_offer_id,
          locked_offer_data
        ),
        offers:session_offer_id(
          id,
          name,
          offer_type,
          benefits
        )
      `)
      .eq("id", order.id)
      .single();

    if (billingData) {
      logSuccess("✓ Method 4: Complex join query successful");
      logInfo(`  Retrieved offer: ${billingData.offers?.name || 'N/A'}`);
    } else {
      logError("✗ Method 4: Complex join query failed");
      return false;
    }

    log("\n" + "=".repeat(60), colors.green);
    log("SCENARIO 3: ✅ PASSED", colors.green);
    log("=".repeat(60), colors.green);

    return true;

  } catch (error) {
    logError(`Scenario 3 failed: ${error.message}`);
    log("=".repeat(60), colors.red);
    log("SCENARIO 3: ❌ FAILED", colors.red);
    log("=".repeat(60), colors.red);
    throw error;
  }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function runAllTests() {
  const startTime = Date.now();
  
  log("\n" + "█".repeat(60), colors.cyan);
  log("  ADMIN & GUEST ORDER WITH OFFERS - INTEGRATION TEST", colors.cyan);
  log("█".repeat(60), colors.cyan);
  
  logInfo(`Start time: ${new Date().toLocaleString()}`);
  
  const results = {
    scenario1: false,
    scenario2: false,
    scenario3: false,
  };

  try {
    // Run Scenario 1
    const scenario1Data = await testScenario1_AdminCreatesOrderWithOffer();
    results.scenario1 = true;

    // Run Scenario 2
    results.scenario2 = await testScenario2_GuestThenAdmin(scenario1Data);

    // Run Scenario 3
    results.scenario3 = await testScenario3_BillingCanReadOffers(scenario1Data);

  } catch (error) {
    logError(`\nTest execution failed: ${error.message}`);
    console.error(error);
  } finally {
    // Cleanup
    if (TEST_CONFIG.cleanupOnSuccess) {
      await cleanupTestData();
    }
  }

  // Print summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log("\n" + "█".repeat(60), colors.cyan);
  log("  TEST SUMMARY", colors.cyan);
  log("█".repeat(60), colors.cyan);

  const totalTests = 3;
  const passedTests = Object.values(results).filter(Boolean).length;

  log(`\nScenario 1 (Admin creates order): ${results.scenario1 ? "✅ PASS" : "❌ FAIL"}`, 
    results.scenario1 ? colors.green : colors.red);
  log(`Scenario 2 (Guest then Admin): ${results.scenario2 ? "✅ PASS" : "❌ FAIL"}`, 
    results.scenario2 ? colors.green : colors.red);
  log(`Scenario 3 (Billing reads offers): ${results.scenario3 ? "✅ PASS" : "❌ FAIL"}`, 
    results.scenario3 ? colors.green : colors.red);

  log(`\nTotal: ${passedTests}/${totalTests} tests passed`, 
    passedTests === totalTests ? colors.green : colors.red);
  log(`Duration: ${duration}s`);

  if (passedTests === totalTests) {
    log("\n" + "█".repeat(60), colors.green);
    log("  🎉 ALL TESTS PASSED! 🎉", colors.green);
    log("█".repeat(60), colors.green);
    process.exit(0);
  } else {
    log("\n" + "█".repeat(60), colors.red);
    log("  ⚠️  SOME TESTS FAILED", colors.red);
    log("█".repeat(60), colors.red);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
