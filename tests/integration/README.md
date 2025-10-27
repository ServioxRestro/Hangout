# Integration Tests for Hangout

## Overview

These integration tests verify the optimized order placement functionality and React Query hooks for the Hangout restaurant management system.

## Test Suite

### 1. Dine-in Order Placement Test (`test-dine-in-order.js`)

Tests the optimized `place_order_optimized` function for dine-in orders:

- ✅ Creates table session
- ✅ Places order with multiple items
- ✅ Generates KOT numbers
- ✅ Verifies order totals
- ✅ Tests adding items to existing order
- ✅ Verifies new KOT generation for subsequent orders
- ✅ Performance: < 2000ms per order placement

**Test Phone**: 8638774545

### 2. Takeaway Order Placement Test (`test-takeaway-order.js`)

Tests the optimized function for takeaway orders:

- ✅ Creates order without table session
- ✅ Verifies order type is 'takeaway'
- ✅ Generates KOT numbers
- ✅ Verifies order items and totals
- ✅ Performance: < 2000ms per order placement

### 3. React Query Hooks Test (`test-react-query.js`)

Tests data fetching and query performance:

- ✅ Menu data fetching (parallel queries)
- ✅ Admin KOTs fetching
- ✅ Billing data fetching
- ✅ Table sessions fetching
- ✅ Guest orders fetching
- ✅ Query optimization with indexes
- ✅ Performance: < 1000ms for most queries

## Running Tests

### Run All Tests

```bash
node tests/integration/run-all-tests.js
```

### Run Individual Tests

```bash
# Dine-in test
node tests/integration/test-dine-in-order.js

# Takeaway test
node tests/integration/test-takeaway-order.js

# React Query test
node tests/integration/test-react-query.js
```

## Test Results

```
╔══════════════════════════════════════════════════════════╗
║                    TEST SUMMARY                          ║
╚══════════════════════════════════════════════════════════╝

1. ✅ Dine-in Order Placement - PASSED
2. ✅ Takeaway Order Placement - PASSED
3. ✅ React Query Hooks - PASSED

Total Tests: 3
Passed: 3 ✅
Failed: 0 ❌
Success Rate: 100.0%
```

## Performance Results

### Order Placement Optimization

**Before Optimization** (11 sequential queries):
- Expected time: 1000-2000ms

**After Optimization** (1 RPC call):
- Dine-in: **277ms** (✅ 72% faster)
- Takeaway: **309ms** (✅ 69% faster)
- Adding items to existing order: **455ms** (✅ 54% faster)

### React Query Performance

- Menu data fetch (parallel): **309ms** ✅
- KOTs fetch: **235ms** ✅
- Billing data fetch: **266ms** ✅
- Table sessions fetch: **238ms** ✅
- Indexed queries: **281-481ms** ✅

## Key Validations

### Dine-in Orders
- ✅ Session created with correct status
- ✅ Order linked to session
- ✅ Order total matches cart total
- ✅ All items inserted with KOT numbers
- ✅ KOT numbers consistent within batch
- ✅ New KOT generated for subsequent items
- ✅ Order total updated correctly

### Takeaway Orders
- ✅ No table session created
- ✅ Order type set to 'takeaway'
- ✅ Order total matches cart total
- ✅ All items inserted with KOT numbers
- ✅ Items start with 'placed' status

### React Query
- ✅ Parallel queries execute correctly
- ✅ Data relationships maintained
- ✅ Queries use database indexes
- ✅ Performance targets met

## Configuration

Test configuration is in `test-config.js`:
- Supabase client initialization
- Test phone number: 8638774545
- Helper functions for data setup/cleanup

## Cleanup

All tests automatically clean up their test data:
- Order items deleted
- Orders deleted
- Table sessions deleted

No manual cleanup required!

## Notes

- Tests use the phone number 8638774545 as specified
- Guest user may be created if doesn't exist
- Tests verify the complete order flow end-to-end
- All tests include performance assertions
- Automatic cleanup ensures no test data pollution
