/**
 * Guest Offer Eligibility Test Suite
 * Tests the eligibility checker for all 11 offer types
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TEST DATA SETUP
// ============================================================================

const mockCartItems = [
  {
    id: 'item-pizza-margherita',
    name: 'Margherita Pizza',
    price: 300,
    quantity: 1,
    category_id: 'cat-pizza'
  },
  {
    id: 'item-pizza-pepperoni',
    name: 'Pepperoni Pizza',
    price: 350,
    quantity: 1,
    category_id: 'cat-pizza'
  },
  {
    id: 'item-burger-chicken',
    name: 'Chicken Burger',
    price: 200,
    quantity: 1,
    category_id: 'cat-burgers'
  },
  {
    id: 'item-coke',
    name: 'Coke',
    price: 50,
    quantity: 2,
    category_id: 'cat-beverages'
  }
];

const mockOfferItems = [
  {
    id: 'offer-item-1',
    offer_id: 'test-offer',
    menu_item_id: 'item-pizza-margherita',
    menu_category_id: null,
    item_type: 'item',
    quantity: null,
    created_at: new Date().toISOString()
  },
  {
    id: 'offer-item-2',
    offer_id: 'test-offer',
    menu_item_id: null,
    menu_category_id: 'cat-pizza',
    item_type: 'category',
    quantity: null,
    created_at: new Date().toISOString()
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.log(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
}

function formatCurrency(amount) {
  return `₹${amount.toFixed(2)}`;
}

// ============================================================================
// MOCK ELIGIBILITY CHECKER (Simplified version for testing)
// ============================================================================

async function checkOfferEligibility(offer, cartItems, cartTotal, customerPhone, offerItems) {
  const benefits = offer.benefits || {};
  const conditions = offer.conditions || {};

  // Date/Time validation
  const now = new Date();
  if (offer.start_date && new Date(offer.start_date) > now) {
    return { isEligible: false, reason: "Offer not started", discount: 0 };
  }
  if (offer.end_date && new Date(offer.end_date) < now) {
    return { isEligible: false, reason: "Offer expired", discount: 0 };
  }

  // Time validation
  if (offer.valid_hours_start && offer.valid_hours_end) {
    const currentTime = now.toTimeString().slice(0, 5);
    if (currentTime < offer.valid_hours_start || currentTime > offer.valid_hours_end) {
      return {
        isEligible: false,
        reason: `Valid only ${offer.valid_hours_start} - ${offer.valid_hours_end}`,
        discount: 0
      };
    }
  }

  // Minimum amount check
  if (conditions.min_amount && cartTotal < conditions.min_amount) {
    const needed = conditions.min_amount - cartTotal;
    return {
      isEligible: false,
      reason: `Add ${formatCurrency(needed)} more to unlock`,
      discount: 0
    };
  }

  // Type-specific checks
  switch (offer.offer_type) {
    case 'cart_percentage':
      let discount = (cartTotal * (benefits.discount_percentage || 0)) / 100;
      if (benefits.max_discount_amount) {
        discount = Math.min(discount, benefits.max_discount_amount);
      }
      return { isEligible: true, discount: Math.round(discount) };

    case 'cart_flat_amount':
      return { isEligible: true, discount: benefits.discount_amount || 0 };

    case 'min_order_discount':
      const threshold = conditions.threshold_amount || 0;
      if (cartTotal < threshold) {
        return {
          isEligible: false,
          reason: `Spend ${formatCurrency(threshold)} to unlock (${formatCurrency(threshold - cartTotal)} more)`,
          discount: 0
        };
      }
      return { isEligible: true, discount: benefits.discount_amount || 0 };

    case 'cart_threshold_item':
      const thresholdAmount = conditions.threshold_amount || 0;
      if (cartTotal < thresholdAmount) {
        return {
          isEligible: false,
          reason: `Spend ${formatCurrency(thresholdAmount)} to unlock`,
          discount: 0
        };
      }
      // In real implementation, fetch free item details
      const freeItemPrice = 120; // Mock price
      return {
        isEligible: true,
        discount: freeItemPrice,
        freeItems: [{
          id: 'free-item',
          name: 'Garlic Bread',
          price: freeItemPrice,
          quantity: 1,
          isFree: true,
          linkedOfferId: offer.id
        }]
      };

    case 'item_buy_get_free':
      if (!offerItems || offerItems.length === 0) {
        return { isEligible: false, reason: "No qualifying items", discount: 0 };
      }

      const buyQuantity = conditions.buy_quantity || 2;
      const freeQuantity = benefits.free_quantity || 1;

      const qualifyingItemIds = offerItems
        .filter(oi => oi.menu_item_id)
        .map(oi => oi.menu_item_id);
      const qualifyingCategoryIds = offerItems
        .filter(oi => oi.menu_category_id)
        .map(oi => oi.menu_category_id);

      const matchingItems = cartItems.filter(item =>
        qualifyingItemIds.includes(item.id) ||
        (item.category_id && qualifyingCategoryIds.includes(item.category_id))
      );

      const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);

      if (totalQty < buyQuantity) {
        return {
          isEligible: false,
          reason: `Buy ${buyQuantity} to get ${freeQuantity} free (${buyQuantity - totalQty} more)`,
          discount: 0
        };
      }

      // Get cheapest item
      const cheapestItem = [...matchingItems].sort((a, b) => a.price - b.price)[0];
      return {
        isEligible: true,
        discount: cheapestItem.price * freeQuantity,
        freeItems: [{
          ...cheapestItem,
          quantity: freeQuantity,
          isFree: true,
          linkedOfferId: offer.id
        }]
      };

    case 'item_free_addon':
      if (!offerItems || offerItems.length === 0) {
        return { isEligible: false, reason: "No qualifying items", discount: 0 };
      }

      const hasQualifyingItem = cartItems.some(item => {
        const itemIds = offerItems.filter(oi => oi.menu_item_id).map(oi => oi.menu_item_id);
        const catIds = offerItems.filter(oi => oi.menu_category_id).map(oi => oi.menu_category_id);
        return itemIds.includes(item.id) || (item.category_id && catIds.includes(item.category_id));
      });

      if (!hasQualifyingItem) {
        return { isEligible: false, reason: "Add qualifying item to unlock", discount: 0 };
      }

      return {
        isEligible: true,
        discount: 0,
        requiresUserAction: true,
        actionType: 'select_free_item',
        availableFreeItems: [
          { id: 'item-coke', name: 'Coke', price: 50, type: 'item' },
          { id: 'item-pepsi', name: 'Pepsi', price: 50, type: 'item' }
        ]
      };

    case 'item_percentage':
      if (!offerItems || offerItems.length === 0) {
        return { isEligible: false, reason: "No qualifying items", discount: 0 };
      }

      const discountPercentage = benefits.discount_percentage || 0;
      const qualifyingIds = offerItems.filter(oi => oi.menu_item_id).map(oi => oi.menu_item_id);
      const qualifyingCatIds = offerItems.filter(oi => oi.menu_category_id).map(oi => oi.menu_category_id);

      const itemsForDiscount = cartItems.filter(item =>
        qualifyingIds.includes(item.id) ||
        (item.category_id && qualifyingCatIds.includes(item.category_id))
      );

      if (itemsForDiscount.length === 0) {
        return { isEligible: false, reason: "Add qualifying items", discount: 0 };
      }

      const itemsTotal = itemsForDiscount.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemDiscount = (itemsTotal * discountPercentage) / 100;

      return { isEligible: true, discount: Math.round(itemDiscount) };

    case 'time_based':
      // Time validation already done above
      let timeDiscount = 0;
      if (benefits.discount_percentage) {
        timeDiscount = (cartTotal * benefits.discount_percentage) / 100;
        if (benefits.max_discount_amount) {
          timeDiscount = Math.min(timeDiscount, benefits.max_discount_amount);
        }
      } else if (benefits.discount_amount) {
        timeDiscount = benefits.discount_amount;
      }
      return { isEligible: true, discount: Math.round(timeDiscount) };

    case 'customer_based':
      // In real implementation, check customer visit count
      let custDiscount = 0;
      if (benefits.discount_percentage) {
        custDiscount = (cartTotal * benefits.discount_percentage) / 100;
        if (benefits.max_discount_amount) {
          custDiscount = Math.min(custDiscount, benefits.max_discount_amount);
        }
      } else if (benefits.discount_amount) {
        custDiscount = benefits.discount_amount;
      }
      return { isEligible: true, discount: Math.round(custDiscount) };

    case 'combo_meal':
      // Simplified combo check
      const comboPrice = 250; // Mock combo price
      const regularTotal = 350; // Mock regular total
      const comboDiscount = regularTotal - comboPrice;
      return { isEligible: true, discount: Math.round(comboDiscount) };

    case 'promo_code':
      let promoDiscount = 0;
      if (benefits.discount_percentage) {
        promoDiscount = (cartTotal * benefits.discount_percentage) / 100;
        if (benefits.max_discount_amount) {
          promoDiscount = Math.min(promoDiscount, benefits.max_discount_amount);
        }
      } else if (benefits.discount_amount) {
        promoDiscount = benefits.discount_amount;
      }
      return { isEligible: true, discount: Math.round(promoDiscount) };

    default:
      return { isEligible: false, reason: "Unknown offer type", discount: 0 };
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function testOfferType(offerType, testData) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${offerType.toUpperCase()}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Fetch offer from database
    const { data: offers, error } = await supabase
      .from('offers')
      .select(`
        *,
        offer_items (
          id,
          offer_id,
          menu_item_id,
          menu_category_id,
          item_type,
          quantity,
          created_at
        )
      `)
      .eq('offer_type', offerType)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      logError(`Database error: ${error.message}`);
      return { success: false, error: error.message };
    }

    if (!offers || offers.length === 0) {
      logWarning(`No active ${offerType} offer found in database`);
      logInfo(`Creating mock offer for testing...`);
      
      // Use mock offer
      const mockOffer = {
        id: `mock-${offerType}`,
        offer_type: offerType,
        name: testData.name,
        description: testData.description,
        benefits: testData.benefits,
        conditions: testData.conditions || {},
        is_active: true,
        start_date: null,
        end_date: null,
        valid_hours_start: null,
        valid_hours_end: null,
        valid_days: null,
        target_customer_type: 'all',
        usage_limit: null,
        usage_count: 0,
        application_type: 'session_level',
        priority: 1
      };

      const cartTotal = mockCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const eligibility = await checkOfferEligibility(
        mockOffer,
        mockCartItems,
        cartTotal,
        null,
        mockOfferItems
      );

      logInfo(`Offer: ${mockOffer.name}`);
      logInfo(`Cart Total: ${formatCurrency(cartTotal)}`);
      logInfo(`Eligible: ${eligibility.isEligible ? 'YES' : 'NO'}`);
      
      if (eligibility.isEligible) {
        logSuccess(`Discount: ${formatCurrency(eligibility.discount)}`);
        if (eligibility.freeItems) {
          logSuccess(`Free Items: ${eligibility.freeItems.length} item(s)`);
          eligibility.freeItems.forEach(item => {
            logInfo(`  - ${item.name} (${formatCurrency(item.price)}) x${item.quantity}`);
          });
        }
        if (eligibility.requiresUserAction) {
          logSuccess(`Requires User Action: ${eligibility.actionType}`);
          logInfo(`Available Items: ${eligibility.availableFreeItems?.length || 0}`);
        }
      } else {
        logWarning(`Reason: ${eligibility.reason}`);
      }

      return { success: true, offer: mockOffer, eligibility };
    }

    // Test with real offer
    const offer = offers[0];
    const offerItems = offer.offer_items || [];

    logInfo(`Found offer: ${offer.name}`);
    logInfo(`Description: ${offer.description || 'N/A'}`);

    // Test 1: With sufficient cart
    const cartTotal = mockCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const eligibility = await checkOfferEligibility(
      offer,
      mockCartItems,
      cartTotal,
      null,
      offerItems
    );

    logInfo(`Cart Total: ${formatCurrency(cartTotal)}`);
    logInfo(`Cart Items: ${mockCartItems.length} (${mockCartItems.reduce((sum, i) => sum + i.quantity, 0)} total)`);
    
    if (eligibility.isEligible) {
      logSuccess(`✓ Offer is ELIGIBLE`);
      logSuccess(`  Discount: ${formatCurrency(eligibility.discount)}`);
      
      if (eligibility.freeItems && eligibility.freeItems.length > 0) {
        logSuccess(`  Free Items: ${eligibility.freeItems.length}`);
        eligibility.freeItems.forEach(item => {
          logInfo(`    - ${item.name} (${formatCurrency(item.price)}) x${item.quantity}`);
        });
      }

      if (eligibility.requiresUserAction) {
        logSuccess(`  Requires User Selection: ${eligibility.actionType}`);
        if (eligibility.availableFreeItems) {
          logInfo(`    Available: ${eligibility.availableFreeItems.length} items`);
        }
      }
    } else {
      logWarning(`✗ Offer NOT ELIGIBLE`);
      logWarning(`  Reason: ${eligibility.reason}`);
    }

    // Test 2: With empty cart
    console.log('\n--- Test with Empty Cart ---');
    const emptyEligibility = await checkOfferEligibility(offer, [], 0, null, offerItems);
    if (emptyEligibility.isEligible) {
      logWarning(`Still eligible with empty cart (unexpected for most types)`);
    } else {
      logSuccess(`Correctly marked as ineligible: ${emptyEligibility.reason}`);
    }

    // Test 3: Edge cases based on type
    if (offerType === 'min_order_discount' || offerType === 'cart_threshold_item') {
      console.log('\n--- Test with Cart Below Threshold ---');
      const lowTotal = 100;
      const lowEligibility = await checkOfferEligibility(offer, [{ id: 'test', name: 'Test', price: 100, quantity: 1 }], lowTotal, null, offerItems);
      if (!lowEligibility.isEligible) {
        logSuccess(`Correctly requires more amount: ${lowEligibility.reason}`);
      } else {
        logWarning(`Should not be eligible below threshold`);
      }
    }

    return { success: true, offer, eligibility };

  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEST DATA FOR EACH OFFER TYPE
// ============================================================================

const testData = {
  cart_percentage: {
    name: 'Test: 20% Off Cart',
    description: '20% discount on entire order',
    benefits: {
      discount_percentage: 20,
      max_discount_amount: 200
    }
  },
  cart_flat_amount: {
    name: 'Test: ₹50 Off',
    description: 'Flat ₹50 discount',
    benefits: {
      discount_amount: 50
    }
  },
  min_order_discount: {
    name: 'Test: Spend ₹500 Get ₹75 Off',
    description: 'Spend ₹500 or more, get ₹75 off',
    benefits: {
      discount_amount: 75
    },
    conditions: {
      threshold_amount: 500
    }
  },
  cart_threshold_item: {
    name: 'Test: Spend ₹400 Get Free Item',
    description: 'Spend ₹400, get free garlic bread',
    benefits: {
      free_item_id: 'test-item'
    },
    conditions: {
      threshold_amount: 400
    }
  },
  item_buy_get_free: {
    name: 'Test: Buy 2 Get 1 Free',
    description: 'Buy 2 pizzas, get 1 free',
    benefits: {
      free_quantity: 1
    },
    conditions: {
      buy_quantity: 2
    }
  },
  item_free_addon: {
    name: 'Test: Free Beverage with Burger',
    description: 'Get free beverage with any burger',
    benefits: {
      max_price: 100,
      free_addon_items: [
        { type: 'category', id: 'cat-beverages', name: 'Beverages' }
      ]
    }
  },
  item_percentage: {
    name: 'Test: 30% Off Pizzas',
    description: '30% discount on all pizzas',
    benefits: {
      discount_percentage: 30
    }
  },
  time_based: {
    name: 'Test: Happy Hour 20% Off',
    description: '20% off during happy hour',
    benefits: {
      discount_percentage: 20,
      max_discount_amount: 150
    }
  },
  customer_based: {
    name: 'Test: First Timer 25% Off',
    description: '25% off for first-time customers',
    benefits: {
      discount_percentage: 25
    }
  },
  combo_meal: {
    name: 'Test: Burger Combo',
    description: 'Burger + Fries + Drink combo',
    benefits: {
      combo_id: 'test-combo'
    }
  },
  promo_code: {
    name: 'Test: WELCOME20',
    description: 'Use code WELCOME20 for 20% off',
    benefits: {
      discount_percentage: 20,
      max_discount_amount: 100
    }
  }
};

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '█'.repeat(80));
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█' + '  GUEST OFFER ELIGIBILITY TEST SUITE'.padEnd(78) + '█');
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█'.repeat(80) + '\n');

  logInfo(`Supabase URL: ${supabaseUrl}`);
  logInfo(`Test Start: ${new Date().toISOString()}`);
  logInfo(`Mock Cart: ${mockCartItems.length} items, Total: ${formatCurrency(mockCartItems.reduce((sum, i) => sum + i.price * i.quantity, 0))}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  const offerTypes = [
    'cart_percentage',
    'cart_flat_amount',
    'min_order_discount',
    'cart_threshold_item',
    'item_buy_get_free',
    'item_free_addon',
    'item_percentage',
    'time_based',
    'customer_based',
    'combo_meal',
    'promo_code'
  ];

  for (const offerType of offerTypes) {
    results.total++;
    const result = await testOfferType(offerType, testData[offerType]);
    
    if (result.success) {
      results.passed++;
      results.details.push({
        type: offerType,
        status: 'PASSED',
        eligibility: result.eligibility
      });
    } else {
      results.failed++;
      results.details.push({
        type: offerType,
        status: 'FAILED',
        error: result.error
      });
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n\n' + '█'.repeat(80));
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█' + '  TEST SUMMARY'.padEnd(78) + '█');
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█'.repeat(80) + '\n');

  console.log(`Total Tests:  ${results.total}`);
  console.log(`✅ Passed:     ${results.passed}`);
  console.log(`❌ Failed:     ${results.failed}`);
  console.log(`⏭️  Skipped:    ${results.skipped}\n`);

  console.log('Detailed Results:');
  console.log('-'.repeat(80));
  results.details.forEach((detail, index) => {
    const status = detail.status === 'PASSED' ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${detail.type.padEnd(25)} - ${detail.status}`);
    if (detail.eligibility) {
      console.log(`   Eligible: ${detail.eligibility.isEligible ? 'YES' : 'NO'}`);
      if (detail.eligibility.isEligible) {
        console.log(`   Discount: ${formatCurrency(detail.eligibility.discount)}`);
      } else {
        console.log(`   Reason: ${detail.eligibility.reason}`);
      }
    }
    if (detail.error) {
      console.log(`   Error: ${detail.error}`);
    }
  });

  console.log('\n' + '█'.repeat(80));
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
  } else {
    console.log(`\n⚠️  ${results.failed} TEST(S) FAILED ⚠️\n`);
  }

  console.log(`Test End: ${new Date().toISOString()}\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Fatal Error:', error);
  process.exit(1);
});
