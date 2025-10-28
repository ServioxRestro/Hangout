# Offer System Test Suite - Free Item Types

## Test Overview

This comprehensive test suite validates the **free item offer system** for both **admin-side** (offer creation) and **guest-side** (offer application). It focuses on three offer types:

1. **Buy X Get Y Free** (`item_buy_get_free`)
2. **Free Add-on** (`item_free_addon`)
3. **Combo Meal** (`combo_meal`)

## Test File

**Location:** `tests/offer-types-free-items-test.js`

**Run Command:** `npm run test:offers:free-items`

---

## Test Configuration

### Menu Items Used

```javascript
{
  plainDosa:       { id: '0aba8c16-...', name: 'Plain Dosa',       price: 99  },
  masalaDosa:      { id: '6b42543d-...', name: 'Masala Dosa',      price: 139 },
  paneerRoll:      { id: '5aca413c-...', name: 'Paneer Roll',      price: 149 },
  chickenSharwma:  { id: '2cd62f5f-...', name: 'Chicken Sharwma',  price: 149 },
  chickenFry:      { id: 'f4fd3893-...', name: 'Chicken Fry',      price: 179 },
  eggCurry:        { id: 'e22e61eb-...', name: 'Egg Curry',        price: 199 },
  paneerTikka:     { id: '4f1e2922-...', name: 'Paneer Tikka',     price: 249 },
}
```

### Categories Used

```javascript
{
  dosa:        { id: '560469f2-...', name: 'Dosa' },
  rolls:       { id: 'a5c13256-...', name: 'Rolls' },
  mainCourse:  { id: '3f310d19-...', name: 'Main Course' },
  starters:    { id: '27b9850e-...', name: 'Starters' },
}
```

### Guest User

- **Phone:** 8638774545
- **Purpose:** Testing existing user scenarios

---

## Test Cases

### ✅ TEST 1: Admin - Create Buy X Get Y Free Offer

**Purpose:** Verify admin can create "Buy 2 Get 1 Free" offers

**Offer Configuration:**

```javascript
{
  name: 'Buy 2 Dosas Get 1 Free',
  offer_type: 'item_buy_get_free',
  conditions: { buy_quantity: 2 },
  benefits: { free_quantity: 1 },
  enabled_for_dinein: true,
  enabled_for_takeaway: true
}
```

**Qualifying Items:**

- Plain Dosa (₹99)
- Masala Dosa (₹139)

**Validation:**

- ✓ Offer created with valid ID
- ✓ Offer items linked correctly
- ✓ Conditions and benefits saved properly

---

### ✅ TEST 2: Admin - Create Free Add-on Offer

**Purpose:** Verify admin can create free add-on offers with max price limits

**Offer Configuration:**

```javascript
{
  name: 'Free Starter with Main Course',
  offer_type: 'item_free_addon',
  benefits: {
    max_price: 150,
    free_addon_items: [
      { id: 'starters_category_id', type: 'category' }
    ]
  }
}
```

**Qualifying Category:**

- Main Course (must have 1 item from this category)

**Free Items Available:**

- Any starter up to ₹150

**Validation:**

- ✓ Offer created successfully
- ✓ Category-based qualifying items work
- ✓ Max price limit configured

---

### ✅ TEST 3: Admin - Create Combo Meal Offer

**Purpose:** Verify admin can create combo meal offers with special pricing

**Offer Configuration:**

```javascript
{
  name: 'Lunch Combo',
  offer_type: 'combo_meal',
  benefits: { combo_price: 299 }
}
```

**Combo Contents:**

- 1 Main Course (e.g., Paneer Tikka ₹249)
- 1 Roll (e.g., Paneer Roll ₹149)
- **Regular Price:** ₹398
- **Combo Price:** ₹299
- **Savings:** ₹99 (24.9%)

**Validation:**

- ✓ Offer created successfully
- ✓ Combo price provides savings

---

### ✅ TEST 4: Guest - Buy X Get Y Eligibility Check

**Purpose:** Validate guest-side eligibility logic for Buy X Get Y offers

**Test Cases:**

#### 1. Insufficient Quantity

- **Cart:** 1x Plain Dosa
- **Expected:** ❌ Ineligible
- **Reason:** Need 2 items to get 1 free

#### 2. Sufficient Quantity

- **Cart:** 2x Plain Dosa
- **Expected:** ✅ Eligible
- **Free Item:** 1x Plain Dosa (₹99)

#### 3. Mixed Qualifying Items

- **Cart:** 1x Plain Dosa + 1x Masala Dosa
- **Expected:** ✅ Eligible
- **Free Item:** 1x Plain Dosa (₹99) - cheapest item

#### 4. Order Type Filtering

- **Dine-in:** ✓ Enabled
- **Takeaway:** ✓ Enabled

