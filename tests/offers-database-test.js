/**
 * DATABASE COMPREHENSIVE TESTS FOR OFFERS SYSTEM
 * 
 * Tests database integrity, relationships, and data quality
 * Run with: npm run test:offers:db
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
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`${title}`, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
}

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

async function testDatabaseSchema() {
  logSection('DATABASE SCHEMA VALIDATION');
  
  testResults.total++;
  
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .limit(1);
    
    if (error) {
      logError(`Schema validation failed: ${error.message}`);
      testResults.failed++;
      return false;
    }
    
    logSuccess('Offers table schema is valid');
    testResults.passed++;
    return true;
  } catch (err) {
    logError(`Schema test error: ${err.message}`);
    testResults.failed++;
    return false;
  }
}

async function testDataIntegrity() {
  logSection('DATA INTEGRITY CHECKS');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('id, name, offer_type, application_type, is_active');
  
  if (error) {
    logError(`Data integrity check failed: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  let issues = 0;
  
  // Check for null or empty names
  const emptyNames = data.filter(o => !o.name || o.name.trim() === '');
  if (emptyNames.length > 0) {
    logError(`Found ${emptyNames.length} offers with empty names`);
    issues++;
  }
  
  // Check for invalid offer types
  const validTypes = [
    'cart_percentage', 'cart_flat_amount', 'min_order_discount',
    'item_buy_get_free', 'cart_threshold_item', 'item_free_addon',
    'item_percentage', 'combo_meal', 'time_based', 'customer_based', 'promo_code'
  ];
  
  const invalidTypes = data.filter(o => !validTypes.includes(o.offer_type));
  if (invalidTypes.length > 0) {
    logError(`Found ${invalidTypes.length} offers with invalid offer_type`);
    invalidTypes.forEach(o => {
      logError(`  - "${o.name}": ${o.offer_type}`);
    });
    issues++;
  }
  
  // Check for null application_type
  const nullAppType = data.filter(o => !o.application_type);
  if (nullAppType.length > 0) {
    logError(`Found ${nullAppType.length} offers with null application_type`);
    issues++;
  }
  
  if (issues === 0) {
    logSuccess(`All ${data.length} offers have valid data integrity`);
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function testOfferOrderRelationships() {
  logSection('OFFER-ORDER RELATIONSHIPS');
  
  testResults.total++;
  
  try {
    // Get all offer IDs referenced in orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('session_offer_id')
      .not('session_offer_id', 'is', null);
    
    if (ordersError) {
      logError(`Failed to query orders: ${ordersError.message}`);
      testResults.failed++;
      return;
    }
    
    if (orders.length === 0) {
      logWarning('No orders with offers found');
      testResults.warnings++;
      return;
    }
    
    const offerIds = [...new Set(orders.map(o => o.session_offer_id))];
    logInfo(`Found ${offerIds.length} unique offers referenced in ${orders.length} orders`);
    
    // Check if all referenced offers exist
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id')
      .in('id', offerIds);
    
    if (offersError) {
      logError(`Failed to query offers: ${offersError.message}`);
      testResults.failed++;
      return;
    }
    
    const existingOfferIds = offers.map(o => o.id);
    const orphanedRefs = offerIds.filter(id => !existingOfferIds.includes(id));
    
    if (orphanedRefs.length === 0) {
      logSuccess('All offer references are valid (no orphaned references)');
      testResults.passed++;
    } else {
      logError(`Found ${orphanedRefs.length} orphaned offer references`);
      orphanedRefs.slice(0, 5).forEach(id => {
        logError(`  - Orphaned offer ID: ${id}`);
      });
      testResults.failed++;
    }
  } catch (err) {
    logError(`Relationship test error: ${err.message}`);
    testResults.failed++;
  }
}

async function testBenefitsConditionsStructure() {
  logSection('BENEFITS & CONDITIONS JSON STRUCTURE');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('name, offer_type, benefits, conditions');
  
  if (error) {
    logError(`Failed to query JSON fields: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  let invalidCount = 0;
  
  for (const offer of data) {
    let hasIssue = false;
    
    // Validate benefits
    if (!offer.benefits || typeof offer.benefits !== 'object') {
      logError(`"${offer.name}": benefits is not a valid object`);
      hasIssue = true;
    } else if (Object.keys(offer.benefits).length === 0) {
      logWarning(`"${offer.name}": benefits is empty`);
    }
    
    // Validate conditions (can be null or object)
    if (offer.conditions !== null && typeof offer.conditions !== 'object') {
      logError(`"${offer.name}": conditions is not a valid object`);
      hasIssue = true;
    }
    
    if (hasIssue) invalidCount++;
  }
  
  if (invalidCount === 0) {
    logSuccess(`All ${data.length} offers have valid JSON structure`);
    testResults.passed++;
  } else {
    logError(`${invalidCount} offers have invalid JSON structure`);
    testResults.failed++;
  }
}

async function testActiveInactiveOffers() {
  logSection('ACTIVE/INACTIVE OFFERS DISTRIBUTION');
  
  const { data, error } = await supabase
    .from('offers')
    .select('is_active, name');
  
  if (error) {
    logError(`Failed to query active status: ${error.message}`);
    return;
  }
  
  const active = data.filter(o => o.is_active).length;
  const inactive = data.filter(o => !o.is_active).length;
  
  logInfo(`Active offers: ${active}`);
  logInfo(`Inactive offers: ${inactive}`);
  logInfo(`Total offers: ${data.length}`);
  
  if (active === 0) {
    logWarning('No active offers found');
  } else {
    logSuccess(`${active} active offers available`);
  }
}

async function testDateRangeValidity() {
  logSection('DATE RANGE VALIDATION');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('name, start_date, end_date')
    .or('start_date.not.is.null,end_date.not.is.null');
  
  if (error) {
    logError(`Failed to query dates: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  if (data.length === 0) {
    logWarning('No offers with date ranges found');
    testResults.warnings++;
    return;
  }
  
  let invalidDates = 0;
  
  for (const offer of data) {
    if (offer.start_date && offer.end_date) {
      const start = new Date(offer.start_date);
      const end = new Date(offer.end_date);
      
      if (end < start) {
        logError(`"${offer.name}": End date (${offer.end_date}) is before start date (${offer.start_date})`);
        invalidDates++;
      }
    }
  }
  
  if (invalidDates === 0) {
    logSuccess(`All ${data.length} date ranges are valid`);
    testResults.passed++;
  } else {
    logError(`${invalidDates} offers have invalid date ranges`);
    testResults.failed++;
  }
}

async function testTimeRangeValidity() {
  logSection('TIME RANGE VALIDATION');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('name, valid_hours_start, valid_hours_end')
    .or('valid_hours_start.not.is.null,valid_hours_end.not.is.null');
  
  if (error) {
    logError(`Failed to query time ranges: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  if (data.length === 0) {
    logWarning('No offers with time ranges found');
    testResults.warnings++;
    return;
  }
  
  let invalidTimes = 0;
  
  for (const offer of data) {
    if (offer.valid_hours_start && offer.valid_hours_end) {
      // Basic time format validation (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!timeRegex.test(offer.valid_hours_start)) {
        logError(`"${offer.name}": Invalid start time format: ${offer.valid_hours_start}`);
        invalidTimes++;
      }
      
      if (!timeRegex.test(offer.valid_hours_end)) {
        logError(`"${offer.name}": Invalid end time format: ${offer.valid_hours_end}`);
        invalidTimes++;
      }
    }
  }
  
  if (invalidTimes === 0) {
    logSuccess(`All ${data.length} time ranges are valid`);
    testResults.passed++;
  } else {
    logError(`${invalidTimes} offers have invalid time formats`);
    testResults.failed++;
  }
}

async function testPromoCodeUniqueness() {
  logSection('PROMO CODE UNIQUENESS');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('name, promo_code')
    .not('promo_code', 'is', null);
  
  if (error) {
    logError(`Failed to query promo codes: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  if (data.length === 0) {
    logWarning('No offers with promo codes found');
    testResults.warnings++;
    return;
  }
  
  const codeMap = {};
  let duplicates = 0;
  
  for (const offer of data) {
    const code = offer.promo_code.toLowerCase();
    
    if (codeMap[code]) {
      logError(`Duplicate promo code "${offer.promo_code}" found in:`);
      logError(`  - ${codeMap[code]}`);
      logError(`  - ${offer.name}`);
      duplicates++;
    } else {
      codeMap[code] = offer.name;
    }
  }
  
  if (duplicates === 0) {
    logSuccess(`All ${data.length} promo codes are unique`);
    testResults.passed++;
  } else {
    logError(`Found ${duplicates} duplicate promo codes`);
    testResults.failed++;
  }
}

async function testUsageLimits() {
  logSection('USAGE LIMITS VALIDATION');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('name, usage_limit, usage_count')
    .not('usage_limit', 'is', null);
  
  if (error) {
    logError(`Failed to query usage limits: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  if (data.length === 0) {
    logWarning('No offers with usage limits found');
    testResults.warnings++;
    return;
  }
  
  let exceeded = 0;
  
  for (const offer of data) {
    const count = offer.usage_count || 0;
    
    if (count > offer.usage_limit) {
      logWarning(`"${offer.name}": Usage count (${count}) exceeds limit (${offer.usage_limit})`);
      exceeded++;
    }
  }
  
  if (exceeded === 0) {
    logSuccess(`All ${data.length} offers respect usage limits`);
    testResults.passed++;
  } else {
    logWarning(`${exceeded} offers have exceeded usage limits`);
    testResults.warnings++;
    testResults.passed++; // Not a failure, just a warning
  }
}

async function testItemFreeAddonBug() {
  logSection('🔴 CRITICAL BUG: item_free_addon - Missing free_addon_items');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('id, name, benefits, conditions')
    .eq('offer_type', 'item_free_addon');
  
  if (error) {
    logError(`Failed to query item_free_addon offers: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  if (data.length === 0) {
    logWarning('No item_free_addon offers found to test');
    testResults.warnings++;
    return;
  }
  
  logInfo(`Testing ${data.length} item_free_addon offer(s)\n`);
  
  let missingCount = 0;
  
  for (const offer of data) {
    log(`📋 "${offer.name}"`, 'cyan');
    
    const hasFreeAddonItems = offer.benefits?.free_addon_items;
    const hasApplicableItems = offer.conditions?.applicable_items;
    
    log(`   Benefits: ${JSON.stringify(offer.benefits || {})}`);
    log(`   Conditions: ${JSON.stringify(offer.conditions || {})}`);
    
    if (!hasFreeAddonItems) {
      logError(`   🔴 MISSING: free_addon_items in benefits`);
      logError(`      Impact: Cannot specify which items customer can get free`);
      logError(`      Example: "Free Coke with Burger" - can't select which beverages are free`);
      missingCount++;
    } else {
      logSuccess(`   ✅ Has free_addon_items field`);
    }
    
    if (!hasApplicableItems) {
      logWarning(`   ⚠️  Missing applicable_items in conditions`);
    }
    
    console.log('');
  }
  
  if (missingCount > 0) {
    logError(`🔴 BUG CONFIRMED: ${missingCount}/${data.length} offers missing free_addon_items`);
    logError('   Root cause: UI form does not collect free add-on items selection');
    logError('   Fix required: Add second item selector in create/edit form');
    logError('   See: docs/OFFER_FIX_IMPLEMENTATION.md for solution');
    testResults.failed++;
  } else {
    logSuccess('All item_free_addon offers have required fields');
    testResults.passed++;
  }
}

async function generateDatabaseReport() {
  logSection('DATABASE STATISTICS REPORT');
  
  // Total counts
  const { data: allOffers, error } = await supabase
    .from('offers')
    .select('*');
  
  if (error) {
    logError(`Failed to generate report: ${error.message}`);
    return;
  }
  
  log('\n📊 Database Statistics:', 'cyan');
  log(`   Total offers: ${allOffers.length}`);
  log(`   Active offers: ${allOffers.filter(o => o.is_active).length}`);
  log(`   Inactive offers: ${allOffers.filter(o => !o.is_active).length}`);
  
  // By application type
  const sessionLevel = allOffers.filter(o => o.application_type === 'session_level').length;
  const orderLevel = allOffers.filter(o => o.application_type === 'order_level').length;
  
  log(`\n📋 By Application Type:`);
  log(`   Session-level: ${sessionLevel}`);
  log(`   Order-level: ${orderLevel}`);
  
  // Offers with date ranges
  const withDates = allOffers.filter(o => o.start_date || o.end_date).length;
  log(`\n📅 Date Configuration:`);
  log(`   With date ranges: ${withDates}`);
  log(`   Without dates (always valid): ${allOffers.length - withDates}`);
  
  // Offers with time ranges
  const withTimes = allOffers.filter(o => o.valid_hours_start || o.valid_hours_end).length;
  log(`\n⏰ Time Configuration:`);
  log(`   With time ranges: ${withTimes}`);
  log(`   All-day offers: ${allOffers.length - withTimes}`);
  
  // Offers with usage limits
  const withLimits = allOffers.filter(o => o.usage_limit).length;
  log(`\n🎫 Usage Limits:`);
  log(`   With limits: ${withLimits}`);
  log(`   Unlimited: ${allOffers.length - withLimits}`);
  
  // Promo codes
  const withPromo = allOffers.filter(o => o.promo_code).length;
  log(`\n🏷️  Promo Codes:`);
  log(`   Offers with codes: ${withPromo}`);
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🗄️  DATABASE COMPREHENSIVE TESTS - OFFERS SYSTEM', 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  const startTime = Date.now();
  
  // Run tests
  const schemaValid = await testDatabaseSchema();
  
  if (schemaValid) {
    await testDataIntegrity();
    await testBenefitsConditionsStructure();
    await testOfferOrderRelationships();
    await testActiveInactiveOffers();
    await testDateRangeValidity();
    await testTimeRangeValidity();
    await testPromoCodeUniqueness();
    await testUsageLimits();
    await testItemFreeAddonBug();
    await generateDatabaseReport();
  }
  
  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  logSection('TEST SUMMARY');
  
  log(`\nTotal Tests: ${testResults.total}`, 'cyan');
  log(`✅ Passed: ${testResults.passed}`, 'green');
  log(`❌ Failed: ${testResults.failed}`, 'red');
  log(`⚠️  Warnings: ${testResults.warnings}`, 'yellow');
  log(`⏱️  Duration: ${duration}s`, 'cyan');
  
  if (testResults.failed === 0) {
    log('\n✅ ALL TESTS PASSED!', 'green');
  } else {
    log('\n❌ SOME TESTS FAILED - See above for details', 'red');
  }
  
  log('\n' + '='.repeat(60) + '\n', 'blue');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  logError(`\nUnexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
