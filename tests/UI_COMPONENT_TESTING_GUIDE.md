# UI Component Testing Guide

## Overview

This guide covers React component testing for the Hangout offer system using Jest and React Testing Library.

## Test Infrastructure

### Tools Used

- **Jest 30.2.0**: JavaScript testing framework
- **React Testing Library 16.3.0**: Component testing library
- **jest-environment-jsdom**: DOM simulation
- **@testing-library/jest-dom 6.9.1**: Custom matchers

### Configuration Files

#### jest.config.js

```javascript
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

module.exports = createJestConfig(customJestConfig);
```

#### jest.setup.js

Includes mocks for:

- Next.js router (`next/navigation`)
- `localStorage` and `sessionStorage`
- `matchMedia` (for responsive design tests)

## Test Files Created

### 1. OfferSelector Component Tests

**File**: `tests/components/OfferSelector.test.tsx`

**Component**: `components/guest/OfferSelector.tsx` (581 lines)

**Test Results**: ⚠️ 13 failed, 6 passed (initial run)

**Test Categories**:

1. Component Rendering (3 tests)
2. Order Type Filtering (3 tests)
3. Offer Display (4 tests)
4. Offer Selection (3 tests)
5. Free Item Flow (1 test)
6. Empty States (2 tests)
7. Error Handling (1 test)
8. Accessibility (2 tests)

**Known Issues**:

- Component has collapsed/expanded state not accounted for initially
- Some mocks need refinement for actual component behavior
- Eligibility checks need proper mocking

**To Run**:

```bash
npm test OfferSelector.test.tsx
```

### 2. Admin Offer Types Page Tests

**File**: `tests/components/AdminOfferTypesPage.test.tsx`

**Component**: `app/admin/offers/create/page.tsx` (357 lines)

**Test Categories**:

1. Page Rendering (3 tests)
2. Offer Categories Display (3 tests)
3. Offer Types Display (5 tests)
4. User Interactions (4 tests)
5. Visual Feedback (2 tests)
6. Responsive Design (2 tests)
7. Accessibility (4 tests)
8. Security & Authorization (1 test)
9. Edge Cases (2 tests)

**Status**: ✅ Created, pending first run

**To Run**:

```bash
npm test AdminOfferTypesPage.test.tsx
```

## Component Testing Strategy

### Guest-Side UI Tests

#### OfferSelector Component

**Purpose**: Test the main offer selection interface for guests

**Key Features to Test**:

- Collapsed/expanded offer list state
- Order type filtering (dine-in vs takeaway)
- Offer eligibility display
- Offer selection/deselection
- Free item modal triggering
- Empty cart states
- Loading states
- Error handling

**Mock Requirements**:

```typescript
// Mock Supabase client
jest.mock("@/lib/supabase/client");

// Mock eligibility checker
jest.mock("@/lib/offers/eligibility");

// Mock data
const mockOffers = [
  {
    id: "offer-1",
    name: "Buy 2 Get 1 Free",
    description: "Buy 2 items and get 1 free",
    offer_type: "item_buy_get_free",
    enabled_for_dinein: true,
    enabled_for_takeaway: true,
    // ... other properties
  },
];
```

#### FreeItemSelector Component

**Purpose**: Test the free item selection modal

**Key Features to Test** (Pending Implementation):

- Modal rendering
- Item list display
- Price filtering
- Item selection
- Confirm/cancel actions
- Validation (must select required items)

### Admin-Side UI Tests

#### Offer Types Selection Page

**Purpose**: Test admin interface for choosing offer type

**Key Features to Test**:

- Offer type cards display
- Navigation to create forms
- Category organization
- Visual feedback on hover
- Accessibility

#### Offer Creation Forms (Pending)

**Purpose**: Test each offer type creation form

**Forms to Test**:

- Buy X Get Y Free form
- Free Add-on form
- Combo Meal form
- Cart Percentage Discount form

**Key Features to Test**:

- Form field rendering
- Item/category selection dropdowns
- Conditions configuration
- Benefits configuration
- Form validation
- Submission handling
- Error display

## Running Tests

### All Component Tests

```bash
npm test tests/components
```

### Specific Component

```bash
npm test OfferSelector.test.tsx
```

### Watch Mode (for development)

```bash
npm test tests/components -- --watch
```

### Coverage Report

```bash
npm test tests/components -- --coverage
```

## Test Results Summary

### Backend Tests (Complete ✅)

- **File**: `tests/offer-types-free-items-test.js`
- **Tests**: 8/8 passing
- **Duration**: 10.29s
- **Coverage**: All free item offer types
- **Status**: ✅ Production-ready

### Component Tests (In Progress ⏳)

#### Guest Side

| Component        | Tests Created | Tests Passing | Status         |
| ---------------- | ------------- | ------------- | -------------- |
| OfferSelector    | 19            | 6             | ⚠️ Needs fixes |
| FreeItemSelector | 0             | 0             | ⏸️ Pending     |

#### Admin Side

| Component        | Tests Created | Tests Passing | Status         |
| ---------------- | ------------- | ------------- | -------------- |
| Offer Types Page | 26            | 0             | ⏸️ Not run yet |
| Create Forms     | 0             | 0             | ⏸️ Pending     |

