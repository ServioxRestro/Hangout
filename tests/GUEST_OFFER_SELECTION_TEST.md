# Guest Offer Selection Test - Documentation

## Overview

This test suite comprehensively validates the guest-side offer implementation, testing both dine-in and takeaway scenarios with existing and new guest users.

## Test File

**Location:** `tests/guest-offer-selection-test.js`

## Running the Test

```bash
# Run the guest offer selection test
npm run test:offers:selection

# Or directly
node tests/guest-offer-selection-test.js
```

## Test Coverage

### 1. **Database Connection** ✅

- Verifies Supabase connection is working
- Ensures database is accessible

### 2. **Fetch All Offers** ✅

- Retrieves all active offers from database
- Displays offer details:
  - Name and type
  - Dine-in availability
  - Takeaway availability
  - Application type (session_level/order_level)

### 3. **Filter by Order Type** ✅

- Tests filtering logic for dine-in offers (`enabled_for_dinein = true`)
- Tests filtering logic for takeaway offers (`enabled_for_takeaway = true`)
- Validates the new toggle feature implementation

### 4. **Existing Guest User (8638774545)** ✅

- Fetches existing guest from database
- Validates guest data:
  - Guest ID
  - Name
  - Total orders
  - Total spent
  - Visit count

### 5. **Create New Random Guest** ✅

- Creates a new guest user with random phone number
- Initializes guest profile with default values
- Tests guest creation flow

### 6. **Offer Eligibility Checks** ✅

Tests eligibility for 4 scenarios:

- **Existing Guest + Dine-in**
- **Existing Guest + Takeaway**
- **New Guest + Dine-in**
- **New Guest + Takeaway**

For each scenario, validates:

- Minimum amount requirements
- Threshold amounts
- Order count requirements
- Discount calculations
- Max discount limits

### 7. **Offer Selection Simulation** ✅

Simulates the offer selection process:

- Filters eligible offers
- Selects first eligible offer
- Calculates discount amount
- Computes final amount
- Shows savings percentage

Tests both:

- **Dine-in selection** (with existing guest)
- **Takeaway selection** (with new guest)

### 8. **Table Session Offer Locking** ✅

Tests session-level offer locking:

- Creates table session with locked offer
- Stores offer snapshot in `locked_offer_data`
- Records `offer_applied_at` timestamp
- Validates offer is locked for entire session
- Cleans up test session

### 9. **Offer Usage Tracking** ✅

- Checks current usage count
- Validates usage limit
- Determines if offer is still available
- Ensures usage limits are respected

### 10. **Dine-in vs Takeaway Analysis** ✅

Categorizes offers into:

- **Dine-in only** (enabled_for_dinein=true, enabled_for_takeaway=false)
- **Takeaway only** (enabled_for_dinein=false, enabled_for_takeaway=true)
- **Both** (both flags true)

### 11. **Cleanup** ✅

- Removes test guest user created during testing
- Ensures database remains clean

## Mock Data

### Mock Cart

```javascript
const mockCartItems = [
  { id: "mock-item-1", name: "Margherita Pizza", price: 300, quantity: 2 },
  { id: "mock-item-2", name: "Chicken Burger", price: 250, quantity: 1 },
  { id: "mock-item-3", name: "Coke", price: 50, quantity: 2 },
];

// Total: ₹950.00
```

### Test Users

- **Existing Guest:** 8638774545 (real user in database)
- **New Guest:** Randomly generated 10-digit phone number

## Supabase MCP Integration

The test uses Supabase MCP for database operations:

### Queries Executed:

1. `SELECT * FROM offers WHERE is_active = true`
2. `SELECT * FROM guest_users WHERE phone = ?`
3. `INSERT INTO guest_users (...)`
4. `SELECT * FROM restaurant_tables WHERE is_active = true`
5. `INSERT INTO table_sessions (...)`
6. `DELETE FROM table_sessions WHERE id = ?`
7. `DELETE FROM guest_users WHERE phone = ?`

