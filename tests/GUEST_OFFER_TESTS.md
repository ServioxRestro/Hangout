# Guest Offer System Tests

This directory contains tests for the guest-side offer eligibility system.

## Test Files

### 1. `guest-offer-eligibility-test.js`

Comprehensive Node.js test suite for all 11 offer types.

**What it tests:**

- ✅ cart_percentage - Percentage discounts with max caps
- ✅ cart_flat_amount - Fixed amount discounts
- ✅ min_order_discount - Threshold-based discounts
- ✅ cart_threshold_item - Free items when threshold reached
- ✅ item_buy_get_free - Buy X Get Y free logic
- ✅ item_free_addon - Free add-on selection
- ✅ item_percentage - Percentage off specific items
- ✅ time_based - Time-restricted offers
- ✅ customer_based - Customer type based offers
- ✅ combo_meal - Combo meal pricing
- ✅ promo_code - Promo code validation

**Run:**

```bash
npm run test:offers:guest
```

## Test Results

### Latest Run (October 28, 2025)

```
Total Tests:  11
✅ Passed:     11
❌ Failed:     0
⏭️  Skipped:    0
```

All offer types tested successfully!

### Detailed Results:

1. ✅ **cart_percentage** - Eligible: YES, Discount: ₹95.00
2. ✅ **cart_flat_amount** - Eligible: YES, Discount: ₹100.00
3. ✅ **min_order_discount** - Eligible: YES, Discount: ₹50.00
4. ✅ **cart_threshold_item** - Eligible: YES, Discount: ₹120.00 + 1 free item
5. ✅ **item_buy_get_free** - Correctly validates qualifying items
6. ✅ **item_free_addon** - Correctly validates qualifying items
7. ✅ **item_percentage** - Correctly validates qualifying items
8. ✅ **time_based** - Correctly validates time windows (16:00-19:00)
9. ✅ **customer_based** - Eligible: YES, Discount: ₹150.00
10. ✅ **combo_meal** - Eligible: YES, Discount: ₹100.00
11. ✅ **promo_code** - Eligible: YES, Discount: ₹95.00

## Test Coverage

### Eligibility Validation

- ✅ Date/time restrictions
- ✅ Minimum amount requirements
- ✅ Customer type validation
- ✅ Qualifying items check
- ✅ Usage limits

### Discount Calculations

- ✅ Percentage discounts with max caps
- ✅ Flat amount discounts
- ✅ Threshold-based discounts
- ✅ Item-specific discounts
- ✅ Combo pricing

### Free Item Logic

- ✅ Auto-add free items
- ✅ Cheapest item selection (Buy X Get Y)
- ✅ User choice modal (Free add-on)
- ✅ Linked item removal prevention

### Edge Cases

- ✅ Empty cart validation
- ✅ Below threshold handling
- ✅ Invalid time windows
- ✅ Missing qualifying items
- ✅ Expired offers

## Mock Data

Tests use realistic mock cart data:

```javascript
mockCartItems = [
  {
    id: "item-pizza-margherita",
    name: "Margherita Pizza",
    price: 300,
    quantity: 1,
  },
  {
    id: "item-pizza-pepperoni",
    name: "Pepperoni Pizza",
    price: 350,
    quantity: 1,
  },
  {
    id: "item-burger-chicken",
    name: "Chicken Burger",
    price: 200,
    quantity: 1,
  },
  { id: "item-coke", name: "Coke", price: 50, quantity: 2 },
];
// Total: ₹950
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Test Guest Offers
  run: npm run test:offers:guest
```

## Troubleshooting

### Test Fails with "No offers found"

- Check that offers are created in database
- Verify `is_active = true`
- Run `npm run test:offers:admin` first to create test offers

### Eligibility always returns false

- Check offer dates (start_date/end_date)
- Verify time windows (valid_hours_start/valid_hours_end)
- Confirm cart meets minimum requirements

### Free items not appearing

- Verify `offer_items` table has correct links
- Check `benefits.free_item_id` is set
- Ensure cart has qualifying items

## Next Steps

- [ ] Add performance benchmarks
- [ ] Test concurrent offer applications
- [ ] Add stress tests (1000+ items)
- [ ] Test offer stacking rules
- [ ] Add visual regression tests for UI components

## Related Documentation

- `docs/GUEST_OFFER_SYSTEM_DESIGN.md` - Complete design specs
- `docs/GUEST_OFFER_IMPLEMENTATION.md` - Implementation guide
- `lib/offers/eligibility.ts` - Core eligibility checker
