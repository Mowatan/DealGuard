# Currency & Transaction Amount Testing Guide

## ✅ What Was Implemented

### 1. Currency Selection (All Transaction Types)
- **Location**: Step 2 of deal creation wizard
- **Options**: EGP, USD, EUR, GBP, AED, SAR
- **Applies to**: All amounts in the deal (milestones inherit the deal currency)

### 2. Transaction Amount for SIMPLE Deals
- **Location**: Step 2, appears when "Simple Transaction" is selected
- **Field**: "Total Transaction Amount"
- **Validation**: Required, must be positive number
- **Storage**: Saved to `deal.totalAmount` field

### 3. Milestone Amounts for MILESTONE_BASED Deals
- **Location**: Step 5 (Milestones configuration)
- **Each milestone has**: Name, Description, Amount, Deadline (optional)
- **Total**: Automatically calculated and displayed in selected currency

### 4. Backend Changes
- **Schema**: Updated to accept `currency` and `totalAmount`
- **Service**: Stores currency and amount in database
- **Routes**: Validation schema updated (but needs `serviceTier` field now)

---

## 🧪 Manual Testing Steps

### Test 1: Simple Transaction with USD

1. Open http://localhost:3000/deals/new
2. **Step 1 - Your Role**: Select any role (e.g., "Buyer")
3. **Step 2 - Deal Details**:
   - Title: "Test Simple Deal - USD"
   - Description: "Testing USD currency"
   - Transaction Type: **Simple Transaction**
   - Currency: Select **USD**
   - Total Transaction Amount: Enter **50,000**
4. **Step 3 - Counterparty**: Enter test details
   - Name: "Test Seller"
   - Email: "seller@test.com"
   - Role: "Seller"
5. **Step 4 - Additional Parties**: Skip (click Next)
6. **Step 5 - Review**: Verify that:
   - ✅ Currency shows as "USD"
   - ✅ Total Amount shows as "50,000 USD"
7. Click "Create Deal"

**Expected Result**: Deal created with USD currency and $50,000 amount

---

### Test 2: Milestone-Based with EUR

1. Open http://localhost:3000/deals/new
2. **Step 1**: Select role
3. **Step 2**:
   - Title: "Test Milestone Deal - EUR"
   - Transaction Type: **Milestone-Based Transaction**
   - Currency: Select **EUR**
   - (Note: No amount field - will be calculated from milestones)
4. **Step 3**: Add counterparty
5. **Step 4**: Skip additional parties
6. **Step 5 - Configure Milestones**:
   - Milestone 1:
     - Name: "Initial Deposit"
     - Description: "First payment"
     - Amount: **10,000**
   - Milestone 2:
     - Name: "Second Payment"
     - Description: "Second installment"
     - Amount: **15,000**
   - Milestone 3:
     - Name: "Final Payment"
     - Description: "Final installment"
     - Amount: **25,000**
7. Check the total at bottom: Should show **50,000 EUR**
8. **Step 6 - Review**: Verify:
   - ✅ Currency shows as "EUR"
   - ✅ Total Amount shows as "50,000 EUR (3 milestones)"
9. Create deal

**Expected Result**: Deal created with EUR currency and 3 milestones totaling €50,000

---

### Test 3: Simple Transaction with EGP (Default)

1. Create new deal
2. Select **Simple Transaction**
3. Leave currency as **EGP** (default)
4. Enter amount: **1,500,000**
5. Complete the form and create

**Expected Result**: Deal created with EGP 1,500,000

---

## 🔍 Verification Checklist

After creating deals, verify in the database or admin panel:

- [ ] `deal.currency` field stores the selected currency
- [ ] `deal.totalAmount` stores the amount for SIMPLE transactions
- [ ] `deal.totalAmount` stores sum of milestones for MILESTONE_BASED
- [ ] All milestone `amount` fields are stored correctly
- [ ] All milestone `currency` fields match the deal currency

---

## ⚠️ Known Issues / Notes

### Service Tier Requirement
The backend schema now requires a `serviceTier` field:
- `GOVERNANCE_ADVISORY`
- `DOCUMENT_CUSTODY`
- `FINANCIAL_ESCROW`

Tiers 2 & 3 also require `estimatedValue`.

### To Fix API Tests
Update test payloads to include:
```javascript
{
  serviceTier: 'GOVERNANCE_ADVISORY',
  // ... rest of payload
}
```

---

## 🎯 Key Files Modified

### Frontend:
1. `frontend/app/deals/new/page.tsx`
   - Added currency state and selector
   - Added totalAmount for SIMPLE transactions
   - Updated validation
   - Updated review step to show currency and amount

2. `frontend/components/admin/CreateDealModal.tsx`
   - Added currency and amount fields for consistency

### Backend:
1. `backend/src/modules/deals/deals.service.ts`
   - Updated `CreateDealParams` interface
   - Added `currency` and `totalAmount` parameters
   - Stores values in database

2. `backend/src/modules/deals/deals.routes.ts`
   - Updated `createDealSchema` to accept new fields
   - (Note: Schema now requires `serviceTier` - may need frontend update)

### Database Schema:
- `Deal.currency` (default: "EGP")
- `Deal.totalAmount` (Decimal)
- `Milestone.currency` (default: "EGP")
- `Milestone.amount` (Decimal)

---

## 📊 Test Data Examples

### Currencies to Test:
- ✅ EGP (Egyptian Pound) - Default
- ✅ USD (US Dollar)
- ✅ EUR (Euro)
- ✅ GBP (British Pound)
- ✅ AED (UAE Dirham)
- ✅ SAR (Saudi Riyal)

### Amounts to Test:
- Small: 1,000
- Medium: 50,000
- Large: 1,500,000
- Decimal: 1,234.56

---

## 🚀 Next Steps

1. **Manual UI Testing**: Follow the test cases above
2. **Fix Backend Schema**: Ensure frontend sends `serviceTier`
3. **Database Verification**: Check that values are stored correctly
4. **API Testing**: Update test scripts with required fields
5. **Edge Cases**: Test with zero amounts, negative amounts (should fail), missing currency

---

## 💡 Tips

- Use browser DevTools Network tab to inspect API requests/responses
- Check browser console for any errors
- Verify email notifications include currency information
- Test with different users to ensure permissions work correctly
