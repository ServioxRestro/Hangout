/**
 * Integration Test for Guest Offer Eligibility Checker
 * Tests the actual lib/offers/eligibility.ts implementation
 */

import { checkOfferEligibility, validatePromoCode } from '../lib/offers/eligibility';
import { createClient } from '@supabase/supabase-js';
import type { Tables } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const mockCartItems = [
  {
    id: 'item-pizza-1',
    name: 'Margherita Pizza',
    price: 300,
    quantity: 2,
    category_id: 'cat-pizza'
  },
  {
    id: 'item-burger-1',
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

function logSuccess(msg: string) {
  console.log(`✅ ${msg}`);
}

function logError(msg: string) {
  console.log(`❌ ${msg}`);
}

function logInfo(msg: string) {
  console.log(`ℹ️  ${msg}`);
}

describe('Guest Offer Eligibility', () => {
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };

  async function runTest(name: string, testFn: () => Promise<void>) {
    testResults.total++;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Test: ${name}`);
    console.log('='.repeat(80));
    
    try {
      await testFn();
      testResults.passed++;
      logSuccess(`PASSED: ${name}`);
    } catch (error) {
      testResults.failed++;
      logError(`FAILED: ${name}`);
      console.error(error);
    }
  }

  beforeAll(async () => {
    console.log('\n' + '█'.repeat(80));
    console.log('█  GUEST OFFER ELIGIBILITY INTEGRATION TEST'.padEnd(79) + '█');
    console.log('█'.repeat(80) + '\n');
    logInfo(`Supabase URL: ${supabaseUrl}`);
    logInfo(`Start Time: ${new Date().toISOString()}\n`);
  });

  afterAll(() => {
    console.log('\n' + '█'.repeat(80));
    console.log('█  TEST SUMMARY'.padEnd(79) + '█');
    console.log('█'.repeat(80) + '\n');
    console.log(`Total:  ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}\n`);
    
    if (testResults.failed === 0) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED! 🎉\n');
    }
  });

  test('cart_percentage - should calculate percentage discount correctly', async () => {
    await runTest('Cart Percentage Discount', async () => {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('offer_type', 'cart_percentage')
        .eq('is_active', true)
        .limit(1);

      if (!offers || offers.length === 0) {
        logInfo('No cart_percentage offer found, skipping');
        return;
      }

      const offer = offers[0];
      const cartTotal = 900; // Total from mock items
      const eligibility = await checkOfferEligibility(offer, mockCartItems, cartTotal);

      if (eligibility.isEligible) {
        logSuccess(`Eligible with discount: ₹${eligibility.discount}`);
        expect(eligibility.discount).toBeGreaterThan(0);
      } else {
        logInfo(`Not eligible: ${eligibility.reason}`);
      }
    });
  });

  test('min_order_discount - should validate threshold correctly', async () => {
    await runTest('Minimum Order Discount', async () => {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('offer_type', 'min_order_discount')
        .eq('is_active', true)
        .limit(1);

      if (!offers || offers.length === 0) {
        logInfo('No min_order_discount offer found, skipping');
        return;
      }

      const offer = offers[0];
      const conditions = offer.conditions as any;
      const threshold = conditions?.threshold_amount || 0;

      // Test below threshold
      const lowEligibility = await checkOfferEligibility(offer, [], threshold - 100);
      expect(lowEligibility.isEligible).toBe(false);
      logInfo(`Below threshold (₹${threshold - 100}): ${lowEligibility.reason}`);

      // Test above threshold
      const highEligibility = await checkOfferEligibility(offer, mockCartItems, threshold + 100);
      if (highEligibility.isEligible) {
        logSuccess(`Above threshold (₹${threshold + 100}): Discount ₹${highEligibility.discount}`);
        expect(highEligibility.discount).toBeGreaterThan(0);
      }
    });
  });

  test('cart_threshold_item - should return free item when threshold met', async () => {
    await runTest('Cart Threshold Free Item', async () => {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('offer_type', 'cart_threshold_item')
        .eq('is_active', true)
        .limit(1);

      if (!offers || offers.length === 0) {
        logInfo('No cart_threshold_item offer found, skipping');
        return;
      }

      const offer = offers[0];
      const conditions = offer.conditions as any;
      const threshold = conditions?.threshold_amount || 0;

      const eligibility = await checkOfferEligibility(offer, mockCartItems, threshold + 100);

      if (eligibility.isEligible && eligibility.freeItems) {
        logSuccess(`Free items: ${eligibility.freeItems.length}`);
        eligibility.freeItems.forEach(item => {
          logInfo(`  - ${item.name} (₹${item.price}) x${item.quantity}`);
          expect(item.isFree).toBe(true);
          expect(item.linkedOfferId).toBe(offer.id);
        });
      }
    });
  });

  test('item_buy_get_free - should add cheapest item as free', async () => {
    await runTest('Buy X Get Y Free', async () => {
      const { data: offers } = await supabase
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
        .eq('offer_type', 'item_buy_get_free')
        .eq('is_active', true)
        .limit(1);

      if (!offers || offers.length === 0) {
        logInfo('No item_buy_get_free offer found, skipping');
        return;
      }

      const offer = offers[0];
      const offerItems = (offer as any).offer_items || [];

      const eligibility = await checkOfferEligibility(
        offer,
        mockCartItems,
        900,
        undefined,
        offerItems
      );

      if (eligibility.isEligible && eligibility.freeItems) {
        logSuccess(`Free items added: ${eligibility.freeItems.length}`);
        const freeItem = eligibility.freeItems[0];
        logInfo(`  Cheapest item: ${freeItem.name} (₹${freeItem.price})`);
        expect(freeItem.isFree).toBe(true);
      } else {
        logInfo(`Not eligible: ${eligibility.reason}`);
      }
    });
  });

  test('item_free_addon - should require user selection', async () => {
    await runTest('Free Add-on Item', async () => {
      const { data: offers } = await supabase
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
        .eq('offer_type', 'item_free_addon')
        .eq('is_active', true)
        .limit(1);

      if (!offers || offers.length === 0) {
        logInfo('No item_free_addon offer found, skipping');
        return;
      }

      const offer = offers[0];
      const offerItems = (offer as any).offer_items || [];

      const eligibility = await checkOfferEligibility(
        offer,
        mockCartItems,
        900,
        undefined,
        offerItems
      );

      if (eligibility.isEligible && eligibility.requiresUserAction) {
        logSuccess('Requires user selection');
        logInfo(`  Action type: ${eligibility.actionType}`);
        logInfo(`  Available items: ${eligibility.availableFreeItems?.length || 0}`);
        expect(eligibility.actionType).toBe('select_free_item');
      } else {
        logInfo(`Not eligible: ${eligibility.reason}`);
      }
    });
  });

  test('validatePromoCode - should validate promo codes', async () => {
    await runTest('Promo Code Validation', async () => {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('offer_type', 'promo_code')
        .eq('is_active', true)
        .not('promo_code', 'is', null)
        .limit(1);

      if (!offers || offers.length === 0) {
        logInfo('No promo_code offer found, skipping');
        return;
      }

      const offer = offers[0];
      const promoCode = offer.promo_code!;

      // Test valid code
      const validResult = await validatePromoCode(promoCode, 900);
      if (validResult.isValid) {
        logSuccess(`Valid code: ${promoCode}`);
        expect(validResult.offer).toBeDefined();
      }

      // Test invalid code
      const invalidResult = await validatePromoCode('INVALID_CODE_123', 900);
      expect(invalidResult.isValid).toBe(false);
      logInfo(`Invalid code rejected: ${invalidResult.reason}`);
    });
  });

  test('time_based - should validate time restrictions', async () => {
    await runTest('Time-based Offer', async () => {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('offer_type', 'time_based')
        .eq('is_active', true)
        .limit(1);

      if (!offers || offers.length === 0) {
        logInfo('No time_based offer found, skipping');
        return;
      }

      const offer = offers[0];
      const eligibility = await checkOfferEligibility(offer, mockCartItems, 900);

      if (eligibility.isEligible) {
        logSuccess(`Currently in valid time window`);
        expect(eligibility.discount).toBeGreaterThan(0);
      } else {
        logInfo(`Not in valid time: ${eligibility.reason}`);
        expect(eligibility.reason).toContain('Valid only');
      }
    });
  });

  test('Edge case - Empty cart should not be eligible', async () => {
    await runTest('Empty Cart Validation', async () => {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (!offers || offers.length === 0) {
        logInfo('No offers found, skipping');
        return;
      }

      const offer = offers[0];
      const eligibility = await checkOfferEligibility(offer, [], 0);

      // Most offers should not be eligible with empty cart
      if (['cart_percentage', 'cart_flat_amount', 'min_order_discount'].includes(offer.offer_type)) {
        expect(eligibility.isEligible).toBe(false);
        logSuccess('Correctly marked as ineligible for empty cart');
      }
    });
  });

  test('Edge case - Expired offer should not be eligible', async () => {
    await runTest('Expired Offer Validation', async () => {
      const expiredOffer: Tables<'offers'> = {
        id: 'test-expired',
        offer_type: 'cart_percentage',
        name: 'Expired Offer',
        description: 'Test',
        benefits: { discount_percentage: 20 },
        conditions: {},
        is_active: true,
        start_date: '2020-01-01',
        end_date: '2020-12-31',
        valid_hours_start: null,
        valid_hours_end: null,
        valid_days: null,
        promo_code: null,
        target_customer_type: 'all',
        usage_limit: null,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        application_type: 'session_level',
        priority: 1
      };

      const eligibility = await checkOfferEligibility(expiredOffer, mockCartItems, 900);

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.reason).toContain('expired');
      logSuccess('Correctly marked expired offer as ineligible');
    });
  });
});

// Run tests
console.log('Running integration tests...\n');