## Current Issues & Next Steps

### OfferSelector Test Failures

**Issue**: Tests expect offers to be immediately visible, but component has collapsed/expanded state

**Root Cause**: Component initially shows "Apply Offer" button. User must click to expand offers list.

**Solution Needed**:

1. Update tests to click "Apply Offer" button first
2. Wait for offers to be fetched and displayed
3. Then perform assertions on offer list

**Example Fix**:

```typescript
test("should display offers after expanding", async () => {
  render(
    <OfferSelector
      cartItems={mockCartItems}
      cartTotal={300}
      orderType="dine-in"
      onOfferSelect={mockOnOfferSelect}
      selectedOffer={null}
    />
  );

  // Click to expand offers
  const applyButton = screen.getByText(/Apply Offer/i);
  fireEvent.click(applyButton);

  // Wait for offers to load
  await waitFor(() => {
    expect(screen.getByText(/Buy 2 Get 1 Free/i)).toBeInTheDocument();
  });
});
```

### Mock Improvements Needed

**Eligibility Checker Mock**:
Current mock returns undefined for `eligibilityCache`, causing crashes.

**Solution**:

```typescript
import { checkOfferEligibility } from "@/lib/offers/eligibility";

jest.mock("@/lib/offers/eligibility", () => ({
  checkOfferEligibility: jest.fn((offer, cartItems, cartTotal) => {
    return Promise.resolve({
      isEligible: cartTotal >= 300,
      discount: 99,
      requiresUserAction: offer.offer_type === "item_free_addon",
      message: "Eligible",
      availableFreeItems: [],
      freeItems: [],
    });
  }),
}));
```

## Real-Life Scenario Coverage

### Backend Tests ✅

- Uses real menu items from database
- Tests actual offer creation API
- Validates real eligibility logic
- Tests with production data structure

### UI Tests ⏳

- Tests user interaction flows
- Validates visual feedback
- Checks accessibility
- Tests error handling
- **Not yet covering**:
  - Actual offer creation workflow (admin)
  - Free item selection UX (guest)
  - Form validation edge cases

## Test Data

### Real Menu Items Used

From `menu_items` table:

- Plain Dosa (₹99)
- Masala Dosa (₹139)
- Paneer Roll (₹149)
- Chicken Sharwma (₹149)
- Chicken Fry (₹179)
- Egg Curry (₹199)
- Paneer Tikka (₹249)

### Mock Cart Items

```typescript
const mockCartItems = [
  {
    id: "1",
    name: "Paneer Roll",
    price: 149,
    quantity: 2,
    category_id: "cat-1",
  },
  { id: "2", name: "Plain Dosa", price: 99, quantity: 1, category_id: "cat-2" },
];
// Total: ₹397
```

## Comparison: Backend vs UI Testing

| Aspect                  | Backend Tests        | UI Tests            |
| ----------------------- | -------------------- | ------------------- |
| **Database Operations** | ✅ Full coverage     | ❌ Mocked           |
| **API Endpoints**       | ✅ Tested            | ❌ Mocked           |
| **Eligibility Logic**   | ✅ Real logic        | ⚠️ Partially mocked |
| **User Interactions**   | ❌ N/A               | ✅ Testing now      |
| **Form Validation**     | ❌ N/A               | ⏸️ Pending          |
| **Visual Feedback**     | ❌ N/A               | ✅ Testing          |
| **Accessibility**       | ❌ N/A               | ✅ Testing          |
| **Real Data**           | ✅ Production DB     | ⚠️ Mock data        |
| **End-to-End Flow**     | ✅ Create → Validate | ⏸️ Partial          |

## Recommendations

### Immediate Actions

1. ✅ Fix OfferSelector test failures

   - Handle collapsed/expanded state
   - Improve eligibility mocks
   - Update assertions for actual UI

2. ⏸️ Create FreeItemSelector tests

   - Modal rendering
   - Item selection flow
   - Validation logic

3. ⏸️ Create admin form tests
   - Each offer type form
   - Field validation
   - Submission handling

### Future Enhancements

- **Integration Tests**: Combine backend + UI
- **E2E Tests**: Full user journeys using Playwright/Cypress
- **Visual Regression**: Screenshot comparisons
- **Performance Tests**: Component render times
- **Mobile Testing**: Touch interactions, responsive layout

## Documentation Files

- **Backend Test Documentation**: `tests/OFFER_FREE_ITEMS_TEST.md`
- **Backend Test Summary**: `tests/OFFER_FREE_ITEMS_SUMMARY.md`
- **This Guide**: `tests/UI_COMPONENT_TESTING_GUIDE.md`
- **Test README**: `tests/README.md`

## Contact & Support

For questions about:

- **Backend Tests**: Refer to `OFFER_FREE_ITEMS_TEST.md`
- **UI Tests**: Refer to this guide
- **Running Tests**: Check `tests/README.md`
- **Test Infrastructure**: See `jest.config.js` and `jest.setup.js`

---

**Last Updated**: Based on test execution results
**Status**: In Progress ⏳
**Next**: Fix OfferSelector tests, then proceed with remaining component tests
