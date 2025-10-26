# Hangout - Testing Guide

## Overview

This project uses a comprehensive testing strategy with multiple testing frameworks:

- **Jest + React Testing Library** - Unit and integration tests
- **Playwright** - End-to-end (E2E) tests

## Table of Contents

- [Setup](#setup)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [E2E Tests](#e2e-tests)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)

---

## Setup

All testing dependencies are already installed. If you need to reinstall:

```bash
npm install
```

For Playwright browsers (first-time only):

```bash
npx playwright install
```

---

## Running Tests

### Run All Unit Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run E2E Tests

**Prerequisites:** Server must be running on `localhost:3000`

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run E2E tests
npm run test:e2e
```

### Run E2E Tests with UI

```bash
npm run test:e2e:ui
```

### Run E2E Tests in Headed Mode (see browser)

```bash
npm run test:e2e:headed
```

---

## Unit Tests

### Test Structure

```
__tests__/
├── components/
│   └── OrderConfirmationModal.test.tsx
└── hooks/
    └── useAutoLogout.test.ts
```

### Running Specific Test Files

```bash
# Run single test file
npm test -- OrderConfirmationModal.test.tsx

# Run all tests matching pattern
npm test -- useAutoLogout
```

### Example: Testing the Countdown Modal

```typescript
test('should show countdown timer (30s)', () => {
  render(<OrderConfirmationModal {...defaultProps} />)
  expect(screen.getByText(/\(30s\)/)).toBeInTheDocument()
})
```

---

## E2E Tests

### Test Structure

```
e2e/
└── guest-order-flow.spec.ts  # Full guest order flow with countdown
```

### Test Scenarios Covered

#### ✅ Guest Order Flow (`guest-order-flow.spec.ts`)

1. **Load Menu** - Verify menu page loads with items
2. **Add to Cart** - Test adding items and cart badge update
3. **Modify Cart** - Test quantity changes and cart operations
4. **OTP Login** - Test phone input and OTP flow
5. **30-Second Countdown** - Test countdown modal:
   - Countdown timer displays and decrements
   - "Place Order Now" button works
   - "Cancel Order" returns to cart
   - Auto-submit after 30 seconds
6. **View Orders** - Test order history page

### Test Credentials

**Guest Phone:** `8638774545`
**OTP:** `123456` (Demo number in MSG91)

**Table Code:** `TBL001` (Update in test file with actual code)

### Running Specific E2E Tests

```bash
# Run single test file
npx playwright test guest-order-flow

# Run single test case
npx playwright test -g "should complete order with OTP"

# Run in debug mode
npx playwright test --debug
```

### Viewing Test Results

After running E2E tests:

```bash
npx playwright show-report
```

---

## Test Coverage

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage files will be in `coverage/` directory.

### Viewing Coverage

Open `coverage/lcov-report/index.html` in a browser.

### Current Coverage

Components tested:
- ✅ OrderConfirmationModal (13 tests)
- ✅ useAutoLogout hook (11 tests)

End-to-end flows tested:
- ✅ Guest order flow (7 test scenarios)
- ✅ 30-second countdown modal (3 scenarios)

---

## Writing Tests

### Unit Test Example

Create file: `__tests__/components/YourComponent.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YourComponent from '@/components/YourComponent'

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<YourComponent />)

    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Updated')).toBeInTheDocument()
  })
})
```

### E2E Test Example

Create file: `e2e/your-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Your Flow', () => {
  test('should complete the flow', async ({ page }) => {
    await page.goto('/your-page')

    // Interact with page
    await page.locator('button:has-text("Click Me")').click()

    // Assert outcome
    await expect(page.locator('text=Success')).toBeVisible()
  })
})
```

---

## Test Features

### 30-Second Countdown Modal Tests

**Unit Tests** (`OrderConfirmationModal.test.tsx`):
- ✅ Modal renders when open
- ✅ Displays cart items correctly
- ✅ Shows countdown timer (30s → 0s)
- ✅ Progress bar animates 0% → 100%
- ✅ "Place Order Now" calls onConfirm
- ✅ "Cancel Order" calls onCancel
- ✅ Auto-submits when countdown reaches 0
- ✅ Resets countdown when reopened

**E2E Tests** (`guest-order-flow.spec.ts`):
- ✅ Countdown modal appears after OTP verification
- ✅ Countdown timer displays and decrements
- ✅ Cancel returns to cart without placing order
- ✅ "Place Order Now" skips countdown and submits
- ✅ Auto-submit after 30 seconds (with extended timeout)

### Auto-Logout Tests

**Unit Tests** (`useAutoLogout.test.ts`):
- ✅ Does not check when disabled
- ✅ Checks session on mount
- ✅ Does not logout for active sessions
- ✅ Does not logout if < 15 minutes since billing
- ✅ Logs out if > 15 minutes since billing
- ✅ Polls every 60 seconds
- ✅ Clears cart data on logout
- ✅ Redirects to table page
- ✅ Handles custom timeout periods
- ✅ Handles database errors gracefully
- ✅ Cleans up intervals on unmount

---

## Debugging Tests

### Unit Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Tests

```bash
# Open Playwright Inspector
npx playwright test --debug

# Generate trace for failed tests
npx playwright test --trace on

# View traces
npx playwright show-trace trace.zip
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run build
      - run: npm test
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## Best Practices

### Unit Tests
- ✅ Test user interactions, not implementation
- ✅ Use `screen.getByRole` over `querySelector`
- ✅ Mock external dependencies (Supabase, router)
- ✅ Use fake timers for countdown tests
- ✅ Test edge cases and error states

### E2E Tests
- ✅ Use actual demo credentials (8638774545 / 123456)
- ✅ Wait for elements before interacting
- ✅ Use text/role selectors over CSS selectors
- ✅ Test full user flows, not isolated features
- ✅ Clean up test data after runs (if needed)

### Common Pitfalls
- ❌ Don't test implementation details
- ❌ Don't rely on specific CSS classes
- ❌ Don't hardcode wait times (use `waitFor`)
- ❌ Don't skip cleanup in tests

---

## Troubleshooting

### Tests Fail with "Cannot find module"

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### E2E Tests Timeout

- Ensure dev server is running on port 3000
- Check if table code `TBL001` exists in database
- Increase timeout in test if needed:

```typescript
test.setTimeout(60000) // 60 seconds
```

### Mock Issues

If mocks aren't working, check `jest.setup.js` is properly configured.

---

## Test Data Requirements

### Database Setup

For E2E tests to work, you need:

1. **Active Table** with code `TBL001` (or update test file)
2. **Menu Items** available in database
3. **MSG91 Demo Number** `8638774545` configured with OTP `123456`

### Creating Test Table

```sql
INSERT INTO restaurant_tables (table_number, table_code, qr_code_url, is_active)
VALUES (1, 'TBL001', 'https://example.com/t/TBL001', true);
```

---

## Summary

### Quick Commands

```bash
# Run all tests
npm test && npm run test:e2e

# Run with coverage
npm run test:coverage

# Debug E2E test
npm run test:e2e:ui

# Watch mode for development
npm run test:watch
```

### Test Statistics

- **Unit Tests:** 24 test cases
- **E2E Tests:** 7 test scenarios
- **Components Covered:** 2
- **Hooks Covered:** 1
- **User Flows Covered:** 1

---

## Contributing

When adding new features:

1. Write unit tests for components/hooks
2. Add E2E tests for new user flows
3. Run all tests before submitting PR:
   ```bash
   npm test && npm run build && npm run test:e2e
   ```
4. Ensure coverage doesn't decrease

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