### Database Validation:

- All queries use Supabase client with proper error handling
- Tests validate response data structure
- Ensures database constraints are respected
- Verifies foreign key relationships

## Expected Output

```
======================================================================
🧪 GUEST OFFER SELECTION - COMPREHENSIVE TEST SUITE
======================================================================

📊 Test Configuration:
   Existing Guest: 8638774545
   New Guest: 9044501974
   Mock Cart Total: ₹950.00
   Mock Cart Items: 3

----------------------------------------------------------------------
📋 Test 1: Database Connection
----------------------------------------------------------------------
✅ Database connection successful

[... 11 test sections ...]

======================================================================
🧪 TEST SUMMARY
======================================================================

📈 Results:
   Total Tests: 16
   ✅ Passed: 16
   ❌ Failed: 0
   ⚠️  Warnings: 0
   ⏱️  Duration: ~2s

✅ ALL TESTS PASSED! 🎉
   Guest offer selection implementation is working correctly.

======================================================================
```

## Test Results Analysis

### Current Status: ✅ ALL PASSING

**16 tests executed successfully:**

- ✅ Database connectivity
- ✅ Offer fetching and filtering
- ✅ Guest user management
- ✅ Eligibility calculations (4 scenarios)
- ✅ Offer selection (2 scenarios)
- ✅ Session locking
- ✅ Usage tracking
- ✅ Order type analysis
- ✅ Cleanup operations

### Key Findings:

1. **All 8 offers** are enabled for both dine-in and takeaway
2. **6 out of 8 offers** are eligible for ₹950 cart
3. **2 offers rejected:**
   - Big Order Bonus (needs ₹1000+)
   - Loyalty Reward (needs 5+ orders)
4. **Best discount:** Happy Hour - 20% Off (₹190 savings)

## Integration with Feature

This test validates the implementation completed in:

- Database migration (added `enabled_for_dinein` and `enabled_for_takeaway` columns)
- Admin UI toggle buttons
- Guest-side filtering in OfferSelector component
- Cart integration for both dine-in and takeaway

## Error Handling

The test includes robust error handling:

- ✅ Database connection failures
- ✅ Missing offers
- ✅ Guest user not found
- ✅ Failed insertions
- ✅ Invalid data structures
- ✅ Cleanup failures (with warnings)

## Future Enhancements

Potential additions to test suite:

- [ ] Test promo code validation
- [ ] Test time-based offer restrictions (valid_hours, valid_days)
- [ ] Test combo meal offers
- [ ] Test free item offers
- [ ] Test usage limit enforcement
- [ ] Test offer priority ordering
- [ ] Test expired offers
- [ ] Test concurrent session handling
- [ ] Test offer modification during active session

## Related Tests

- `tests/guest-offer-eligibility-test.js` - Detailed eligibility logic testing
- `tests/admin-offer-creation-test.js` - Admin-side offer creation
- `tests/offers-test.js` - General offer system validation
- `tests/offers-database-test.js` - Database schema validation

## Troubleshooting

### Test Fails on Database Connection

```bash
# Check .env.local has correct Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Test Fails on Guest User

```bash
# Verify guest user exists
# Phone: 8638774545 should be in guest_users table
```

### Test Fails on Cleanup

```bash
# Manual cleanup may be needed
# Check guest_users table for test phone numbers
# Delete any orphaned test guests
```

## Success Criteria

✅ **All 16 tests pass**
✅ **No database errors**
✅ **Proper filtering by order type**
✅ **Correct discount calculations**
✅ **Session locking works**
✅ **Cleanup completes successfully**

## Maintenance

Run this test after:

- Database schema changes
- Offer-related code modifications
- Guest user flow updates
- Cart logic changes
- Session management updates

**Recommended frequency:** Before each deployment

---

**Last Updated:** October 28, 2025
**Test Version:** 1.0
**Status:** ✅ All Tests Passing