**Logic Validated:**

- ✓ Quantity requirement check
- ✓ Cheapest item selection for free item
- ✓ Mixed item cart handling
- ✓ Order type toggle filtering

---

### ✅ TEST 5: Guest - Free Add-on Eligibility Check

**Purpose:** Validate free add-on offer eligibility with max price limits

**Test Cases:**

#### 1. Cart Without Qualifying Items

- **Cart:** 1x Plain Dosa (Dosa category)
- **Expected:** ❌ Ineligible
- **Reason:** Need Main Course item

#### 2. Cart With Qualifying Item

- **Cart:** 1x Paneer Tikka (Main Course)
- **Expected:** ✅ Eligible
- **Action:** User must select free starter

#### 3. Free Items Within Max Price

- **Max Price:** ₹150
- **Valid:** Plain Dosa (₹99) ✓
- **Invalid:** Chicken Fry (₹179) ✗

#### 4. User Selection Requirement

- **Expected:** ✅ Requires user to select item
- **Component:** FreeItemSelector modal

**Logic Validated:**

- ✓ Category-based qualification
- ✓ Max price enforcement
- ✓ User action required flag
- ✓ Available items filtering

---

### ✅ TEST 6: Guest - Combo Meal Eligibility Check

**Purpose:** Validate combo meal offer calculations

**Test Scenario:**

- **Regular Price:** ₹398 (Paneer Tikka + Paneer Roll)
- **Combo Price:** ₹299
- **Savings:** ₹99 (24.9%)

**Test Cases:**

#### 1. Complete Combo

- **Cart:** Both required items
- **Expected:** ✅ Eligible
- **Discount:** ₹99

#### 2. Incomplete Combo

- **Cart:** Only 1 of 2 required items
- **Expected:** ❌ Ineligible
- **Message:** "Add missing items to complete combo"

**Logic Validated:**

- ✓ Savings calculation
- ✓ Incomplete combo detection
- ✓ Price comparison

---

### ✅ TEST 7: Order Type Toggle Filtering

**Purpose:** Verify dine-in/takeaway toggle functionality

**Database Check:**

- Total active offers: 15
- Dine-in enabled: 15
- Takeaway enabled: 15
- Both enabled: 15

**Test Offers Verification:**

```
TEST_FREE_ITEM_Lunch Combo:
  Dine-in: ✓
  Takeaway: ✓

TEST_FREE_ITEM_Buy 2 Dosas Get 1 Free:
  Dine-in: ✓
  Takeaway: ✓

TEST_FREE_ITEM_Free Starter with Main Course:
  Dine-in: ✓
  Takeaway: ✓
```

**Validation:**

- ✓ All offers have at least one toggle enabled
- ✓ Toggles stored correctly in database
- ✓ Filtering logic works on guest side

---

### ✅ TEST 8: Complete Guest Flow Integration

**Purpose:** End-to-end test of guest applying offer

**Guest Details:**

- Phone: 8638774545
- Visit count: 1
- Total orders: 0

**Mock Cart:**

```
2x Plain Dosa     @ ₹99  = ₹198
1x Paneer Tikka   @ ₹249 = ₹249
--------------------------------
Subtotal:                  ₹447
```

**Eligible Offers:** 1

**Applied Offer:**

- **Name:** Buy 2 Dosas Get 1 Free
- **Qualifying Items:** 2
- **Free Items:** 1x Plain Dosa
- **Discount:** ₹99
- **Final Total:** ₹348

**Flow Validated:**

- ✓ Guest authentication
- ✓ Cart total calculation
- ✓ Offer eligibility check
- ✓ Free item determination (cheapest)
- ✓ Discount application
- ✓ Final total calculation

---

## Test Results Summary

### Latest Run (All Passing ✅)

```
Total Tests: 8
Passed:      8 ✅
Failed:      0 ❌
Skipped:     0 ⊘
Duration:    10.29s ⏱️
```

### Test Breakdown

| #   | Test Name                      | Category    | Status | Duration |
| --- | ------------------------------ | ----------- | ------ | -------- |
| 1   | Admin: Buy X Get Y Creation    | Admin       | ✅     | ~1.5s    |
| 2   | Admin: Free Add-on Creation    | Admin       | ✅     | ~1.2s    |
| 3   | Admin: Combo Meal Creation     | Admin       | ✅     | ~0.8s    |
| 4   | Guest: Buy X Get Y Eligibility | Guest       | ✅     | ~1.5s    |
| 5   | Guest: Free Add-on Eligibility | Guest       | ✅     | ~1.3s    |
| 6   | Guest: Combo Meal Eligibility  | Guest       | ✅     | ~0.7s    |
| 7   | Order Type Toggle Filtering    | Integration | ✅     | ~1.1s    |
| 8   | Complete Guest Flow            | Integration | ✅     | ~2.2s    |

