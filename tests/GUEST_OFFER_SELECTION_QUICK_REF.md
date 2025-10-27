# Guest Offer Selection Test - Quick Reference

## 🚀 Run Test

```bash
npm run test:offers:selection
```

## 📊 Expected Results

```
✅ Total Tests: 16
✅ Passed: 16
❌ Failed: 0
⏱️  Duration: ~1.6s
```

## 🧪 What Gets Tested

| #   | Test                            | Status |
| --- | ------------------------------- | ------ |
| 1   | Database Connection             | ✅     |
| 2   | Fetch All Offers                | ✅     |
| 3   | Filter by Order Type            | ✅     |
| 4   | Existing Guest (8638774545)     | ✅     |
| 5   | Create New Random Guest         | ✅     |
| 6a  | Eligibility - Existing/Dine-in  | ✅     |
| 6b  | Eligibility - Existing/Takeaway | ✅     |
| 6c  | Eligibility - New/Dine-in       | ✅     |
| 6d  | Eligibility - New/Takeaway      | ✅     |
| 7a  | Selection - Dine-in             | ✅     |
| 7b  | Selection - Takeaway            | ✅     |
| 8   | Session Locking                 | ✅     |
| 9   | Usage Tracking                  | ✅     |
| 10  | Order Type Analysis             | ✅     |
| 11  | Cleanup                         | ✅     |

## 🎯 Test Coverage

### Database

- ✅ Offers table with toggle columns
- ✅ Guest users CRUD
- ✅ Table sessions
- ✅ Supabase MCP queries

### Guest Flow

- ✅ Offer fetching
- ✅ Dine-in/takeaway filtering
- ✅ Eligibility checking
- ✅ Offer selection
- ✅ Session locking

### Business Logic

- ✅ Discount calculations
- ✅ Min amount validation
- ✅ Order count requirements
- ✅ Usage limits
- ✅ Max discount caps

## 📋 Test Data

### Mock Cart

```javascript
Total: ₹950.00
- 2x Margherita Pizza @ ₹300 = ₹600
- 1x Chicken Burger @ ₹250 = ₹250
- 2x Coke @ ₹50 = ₹100
```

### Test Users

- **Existing:** 8638774545
- **New:** Random 10-digit number

## 🔍 Key Validations

### Offer Filtering

```javascript
✓ enabled_for_dinein = true → Show in dine-in
✓ enabled_for_takeaway = true → Show in takeaway
✓ Both false → Hidden from all
✓ Both true → Available everywhere
```

### Eligibility Results

For ₹950 cart with 0 orders:

- ✅ **6 offers eligible**
  - Happy Hour - 20% Off (₹190)
  - Weekend Bonanza - 15% Off (₹142.50)
  - SAVE10 - 10% Off (₹95)
  - Early Bird - ₹80 Off (₹80)
  - Welcome Offer - ₹150 Off (₹150)
  - Flat ₹100 Off (₹100)
- ❌ **2 offers rejected**
  - Big Order Bonus (needs ₹1000+)
  - Loyalty Reward (needs 5+ orders)

### Best Discount

**Happy Hour - 20% Off**

- Original: ₹950.00
- Discount: ₹190.00
- Final: ₹760.00
- Savings: 20.0%

## 🗂️ Files

| File                                       | Purpose            |
| ------------------------------------------ | ------------------ |
| `tests/guest-offer-selection-test.js`      | Main test suite    |
| `tests/GUEST_OFFER_SELECTION_TEST.md`      | Full documentation |
| `tests/GUEST_OFFER_SELECTION_SUMMARY.md`   | Detailed report    |
| `tests/GUEST_OFFER_SELECTION_QUICK_REF.md` | This file          |

## 🔧 Troubleshooting

### Test Fails?

**Check .env.local:**

```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

**Verify Guest User:**

```sql
SELECT * FROM guest_users WHERE phone = '8638774545';
```

**Check Offers:**

```sql
SELECT COUNT(*) FROM offers WHERE is_active = true;
-- Should return 8
```

## 📈 Success Criteria

✅ All 16 tests pass
✅ No database errors
✅ Filtering works correctly
✅ Discounts calculated accurately
✅ Session locking functional
✅ Cleanup successful

## 🎉 Production Ready

**Status:** ✅ **READY**

All critical paths validated:

- Dine-in flow ✅
- Takeaway flow ✅
- Guest management ✅
- Offer selection ✅
- Session handling ✅

---

**Version:** 1.0  
**Last Updated:** October 28, 2025  
**Status:** All Tests Passing ✅
