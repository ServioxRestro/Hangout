/**
 * SIMPLE NODE.JS OFFER SYSTEM TESTS
 * 
 * Tests all 11 offer types and their database structure
 * Run with: npm run test:offers
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions
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

// Offer type schemas
const OFFER_TYPE_SCHEMAS = {
  cart_percentage: {
    name: 'Cart % Discount',
    application_type: 'session_level',
    benefits_required: ['discount_percentage'],
    benefits_optional: ['max_discount_amount'],
    conditions_optional: ['min_amount'],
  },
  cart_flat_amount: {
    name: 'Cart Flat Discount',
    application_type: 'session_level',
    benefits_required: ['discount_amount'],
    conditions_required: ['min_amount'],
  },
  min_order_discount: {
    name: 'Minimum Order Discount',
    application_type: 'session_level',
    benefits_optional: ['discount_percentage', 'discount_amount', 'max_discount_amount'],
    conditions_required: ['min_amount'],
  },
  item_buy_get_free: {
    name: 'Buy X Get Y Free',
    application_type: 'order_level',
    benefits_required: ['get_quantity'],
    benefits_optional: ['get_same_item'],
    conditions_required: ['buy_quantity'],
  },
  cart_threshold_item: {
    name: 'Free Item on Threshold',
    application_type: 'order_level',
    benefits_optional: ['free_category', 'max_price'],
    conditions_required: ['min_amount'],
    conditions_optional: ['threshold_amount'],
  },
  item_free_addon: {
    name: 'Free Add-on Item',
    application_type: 'order_level',
    benefits_optional: ['max_price'],
    benefits_critical_missing: ['free_addon_items'], // 🔴 CRITICAL: Missing in UI
    conditions_optional: ['min_quantity'],
  },
  item_percentage: {
    name: 'Item % Discount',
    application_type: 'order_level',
    benefits_required: ['discount_percentage'],
    conditions_optional: ['min_quantity'],
  },
  combo_meal: {
    name: 'Combo Meal Deal',
    application_type: 'order_level',
    benefits_required: ['combo_price'],
    benefits_optional: ['is_customizable'],
  },
  time_based: {
    name: 'Time Slot Offer',
    application_type: 'session_level',
    benefits_optional: ['discount_percentage', 'discount_amount', 'max_discount_amount'],
    conditions_optional: ['min_amount'],
  },
  customer_based: {
    name: 'Customer Segment Offer',
    application_type: 'session_level',
    benefits_optional: ['discount_percentage', 'discount_amount', 'max_discount_amount'],
    conditions_optional: ['min_amount', 'min_orders_count'],
  },
  promo_code: {
    name: 'Promo/Coupon Code',
    application_type: 'session_level',
    benefits_optional: ['discount_percentage', 'discount_amount', 'max_discount_amount'],
    conditions_optional: ['min_amount'],
  },
};

// Test results tracker
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

async function testDatabaseConnection() {
  logSection('DATABASE CONNECTION TEST');
  
  try {
    const { data, error } = await supabase.from('offers').select('count').single();
    
    if (error) {
      logError(`Database connection failed: ${error.message}`);
      testResults.failed++;
      return false;
    }
    
    logSuccess('Database connection successful');
    testResults.passed++;
    return true;
  } catch (err) {
    logError(`Database connection error: ${err.message}`);
    testResults.failed++;
    return false;
  } finally {
    testResults.total++;
  }
}

async function testOffersTableStructure() {
  logSection('OFFERS TABLE STRUCTURE');
  
  testResults.total++;
  
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .limit(1);
    
    if (error) {
      logError(`Failed to query offers table: ${error.message}`);
      testResults.failed++;
      return false;
    }
    
    const requiredColumns = [
      'id', 'name', 'offer_type', 'application_type', 'benefits', 'conditions',
      'is_active', 'valid_days', 'valid_hours_start', 'valid_hours_end',
      'start_date', 'end_date', 'created_at', 'updated_at'
    ];
    
    if (data.length > 0) {
      const record = data[0];
      const existingColumns = Object.keys(record);
      
      logInfo(`Total columns: ${existingColumns.length}`);
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length === 0) {
        logSuccess('All required columns exist');
        testResults.passed++;
      } else {
        logError(`Missing columns: ${missingColumns.join(', ')}`);
        testResults.failed++;
      }
    } else {
      logWarning('No records in offers table to verify structure');
      testResults.warnings++;
    }
    
    return true;
  } catch (err) {
    logError(`Table structure test error: ${err.message}`);
    testResults.failed++;
    return false;
  }
}

async function testOfferTypeSchemas() {
  logSection('OFFER TYPE SCHEMAS VALIDATION');
  
  const offerTypes = Object.keys(OFFER_TYPE_SCHEMAS);
  
  for (const offerType of offerTypes) {
    testResults.total++;
    
    const schema = OFFER_TYPE_SCHEMAS[offerType];
    log(`\n📋 Testing: ${schema.name} (${offerType})`, 'cyan');
    
    // Fetch offers of this type
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('offer_type', offerType)
      .limit(5);
    
    if (error) {
      logError(`  Failed to query ${offerType}: ${error.message}`);
      testResults.failed++;
      continue;
    }
    
    if (data.length === 0) {
      logWarning(`  No offers found for ${offerType}`);
      testResults.warnings++;
      continue;
    }
    
    logInfo(`  Found ${data.length} offer(s)`);
    
    // Validate each offer
    let allValid = true;
    
    for (const offer of data) {
      // Check application_type
      if (offer.application_type !== schema.application_type) {
        logError(`  ❌ "${offer.name}": Wrong application_type (${offer.application_type}, expected ${schema.application_type})`);
        allValid = false;
      }
      
      // Check required benefits
      if (schema.benefits_required) {
        for (const field of schema.benefits_required) {
          if (!offer.benefits || offer.benefits[field] === undefined) {
            logError(`  ❌ "${offer.name}": Missing required benefit field: ${field}`);
            allValid = false;
          }
        }
      }
      
      // Check required conditions
      if (schema.conditions_required) {
        for (const field of schema.conditions_required) {
          if (!offer.conditions || offer.conditions[field] === undefined) {
            logError(`  ❌ "${offer.name}": Missing required condition field: ${field}`);
            allValid = false;
          }
        }
      }
      
      // Check critical missing fields
      if (schema.benefits_critical_missing) {
        for (const field of schema.benefits_critical_missing) {
          if (!offer.benefits || offer.benefits[field] === undefined) {
            logError(`  🔴 CRITICAL: "${offer.name}": Missing ${field} field`);
            logError(`     This is the known bug - UI doesn't collect this data`);
            allValid = false;
          }
        }
      }
    }
    
    if (allValid) {
      logSuccess(`  All ${offerType} offers are valid`);
      testResults.passed++;
    } else {
      testResults.failed++;
    }
  }
}

async function testApplicationTypes() {
  logSection('APPLICATION TYPES VALIDATION');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('offer_type, application_type');
  
  if (error) {
    logError(`Failed to query application types: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  const validTypes = ['session_level', 'order_level'];
  let allValid = true;
  
  for (const offer of data) {
    if (!validTypes.includes(offer.application_type)) {
      logError(`Invalid application_type: ${offer.application_type} for ${offer.offer_type}`);
      allValid = false;
    }
    
    // Verify against schema
    const expectedType = OFFER_TYPE_SCHEMAS[offer.offer_type]?.application_type;
    if (expectedType && offer.application_type !== expectedType) {
      logError(`Mismatch: ${offer.offer_type} has ${offer.application_type}, expected ${expectedType}`);
      allValid = false;
    }
  }
  
  if (allValid) {
    logSuccess(`All ${data.length} offers have valid application_type`);
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function testCriticalBugItemFreeAddon() {
  logSection('CRITICAL BUG: item_free_addon');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('name, benefits, conditions')
    .eq('offer_type', 'item_free_addon');
  
  if (error) {
    logError(`Failed to query item_free_addon offers: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  if (data.length === 0) {
    logWarning('No item_free_addon offers found');
    testResults.warnings++;
    return;
  }
  
  logInfo(`Found ${data.length} item_free_addon offer(s)\n`);
  
  let hasIssue = false;
  
  for (const offer of data) {
    log(`Offer: "${offer.name}"`, 'cyan');
    
    const hasFreeAddonItems = offer.benefits?.free_addon_items;
    const hasApplicableItems = offer.conditions?.applicable_items;
    
    log(`  Benefits keys: ${Object.keys(offer.benefits || {}).join(', ')}`);
    log(`  Conditions keys: ${Object.keys(offer.conditions || {}).join(', ')}`);
    
    if (!hasFreeAddonItems) {
      logError(`  🔴 MISSING: free_addon_items field`);
      logError(`     This offer cannot specify which items are free add-ons!`);
      hasIssue = true;
    } else {
      logSuccess(`  Has free_addon_items field`);
    }
    
    if (!hasApplicableItems) {
      logWarning(`  Missing applicable_items (qualifying items)`);
    }
    
    console.log('');
  }
  
  if (hasIssue) {
    logError('BUG CONFIRMED: item_free_addon offers missing free_addon_items field');
    logError('Impact: Admin cannot specify which items can be chosen as free add-ons');
    logError('Fix needed: Update UI to collect free_addon_items in benefits');
    testResults.failed++;
  } else {
    logSuccess('All item_free_addon offers have required fields');
    testResults.passed++;
  }
}

async function testJSONFieldStructure() {
  logSection('JSON FIELDS (benefits & conditions) VALIDATION');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('name, offer_type, benefits, conditions');
  
  if (error) {
    logError(`Failed to query JSON fields: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  let allValid = true;
  
  for (const offer of data) {
    // Check benefits is an object
    if (typeof offer.benefits !== 'object' || offer.benefits === null) {
      logError(`"${offer.name}": benefits is not a valid JSON object`);
      allValid = false;
    }
    
    // Check conditions is an object or null
    if (offer.conditions !== null && typeof offer.conditions !== 'object') {
      logError(`"${offer.name}": conditions is not a valid JSON object`);
      allValid = false;
    }
  }
  
  if (allValid) {
    logSuccess(`All ${data.length} offers have valid JSON structure`);
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function testValidDaysFormat() {
  logSection('VALID DAYS FORMAT VALIDATION');
  
  testResults.total++;
  
  const { data, error } = await supabase
    .from('offers')
    .select('name, valid_days')
    .not('valid_days', 'is', null);
  
  if (error) {
    logError(`Failed to query valid_days: ${error.message}`);
    testResults.failed++;
    return;
  }
  
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let allValid = true;
  
  for (const offer of data) {
    if (!Array.isArray(offer.valid_days)) {
      logError(`"${offer.name}": valid_days is not an array`);
      allValid = false;
      continue;
    }
    
    for (const day of offer.valid_days) {
      if (!validDays.includes(day.toLowerCase())) {
        logError(`"${offer.name}": Invalid day "${day}"`);
        allValid = false;
      }
    }
  }
  
  if (allValid) {
    logSuccess(`All ${data.length} offers have valid days format`);
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function testOfferTypeDistribution() {
  logSection('OFFER TYPE DISTRIBUTION');
  
  const { data, error } = await supabase
    .from('offers')
    .select('offer_type');
  
  if (error) {
    logError(`Failed to query offer types: ${error.message}`);
    return;
  }
  
  const distribution = {};
  
  for (const offer of data) {
    distribution[offer.offer_type] = (distribution[offer.offer_type] || 0) + 1;
  }
  
  log('\nOffer Type Distribution:', 'cyan');
  
  const allTypes = Object.keys(OFFER_TYPE_SCHEMAS);
  
  for (const type of allTypes) {
    const count = distribution[type] || 0;
    const schema = OFFER_TYPE_SCHEMAS[type];
    
    if (count > 0) {
      log(`  ✅ ${schema.name.padEnd(30)} (${type.padEnd(20)}): ${count} offer(s)`, 'green');
    } else {
      log(`  ⚠️  ${schema.name.padEnd(30)} (${type.padEnd(20)}): 0 offers`, 'yellow');
    }
  }
  
  log(`\nTotal offers in database: ${data.length}`, 'cyan');
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🧪 OFFER SYSTEM - NODE.JS TESTS', 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  const startTime = Date.now();
  
  // Run tests
  const connected = await testDatabaseConnection();
  
  if (connected) {
    await testOffersTableStructure();
    await testApplicationTypes();
    await testJSONFieldStructure();
    await testValidDaysFormat();
    await testOfferTypeSchemas();
    await testCriticalBugItemFreeAddon();
    await testOfferTypeDistribution();
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
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  logError(`\nUnexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