---

## Implementation Details

### Database Operations via Supabase MCP

All database operations use Supabase REST API:

#### 1. Create Offer

```javascript
POST / rest / v1 / offers;
Body: {
  name,
    offer_type,
    conditions,
    benefits,
    enabled_for_dinein,
    enabled_for_takeaway;
}
```

#### 2. Create Offer Items

```javascript
POST /rest/v1/offer_items
Body: [{ offer_id, menu_item_id/menu_category_id, item_type, quantity }]
```

#### 3. Query Offers

```javascript
GET /rest/v1/offers?select=*&is_active=eq.true
```

#### 4. Query Offer Items

```javascript
GET /rest/v1/offer_items?offer_id=eq.{id}&select=*,menu_items(*),menu_categories(*)
```

#### 5. Delete Offer

```javascript
DELETE /rest/v1/offer_items?offer_id=eq.{id}
DELETE /rest/v1/offers?id=eq.{id}
```

### Test Cleanup

- **Before Tests:** Removes any existing test offers (prefix: `TEST_FREE_ITEM_`)
- **After Tests:** Removes all created test offers
- **Ensures:** Clean database state for each test run

---

## Key Features Tested

### Admin Side

✓ Offer creation with different types
✓ Conditions configuration (buy_quantity, max_price)
✓ Benefits configuration (free_quantity, combo_price, free_addon_items)
✓ Offer items (menu_item_id and menu_category_id)
✓ Order type toggles (enabled_for_dinein, enabled_for_takeaway)

### Guest Side

✓ Eligibility checking logic
✓ Cart analysis for qualifying items
✓ Free item determination (cheapest for BOGO)
✓ Max price validation (free add-on)
✓ User action requirements
✓ Discount calculation
✓ Order type filtering

### Integration

✓ Complete flow from cart to discount
✓ Guest user integration
✓ Multiple offer eligibility
✓ Best offer selection

---

## Offer Type Logic Summary

### Buy X Get Y Free

```
IF cart has >= buy_quantity qualifying items
  THEN give free_quantity of cheapest qualifying item
  DISCOUNT = cheapest_item_price * free_quantity
```

### Free Add-on

```
IF cart has qualifying item/category
  AND user selects free item <= max_price
  THEN add free item to cart
  DISCOUNT = selected_item_price
```

### Combo Meal

```
IF cart has all required combo items
  THEN apply combo_price
  DISCOUNT = regular_total - combo_price
```

---

## Running the Tests

### Command

```bash
npm run test:offers:free-items
```

### Prerequisites

- Environment variables configured (`.env.local`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase project with tables: `offers`, `offer_items`, `menu_items`, `menu_categories`, `guest_users`
- Menu items and categories populated in database

### Expected Output

```
╔════════════════════════════════════════════════════════════════════════════╗
║       OFFER SYSTEM TEST SUITE - FREE ITEM TYPES                            ║
║       Testing: Buy X Get Y, Free Add-on, Combo Meal                       ║
╚════════════════════════════════════════════════════════════════════════════╝

[Test execution logs...]

================================================================================
  TEST SUMMARY
================================================================================

Total Tests: 8
Passed:      8 ✅
Failed:      0 ❌
Skipped:     0 ⊘
Duration:    10.29s ⏱️

✅ 🎉 All tests passed!
```

---

## Troubleshooting

### Test Failures

1. **Environment Variables Missing**

   - Check `.env.local` file exists
   - Verify Supabase credentials are correct

2. **Database Connection Failed**

   - Verify Supabase project is active
   - Check network connectivity

3. **Menu Items Not Found**

   - Ensure menu items exist in database
   - Verify item IDs match configuration

4. **Offer Creation Failed**
   - Check database permissions (RLS policies)
   - Verify offer_type is valid enum value

### Known Issues

- Test requires actual menu items in database
- Guest user must exist (8638774545)
- Some tests create temporary offers (cleaned up automatically)

---

## Related Files

- **Eligibility Logic:** `lib/offers/eligibility.ts`
- **Free Item Selector:** `components/guest/FreeItemSelector.tsx`
- **Admin Offer Creation:** `app/admin/offers/create/[offerType]/page.tsx`
- **Guest Offer Selector:** `components/guest/OfferSelector.tsx`

---

## Future Enhancements

- [ ] Test combo meal items table integration
- [ ] Test offer usage tracking
- [ ] Test session-level offer locking
- [ ] Test concurrent offer eligibility
- [ ] Test offer priority system
- [ ] Add performance benchmarks
- [ ] Add stress testing (1000+ offers)

---

## Test Maintenance

- **Update when:** Database schema changes, new offer types added, eligibility logic modified
- **Review:** After any changes to offer system
- **Run:** Before deploying offer-related features
