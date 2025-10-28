# Admin Offer System - Testing Quick Reference

## 🚀 Running Integration Tests

### Prerequisites

1. Ensure `.env.local` file exists with Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Run Full Integration Test Suite

```bash
node tests/integration/admin-offer-crud-integration.test.js
```

**What it tests:**

- ✅ All 11 offer types creation
- ✅ Edit operations (update, toggle status)
- ✅ Data validation (JSONB, dates, flags)
- ✅ Frontend-backend compatibility
- ✅ Real-world scenarios

**Expected Output:**

```
═══════════════════════════════════════════════════════════
                    TEST SUMMARY
═══════════════════════════════════════════════════════════
Total Tests:  19
✅ Passed:     19
❌ Failed:     0
Pass Rate:    100.0%
═══════════════════════════════════════════════════════════
```

---

## 📋 Test Categories

### 1. Offer Type Creation Tests (11 tests)

Tests creating all offer types with real-world data:

| Test # | Offer Type          | Scenario                     |
| ------ | ------------------- | ---------------------------- |
| 1      | Buy X Get Y Free    | Weekend BOGO dosa offer      |
| 2      | Free Add-on         | Free chutney with dosa       |
| 3      | Combo Meal          | Breakfast combo ₹99          |
| 4      | Cart Percentage     | Happy hour 20% off           |
| 5      | Cart Flat Amount    | Flat ₹100 off                |
| 6      | Min Order Discount  | 15% off on ₹1000+            |
| 7      | Cart Threshold Item | Free dessert on ₹800+        |
| 8      | Item Percentage     | 25% off beverages            |
| 9      | Time-Based          | Breakfast hours 10% off      |
| 10     | Customer-Based      | First-time customer ₹150 off |
| 11     | Promo Code          | DIWALI2025 promo             |

### 2. Edit Operation Tests (3 tests)

| Test # | Operation     | Description                              |
| ------ | ------------- | ---------------------------------------- |
| 12     | BOGO Edit     | Update buy/get quantities                |
| 13     | Complex Edit  | Multi-field update (name, days, amounts) |
| 14     | Toggle Active | Deactivate/reactivate offer              |

### 3. Validation Tests (5 tests)

| Test # | Validation      | Purpose                                          |
| ------ | --------------- | ------------------------------------------------ |
| 15     | JSONB Structure | Custom fields preservation                       |
| 16     | Date Range      | Start/end date validation                        |
| 17     | Priority System | Multiple priorities ordering                     |
| 18     | Customer Types  | All 4 types: all, first_time, returning, loyalty |
| 19     | Order Types     | Dine-in/takeaway flags                           |

---

## 🔬 Test Scenarios by Offer Type

### 1. Buy X Get Y Free (BOGO)

```javascript
{
  name: 'Buy 2 Dosa Get 1 Free - Weekend Special',
  offer_type: 'item_buy_get_free',
  application_type: 'order_level',
  valid_days: ['saturday', 'sunday'],
  valid_hours: '10:00:00 - 22:00:00',
  conditions: { buy_quantity: 2 },
  benefits: { get_quantity: 1, get_same_item: true }
}
```

**Verifies:** Weekend restriction, time slots, quantities

### 2. Free Add-on

```javascript
{
  name: 'Free Chutney with Dosa',
  offer_type: 'item_free_addon',
  application_type: 'order_level',
  conditions: { min_quantity: 1 },
  benefits: {
    max_price: 20,
    free_addon_items: [...]
  }
}
```

**Verifies:** Min quantity, max price, addon items

### 3. Combo Meal

```javascript
{
  name: 'South Indian Breakfast Combo',
  offer_type: 'combo_meal',
  application_type: 'order_level',
  benefits: {
    combo_price: 99,
    is_customizable: true
  }
}
```

**Verifies:** Combo pricing, customization flag

### 4. Cart Percentage

```javascript
{
  name: 'Happy Hour 20% Off',
  offer_type: 'cart_percentage',
  application_type: 'session_level',
  valid_hours: '15:00:00 - 18:00:00',
  conditions: { min_amount: 500 },
  benefits: {
    discount_percentage: 20,
    max_discount_amount: 300
  }
}
```

**Verifies:** Session-level, time restriction, capped discount

### 5. Promo Code

```javascript
{
  name: 'DIWALI2025 - Special Offer',
  offer_type: 'promo_code',
  promo_code: 'DIWALI2025',
  start_date: '2025-10-28T00:00:00Z',
  end_date: '2025-11-15T23:59:59Z',
  usage_limit: 100,
  benefits: {
    discount_percentage: 30,
    max_discount_amount: 500
  }
}
```

**Verifies:** Promo code, date range, usage limit

---

## 🎯 What Gets Validated

### Data Types

