# Offer Implementation Design - Multi-Offer Selection System

## 📋 Table of Contents
1. [Business Rules](#business-rules)
2. [Offer Application Strategy](#offer-application-strategy)
3. [Multi-Offer Selection UX](#multi-offer-selection-ux)
4. [Technical Implementation](#technical-implementation)
5. [Database Schema Changes](#database-schema-changes)
6. [UI/UX Flows](#uiux-flows)

---

## 🎯 Business Rules

### Offer Stacking Policy

**Recommended: Single Offer (Most Common)**
- Guest can apply **ONLY 1 offer** per order/session
- Simpler for business and guest
- Example: Either "Buy 2 Get 1" OR "20% off" (not both)

**Alternative Options:**
- **Multiple Compatible Offers**: Allow stacking (e.g., category-specific + cart-wide)
- **Best Offer Auto-Applied**: System automatically applies highest savings

---

## 📊 Offer Application Strategy

### Current System Flow
```
Guest → Scans QR → Table Session Created → Multiple Orders → KOTs Generated → Items Served → Get Bill → Payment → Session Completed
```

### Recommended: HYBRID APPROACH

#### 1. Percentage/Flat Discounts → SESSION-LEVEL
Examples: "10% off total bill", "₹100 off on ₹500"
- Calculate at final billing
- Simple discount shown on bill
- No kitchen involvement

#### 2. Buy X Get Y Free → ORDER-LEVEL with Smart Handling

**Implementation Flow:**
```typescript
// At checkout, when guest clicks "Place Order"

1. Run OfferCalculator on cart
2. If "Buy X Get Y" offer qualifies:

   - Show modal: "You qualify for 1 FREE Pizza! Add it to your order?"

   - If guest says YES:
     * Add free item to order_items with unit_price = 0
     * Mark order_item as from_offer = true
     * Send KOT with ALL items (kitchen makes everything)
     * Order total shows discount

   - If guest says NO:
     * Just apply discount equivalent
     * Don't add physical free item
```

**Example Flow:**
```
Guest adds 2 Pizzas to cart (₹500)
↓
Clicks "Place Order"
↓
System detects: Eligible for "Buy 2 Get 1 Free"
↓
Modal: "Add free pizza to your order?"
↓
Guest clicks YES
↓
Order created with:
  - 2 Pizzas (₹250 each) = ₹500
  - 1 Pizza (FREE, is_free_item=true, offer_id=xxx) = ₹0
  - Total: ₹500
  - Discount: -₹250
  - Final: ₹250
↓
KOT sent to kitchen: "Make 3 Pizzas (1 is free offer)"
↓
At billing: Show all items + offers applied
```

---

## 🎁 Multi-Offer Selection UX

### Design Philosophy
1. **Auto-apply best offer** by default (highest savings)
2. **Allow manual switching** to other eligible offers
3. **Show savings comparison** (vs best offer)
4. **Display ineligible offers** with requirements
5. **Single offer per order** (no stacking)
6. **Promo codes override** auto-offers if better

### Cart/Checkout Page UI

```
┌─────────────────────────────────────┐
│ Your Cart                           │
│                                     │
│ 🍕 Margherita Pizza x2    ₹500     │
│ 🥤 Coke                   ₹50      │
│ ─────────────────────────────────  │
│ Subtotal:                 ₹550     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎁 Available Offers (3)             │
│                                     │
│ ✓ BEST DEAL (Applied)               │
│ ┌─────────────────────────────┐   │
│ │ Buy 2 Get 1 Free           │   │
│ │ Add 1 free pizza            │   │
│ │ 💰 You save: ₹250          │   │
│ └─────────────────────────────┘   │
│                                     │
│ Other Available Offers:             │
│                                     │
│ ○ 20% Off Total Bill              │
│   You save: ₹110                   │
│   [Apply This]                     │
│                                     │
│ ○ Free Coke on ₹500+              │
│   You save: ₹50                    │
│   [Apply This]                     │
│                                     │
│ [View All Offers →]                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Have a promo code?                  │
│ [Enter Code]        [Apply]         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Bill Summary                        │
│ Subtotal:              ₹550         │
│ Offer Discount:       -₹250 🎁      │
│ ─────────────────────────────────  │
│ Total:                 ₹300         │
│                                     │
│ [Place Order]                       │
└─────────────────────────────────────┘
```

### Expanded Offer Selection Modal

```
┌──────────────────────────────────────┐
│ ✕ Available Offers                   │
├──────────────────────────────────────┤
│                                      │
│ [All] [Cart Offers] [Item Offers]   │
│                                      │
│ ✓ Currently Applied (Save ₹250)     │
│ ┌────────────────────────────────┐ │
│ │ 🎁 Buy 2 Get 1 Free            │ │
│ │                                │ │
│ │ Buy 2 pizzas, get 1 free       │ │
│ │ • You qualify! ✓               │ │
│ │ • Valid till: Dec 31           │ │
│ │                                │ │
│ │ Your Savings: ₹250             │ │
│ │                                │ │
│ │ [✓ Applied]                    │ │
│ └────────────────────────────────┘ │
│                                      │
│ Alternative Offers:                  │
│                                      │
│ ┌────────────────────────────────┐ │
│ │ 💰 Flat 20% Off                │ │
│ │                                │ │
│ │ Get 20% discount on total bill │ │
│ │ • You qualify! ✓               │ │
│ │ • Min order: ₹500              │ │
│ │                                │ │
│ │ Your Savings: ₹110 (-₹140)     │ │
│ │                                │ │
│ │ [Switch to This]               │ │
│ └────────────────────────────────┘ │
│                                      │
│ Not Eligible:                        │
│                                      │
│ ┌────────────────────────────────┐ │
│ │ 🍔 Buy 3 Burgers Get 1 Free    │ │
│ │                                │ │
│ │ ❌ You need 3 burgers          │ │
│ │    (Currently: 0)              │ │
│ │                                │ │
│ │ [Add Items to Qualify]         │ │
│ └────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

### Mobile-Optimized Design

**Collapsed State:**
```
┌─────────────────┐
│ 🎁 Offers (3)   │ ← Collapsible badge
├─────────────────┤
│ ✓ Buy 2 Get 1   │ ← Currently applied (green)
│   Save ₹250     │
│                 │
│ [See Other]  ▼  │ ← Tap to expand
└─────────────────┘
```

**Expanded (Bottom Sheet):**
```
┌─────────────────────────────┐
│ ▼ Available Offers          │
├─────────────────────────────┤
│                             │
│ ✓ Currently Applied         │
│ ┌─────────────────────────┐│
│ │ Buy 2 Get 1 Free    ✓   ││
│ │ Save ₹250               ││
│ └─────────────────────────┘│
│                             │
│ ○ Other Offers              │
│ ┌─────────────────────────┐│
│ │ 20% Off         [Apply] ││
│ │ Save ₹110 (-₹140)       ││
│ └─────────────────────────┘│
│                             │
│ ┌─────────────────────────┐│
│ │ Free Drink      [Apply] ││
│ │ Save ₹50  (-₹200)       ││
│ └─────────────────────────┘│
│                             │
│ [Remove All Offers]         │
└─────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Offer Comparison Logic

**File:** `lib/offers/selector.ts`

```typescript
export interface OfferComparison {
  offer: Offer;
  isEligible: boolean;
  savings: number;
  freeItems: any[];
  missingRequirements?: string[];
  priority: 'best' | 'good' | 'okay';
}

export async function compareOffers(
  cart: CartItem[],
  customerData?: { phone?: string; email?: string }
): Promise<{
  bestOffer: OfferComparison | null;
  otherOffers: OfferComparison[];
  notEligible: OfferComparison[];
}> {
  const calculator = new OfferCalculator(cart, customerData);

  // Get all active offers
  const allOffers = await fetchAllActiveOffers();

  const comparisons: OfferComparison[] = [];

  for (const offer of allOffers) {
    const result = await calculator.applyOffer(offer);
    const isEligible = calculator.checkOfferConditions(offer);

    const comparison: OfferComparison = {
      offer,
      isEligible,
      savings: result.discount_amount,
      freeItems: result.free_items,
      missingRequirements: isEligible ? undefined : getMissingRequirements(offer, cart),
      priority: 'okay'
    };

    comparisons.push(comparison);
  }

  // Sort by savings (highest first)
  const eligible = comparisons
    .filter(c => c.isEligible)
    .sort((a, b) => b.savings - a.savings);

  const notEligible = comparisons.filter(c => !c.isEligible);

  // Mark priority
  if (eligible.length > 0) {
    eligible[0].priority = 'best';
    if (eligible.length > 1) {
      const secondBestSavings = eligible[0].savings * 0.8;
      eligible.forEach((offer, idx) => {
        if (idx > 0 && offer.savings >= secondBestSavings) {
          offer.priority = 'good';
        }
      });
    }
  }

  return {
    bestOffer: eligible[0] || null,
    otherOffers: eligible.slice(1),
    notEligible
  };
}

function getMissingRequirements(offer: Offer, cart: CartItem[]): string[] {
  const missing: string[] = [];
  const conditions = offer.conditions || {};

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (conditions.min_amount && cartTotal < conditions.min_amount) {
    const needed = conditions.min_amount - cartTotal;
    missing.push(`Add ₹${needed} more to qualify`);
  }

  if (offer.offer_type === 'item_buy_get_free') {
    const buyQuantity = conditions.buy_quantity || 1;
    const buyItems = offer.offer_items?.filter(i => i.item_type === 'buy') || [];

    for (const buyItem of buyItems) {
      if (buyItem.menu_item_id) {
        const cartItem = cart.find(item => item.id === buyItem.menu_item_id);
        const currentQty = cartItem?.quantity || 0;
        if (currentQty < buyQuantity) {
          missing.push(`Need ${buyQuantity - currentQty} more ${buyItem.name || 'items'}`);
        }
      }
    }
  }

  return missing;
}
```

### 2. Offer Selector Component

**File:** `components/guest/OfferSelector.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { compareOffers, type OfferComparison } from "@/lib/offers/selector";
import { formatCurrency } from "@/lib/utils";
import { Gift, Info, ChevronRight, Check } from "lucide-react";

interface OfferSelectorProps {
  cart: CartItem[];
  selectedOfferId?: string;
  onOfferSelect: (offerId: string | null) => void;
  customerData?: { phone?: string; email?: string };
}

export function OfferSelector({
  cart,
  selectedOfferId,
  onOfferSelect,
  customerData
}: OfferSelectorProps) {
  const [comparison, setComparison] = useState<{
    bestOffer: OfferComparison | null;
    otherOffers: OfferComparison[];
    notEligible: OfferComparison[];
  } | null>(null);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, [cart]);

  const loadOffers = async () => {
    setLoading(true);
    const result = await compareOffers(cart, customerData);
    setComparison(result);

    // Auto-select best offer if none selected
    if (!selectedOfferId && result.bestOffer) {
      onOfferSelect(result.bestOffer.offer.id);
    }

    setLoading(false);
  };

  // Component implementation...
  // (See full component code in implementation section)
}
```

### 3. Integration in Cart/Checkout

**File:** `app/(guest)/t/[tableCode]/cart/page.tsx`

```typescript
export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [offerResult, setOfferResult] = useState<OfferCalculationResult | null>(null);

  useEffect(() => {
    calculateWithOffer();
  }, [cart, selectedOfferId]);

  const calculateWithOffer = async () => {
    if (!selectedOfferId) {
      setOfferResult(null);
      return;
    }

    const calculator = new OfferCalculator(cart, customerData);
    const result = await calculator.calculateOffers();

    // Filter to only selected offer
    const selectedResult = {
      ...result,
      applied_offers: result.applied_offers.filter(o => o.id === selectedOfferId),
      discount_amount: result.applied_offers
        .filter(o => o.id === selectedOfferId)
        .reduce((sum, o) => sum + o.discount_amount, 0)
    };

    setOfferResult(selectedResult);
  };

  return (
    <div>
      {/* Cart Items */}
      <CartItems items={cart} />

      {/* Offer Selector */}
      <OfferSelector
        cart={cart}
        selectedOfferId={selectedOfferId}
        onOfferSelect={setSelectedOfferId}
        customerData={customerData}
      />

      {/* Promo Code Input */}
      <PromoCodeInput onApply={(code) => {/* Handle promo code */}} />

      {/* Bill Summary */}
      <BillSummary
        subtotal={getCartTotal(cart)}
        discount={offerResult?.discount_amount || 0}
        freeItems={offerResult?.free_items || []}
      />

      <button onClick={handlePlaceOrder}>
        Place Order
      </button>
    </div>
  );
}
```

---

## 💾 Database Schema Changes

### Required Additions

```sql
-- Add to order_items table
ALTER TABLE order_items
ADD COLUMN is_free_item BOOLEAN DEFAULT FALSE,
ADD COLUMN offer_id UUID REFERENCES offers(id);

-- Add to orders table
ALTER TABLE orders
ADD COLUMN offer_discount NUMERIC DEFAULT 0,
ADD COLUMN applied_offers JSONB DEFAULT '[]';

-- Index for performance
CREATE INDEX idx_order_items_offer_id ON order_items(offer_id);
CREATE INDEX idx_offer_usage_order_id ON offer_usage(order_id);
```

### Storing Offer Data

When order is placed with offers:

```sql
-- Insert into offer_usage
INSERT INTO offer_usage (
  offer_id,
  order_id,
  customer_phone,
  discount_amount,
  free_items,
  used_at
) VALUES (
  'offer-uuid',
  'order-uuid',
  '9876543210',
  250,
  '[{"item_id": "pizza-uuid", "quantity": 1}]'::jsonb,
  NOW()
);

-- Update orders table
UPDATE orders
SET
  offer_discount = 250,
  applied_offers = '[{"id": "offer-uuid", "name": "Buy 2 Get 1", "savings": 250}]'::jsonb
WHERE id = 'order-uuid';
```

### Querying Offers at Billing

```sql
-- Get all offers used in a session
SELECT
  o.id as order_id,
  o.total_amount,
  o.offer_discount,
  ou.offer_id,
  off.name as offer_name,
  ou.discount_amount,
  ou.free_items
FROM orders o
LEFT JOIN offer_usage ou ON o.id = ou.order_id
LEFT JOIN offers off ON ou.offer_id = off.id
WHERE o.table_session_id = 'session-uuid';
```

---

## 📝 Guest Flow Summary

### During Order Placement

1. Guest adds items to cart
2. **OfferSelector** shows all applicable offers
3. Best offer auto-selected (highest savings)
4. Guest can switch to different offer
5. For "Buy X Get Y" offers:
   - Modal asks: "Add free item to order?"
   - If YES: Free item added to order_items
   - KOT includes free item
6. Order placed with offer data stored

### At Billing

1. Admin/Guest clicks "Get Bill"
2. System aggregates all orders in session
3. Bill shows:
   - All items (including free ones)
   - Offer discounts per order
   - Total savings
4. Final amount calculated with taxes

---

## ❓ Open Questions

1. **Free Items Physical Delivery:**
   - Should guests actually receive free items (sent to kitchen)?
   - Or just see discount on bill?

2. **Offer Timing:**
   - Apply offers at each order placement?
   - Or only at final billing?
   - Or both (hybrid)?

3. **Multi-Order Aggregation:**
   - If guest orders 1 pizza in Order #1, then 1 pizza in Order #2 (total 2), should they get "Buy 2 Get 1" offer?

4. **Promo Code Entry:**
   - Where should guest enter promo code?
   - At each order checkout?
   - Once at session start?
   - At final billing?

5. **Offer Stacking:**
   - Allow multiple offers simultaneously?
   - Or enforce single offer per order/session?

---

## 🚀 Implementation Phases

### Phase 1: Core Functionality (Week 1)
- [ ] Create `lib/offers/selector.ts` with comparison logic
- [ ] Build `OfferSelector` component
- [ ] Integrate in cart/checkout page
- [ ] Update database schema
- [ ] Store offer data in orders

### Phase 2: Guest Experience (Week 2)
- [ ] Add promo code input
- [ ] Free item selection modal
- [ ] Offer badge in cart
- [ ] Mobile bottom sheet for offers

### Phase 3: Admin Integration (Week 3)
- [ ] Show offers in billing page
- [ ] Display offer savings in bills
- [ ] Offer analytics dashboard
- [ ] Offer usage reports

### Phase 4: Admin UI Improvements (Week 4)
- [ ] Tabbed offer management (Manage | Create)
- [ ] Improved offer creation form
- [ ] Offer preview/testing
- [ ] Bulk offer operations

---

## 📊 Success Metrics

- **Offer Usage Rate:** % of orders with offers applied
- **Average Savings:** Mean discount per order
- **Popular Offers:** Most frequently used offers
- **Conversion Impact:** Orders before/after offer application
- **Guest Satisfaction:** Feedback on offer selection UX

---

## 🔗 Related Files

- `lib/offers/calculator.ts` - Existing offer calculation logic
- `app/admin/offers/page.tsx` - Offer management
- `components/admin/offers/CreateOfferModal.tsx` - Offer creation
- `app/(guest)/t/[tableCode]/orders/page.tsx` - Guest orders page
- `app/admin/billing/page.tsx` - Admin billing

---

**Last Updated:** 2025-01-09
**Status:** Design Phase - Ready for Implementation
**Next Step:** Review and approve design, then start Phase 1
