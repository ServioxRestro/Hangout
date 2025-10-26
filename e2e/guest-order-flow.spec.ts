import { test, expect } from '@playwright/test';

// Test credentials
const DEMO_PHONE = '8638774545';
const DEMO_OTP = '123456';
const TEST_TABLE_CODE = 'TBL001'; // Update with actual table code from your database

test.describe('Guest Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to table menu
    await page.goto(`/t/${TEST_TABLE_CODE}`);
  });

  test('should load menu page and display items', async ({ page }) => {
    // Wait for menu to load
    await expect(page.locator('h1')).toContainText(/Menu|Browse Menu/);

    // Check if menu items are visible
    const menuItems = page.locator('[data-testid="menu-item"]').or(page.locator('button:has-text("Add to Cart")'));
    await expect(menuItems.first()).toBeVisible({ timeout: 10000 });
  });

  test('should add items to cart', async ({ page }) => {
    // Wait for menu items to load
    await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });

    // Add first item to cart
    const addToCartButtons = page.locator('button:has-text("Add to Cart")');
    await addToCartButtons.first().click();

    // Check cart badge updates
    const cartBadge = page.locator('[data-testid="cart-count"]').or(page.locator('text=/^[1-9]$/'));
    await expect(cartBadge.first()).toBeVisible({ timeout: 5000 });

    // Add another item
    await addToCartButtons.nth(1).click();

    // Cart count should increase
    await expect(page.locator('text=/^[2-9]$/')).toBeVisible({ timeout: 5000 });
  });

  test('should view and modify cart', async ({ page }) => {
    // Add items to cart first
    await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });
    await page.locator('button:has-text("Add to Cart")').first().click();

    // Navigate to cart
    await page.locator('text=Cart').or(page.locator('[href*="/cart"]')).click();
    await expect(page).toHaveURL(/\/cart/);

    // Check cart items are displayed
    await expect(page.locator('text=/Cart|Your Cart/')).toBeVisible();

    // Try to increase quantity
    const plusButton = page.locator('button:has-text("+")').or(page.locator('[aria-label="Increase quantity"]'));
    if (await plusButton.count() > 0) {
      await plusButton.first().click();
    }

    // Try to decrease quantity
    const minusButton = page.locator('button:has-text("-")').or(page.locator('[aria-label="Decrease quantity"]'));
    if (await minusButton.count() > 0) {
      await minusButton.first().click();
    }
  });

  test('should show OTP login flow', async ({ page }) => {
    // Add item to cart
    await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });
    await page.locator('button:has-text("Add to Cart")').first().click();

    // Go to cart
    await page.locator('text=Cart').click();
    await page.waitForLoadState('networkidle');

    // Click "Place Order"
    const placeOrderButton = page.locator('button:has-text("Place Order")');
    await expect(placeOrderButton).toBeVisible({ timeout: 5000 });
    await placeOrderButton.click();

    // Should show phone input
    await expect(page.locator('input[type="tel"]').or(page.locator('input[placeholder*="phone"]'))).toBeVisible({ timeout: 5000 });
  });

  test('should complete order with OTP verification and countdown', async ({ page }) => {
    // Add items to cart
    await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.locator('button:has-text("Add to Cart")').nth(1).click();

    // Go to cart
    await page.locator('text=Cart').click();
    await page.waitForTimeout(1000);

    // Place order
    await page.locator('button:has-text("Place Order")').click();

    // Enter phone number
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill(DEMO_PHONE);

    // Send OTP
    await page.locator('button:has-text("Send OTP")').click();
    await page.waitForTimeout(2000);

    // Enter OTP
    const otpInput = page.locator('input[placeholder*="OTP"]').or(page.locator('input[maxlength="6"]'));
    await otpInput.fill(DEMO_OTP);

    // Verify OTP
    await page.locator('button:has-text(/Verify|Place Order/)').click();
    await page.waitForTimeout(2000);

    // **30-Second Countdown Modal Should Appear**
    await expect(page.locator('text=/Confirming Your Order|Confirming/')).toBeVisible({ timeout: 5000 });

    // Check countdown timer
    await expect(page.locator('text=/\\(30s\\)|\\(29s\\)|\\(28s\\)/')).toBeVisible();

    // Check "Place Order Now" button
    await expect(page.locator('button:has-text("Place Order Now")')).toBeVisible();

    // Check "Cancel Order" link
    await expect(page.locator('text=Cancel Order')).toBeVisible();

    // Click "Place Order Now" to skip countdown
    await page.locator('button:has-text("Place Order Now")').click();

    // Should show success message
    await expect(page.locator('text=/Order Placed|Success|Order.*Successfully/')).toBeVisible({ timeout: 10000 });
  });

  test('should test countdown cancel functionality', async ({ page }) => {
    // Add item and reach countdown modal
    await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.locator('text=Cart').click();
    await page.locator('button:has-text("Place Order")').click();

    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill(DEMO_PHONE);
    await page.locator('button:has-text("Send OTP")').click();
    await page.waitForTimeout(2000);

    const otpInput = page.locator('input[placeholder*="OTP"]').or(page.locator('input[maxlength="6"]'));
    await otpInput.fill(DEMO_OTP);
    await page.locator('button:has-text(/Verify|Place Order/)').click();
    await page.waitForTimeout(2000);

    // Countdown modal should be visible
    await expect(page.locator('text=/Confirming/')).toBeVisible();

    // Click "Cancel Order"
    await page.locator('text=Cancel Order').click();

    // Should return to cart page
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.locator('text=/Your Cart|Cart/')).toBeVisible();
  });

  test('should auto-submit order after 30 seconds', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(60000);

    // Add item and reach countdown modal
    await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.locator('text=Cart').click();
    await page.locator('button:has-text("Place Order")').click();

    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill(DEMO_PHONE);
    await page.locator('button:has-text("Send OTP")').click();
    await page.waitForTimeout(2000);

    const otpInput = page.locator('input[placeholder*="OTP"]').or(page.locator('input[maxlength="6"]'));
    await otpInput.fill(DEMO_OTP);
    await page.locator('button:has-text(/Verify|Place Order/)').click();
    await page.waitForTimeout(2000);

    // Countdown modal should be visible
    await expect(page.locator('text=/Confirming/')).toBeVisible();

    // Wait for countdown to complete (30 seconds + buffer)
    await page.waitForTimeout(32000);

    // Should show success message
    await expect(page.locator('text=/Order Placed|Success|Order.*Successfully/')).toBeVisible({ timeout: 5000 });
  });

  test('should view orders after placement', async ({ page }) => {
    // Assuming order was placed in previous test
    // Navigate to orders page
    await page.locator('text=Orders').or(page.locator('[href*="/orders"]')).click();

    // Should show orders page
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.locator('text=/My Orders|Your Orders|Orders/')).toBeVisible();
  });
});