- ✅ String fields (name, description, promo_code)
- ✅ Number conversions (quantities, amounts, percentages)
- ✅ Boolean flags (is_active, get_same_item, is_customizable)
- ✅ Date/Time formats (ISO 8601, HH:mm:ss)
- ✅ Arrays (valid_days)
- ✅ JSONB objects (conditions, benefits)

### Database Operations

- ✅ INSERT (create offers)
- ✅ UPDATE (edit offers)
- ✅ SELECT (retrieve offers)
- ✅ DELETE (cleanup)

### Business Logic

- ✅ Application type (order_level vs session_level)
- ✅ Time restrictions (valid_hours_start/end)
- ✅ Day restrictions (valid_days array)
- ✅ Customer targeting (target_customer_type)
- ✅ Order type filtering (enabled_for_dinein/takeaway)
- ✅ Priority ordering

---

## 🛠️ Customizing Tests

### Add New Test Scenario

```javascript
const testNewScenario = test("Your test name", async () => {
  const offerData = buildOfferData("offer_type", {
    name: "Your Offer Name",
    // ... your custom fields
  });

  const { data: offer, error } = await supabase
    .from("offers")
    .insert([offerData])
    .select()
    .single();

  expect(error).toBeFalsy();
  expect(offer.some_field).toBe("expected_value");

  createdOfferIds.push(offer.id);
  return offer;
});

// Add to test array
const tests = [
  // ... existing tests
  testNewScenario,
];
```

### Test Different Data

Modify the `buildOfferData` calls in existing tests:

```javascript
const offerData = buildOfferData("cart_percentage", {
  name: "Your Custom Name",
  valid_days: ["monday", "friday"],
  conditions: { min_amount: 1000 },
  benefits: { discount_percentage: 25 },
});
```

---

## 📊 Test Results Files

### Generated Documentation

1. **INTEGRATION_TEST_RESULTS.md** - Detailed test results

   - 100% pass rate documentation
   - All test scenarios listed
   - Frontend-backend compatibility matrix
   - Production readiness assessment

2. **admin-offer-crud-integration.test.js** - Test code
   - 19 integration tests
   - Helper functions
   - Cleanup logic
   - Real-world scenarios

---

## 🔍 Debugging Failed Tests

### Check Supabase Credentials

```bash
# Verify env variables are loaded
node -e "require('dotenv').config({path:'.env.local'}); console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'); console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');"
```

### Run Single Test

Modify the test file to only include one test:

```javascript
const tests = [
  testBOGO, // Only run this test
];
```

### Enable Verbose Logging

Add console logs in test:

```javascript
console.log("Offer data:", JSON.stringify(offerData, null, 2));
console.log("Database result:", JSON.stringify(offer, null, 2));
```

### Check Database State

```javascript
// Add after test
const { data: dbOffer } = await supabase
  .from("offers")
  .select("*")
  .eq("id", offer.id)
  .single();
console.log("DB state:", dbOffer);
```

---

## 🎯 Common Issues & Solutions

### Issue: Environment variables not found

**Solution:**

```bash
# Ensure .env.local exists
ls .env.local

# Or use absolute path
node -e "require('dotenv').config({path:'D:/DEV/Hangout/.env.local'}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Issue: Supabase client import error

**Solution:**

```bash
npm install @supabase/supabase-js
```

### Issue: Tests timeout

**Solution:** Check Supabase project is active and accessible

### Issue: Cleanup fails

**Solution:** Run manual cleanup:

```javascript
// Get all test offers
const { data: offers } = await supabase
  .from("offers")
  .select("id")
  .ilike("name", "Test %");

// Delete them
for (const offer of offers) {
  await supabase.from("offers").delete().eq("id", offer.id);
}
```

---

## 📈 Expected Performance

- **Total Tests:** 19
- **Test Duration:** ~10-15 seconds
- **Database Operations:** ~80 queries
- **Offers Created:** 27
- **Offers Deleted:** 27
- **Memory Usage:** < 50MB
- **Pass Rate:** 100%

---

## ✅ Success Criteria

All tests pass when:

1. ✅ Supabase credentials are correct
2. ✅ Database schema matches (offers table exists)
3. ✅ No network issues
4. ✅ Sufficient permissions (anon key can insert/update/delete)

---

## 🚦 CI/CD Integration

### Add to GitHub Actions

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Run Integration Tests
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: node tests/integration/admin-offer-crud-integration.test.js
```

---

## 📚 Related Documentation

- **INTEGRATION_TEST_RESULTS.md** - Complete test results
- **COMPLETE_ADMIN_TESTING_SUMMARY.md** - Admin form testing overview
- **ADMIN_FORM_INTEGRATION_TEST.md** - Backend verification
- **TESTING_GUIDE.md** - UI testing guide

---

**Last Updated:** October 28, 2025  
**Test File:** `tests/integration/admin-offer-crud-integration.test.js`  
**Status:** ✅ All tests passing (19/19)
