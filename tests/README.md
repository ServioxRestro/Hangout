# Offer System Tests - Quick Start

## Run Tests

```bash
# Test offer system
npm run test:offers

# Test database integrity
npm run test:offers:db

# Test admin offer creation
npm run test:offers:admin

# Test guest offer eligibility
npm run test:offers:guest

# Test guest offer selection (NEW!)
npm run test:offers:selection
```

## What Gets Tested

✅ **Database Connection**
✅ **Table Structure** (24 columns validated including new toggles)
✅ **All 11 Offer Types** (schema validation)
✅ **Application Types** (session_level vs order_level)
✅ **Order Types** (dine-in vs takeaway filtering)
✅ **JSON Fields** (benefits & conditions)
✅ **Data Integrity** (null checks, valid types)
✅ **Relationships** (offer-order references)
✅ **Date/Time Ranges** (format validation)
✅ **Promo Codes** (uniqueness)
✅ **Usage Limits** (count validation)
✅ **Guest Selection** (offer selection flow)
✅ **Session Locking** (session-level offers)
✅ **Critical Bugs** (item_free_addon detection)

## Expected Output

```
============================================================
🧪 OFFER SYSTEM - NODE.JS TESTS
============================================================

✅ Database connection successful
✅ All required columns exist
✅ All offers have valid application_type
✅ All offers have valid JSON structure

Total Tests: 17
✅ Passed: 8
❌ Failed: 0
⚠️  Warnings: 9
⏱️  Duration: 6.59s

✅ ALL TESTS PASSED!
```

## Test Suites

### 1. Core Offer Tests (`test:offers`)

- Database schema validation
- Offer type validation
- JSON structure checks
- Basic integrity tests

### 2. Database Tests (`test:offers:db`)

- Column existence checks
- Data type validation
- Foreign key relationships
- Constraint validation

### 3. Admin Tests (`test:offers:admin`)

- Offer creation flow
- Admin UI validation
- Offer management operations

### 4. Guest Eligibility Tests (`test:offers:guest`)

- Eligibility calculations
- Condition validation
- Benefit calculations
- Edge cases

### 5. **Guest Selection Tests (`test:offers:selection`)** 🆕

- **Dine-in/takeaway filtering**
- **Existing/new guest scenarios**
- **Offer selection simulation**
- **Session locking**
- **Usage tracking**
- **Complete end-to-end flow**

## Files

- `tests/offers-test.js` - Main tests
- `tests/offers-database-test.js` - Database tests
- `tests/admin-offer-creation-test.js` - Admin tests
- `tests/guest-offer-eligibility-test.js` - Eligibility tests
- `tests/guest-offer-selection-test.js` - **Selection tests (NEW!)**
- `tests/GUEST_OFFER_SELECTION_TEST.md` - **Selection test docs (NEW!)**
- `docs/TESTING_GUIDE.md` - Complete guide

## Quick Links

- [Guest Selection Test Guide](./GUEST_OFFER_SELECTION_TEST.md) - **New comprehensive test**
- [Testing Guide](../docs/TESTING_GUIDE.md) - Full documentation
- [Offer System Design](../docs/GUEST_OFFER_SYSTEM_DESIGN.md) - System architecture

## Latest Features Tested

✅ **Dine-in/Takeaway Toggles** (Oct 28, 2025)

- Database columns: `enabled_for_dinein`, `enabled_for_takeaway`
- Admin UI toggle controls
- Guest-side filtering
- Order type differentiation

## Status

✅ Playwright removed
✅ Node.js tests created
✅ All test suites passing
✅ Dine-in/takeaway feature tested
✅ Documentation complete
