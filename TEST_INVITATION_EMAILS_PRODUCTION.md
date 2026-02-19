# Test Invitation Emails in Production

**Quick guide to test party invitation emails on Railway**

---

## Option 1: Create Deal via Frontend (EASIEST)

### Steps:

1. **Go to:** https://dealguard.org
2. **Sign in** with your account
3. **Click:** "Create New Deal"
4. **Fill in deal details:**
   - Title: "Test Deal - Email Testing"
   - Description: "Testing party invitation emails"
   - Amount: 50,000 EGP
   - Service Tier: Governance Advisory

5. **Add multiple parties:**
   - **Party 1:**
     - Role: BUYER
     - Name: Test Buyer
     - Email: your-email+buyer@gmail.com
   - **Party 2:**
     - Role: SELLER
     - Name: Test Seller
     - Email: your-email+seller@gmail.com
   - **Party 3:**
     - Role: AGENT
     - Name: Test Agent
     - Email: your-email+agent@gmail.com

6. **Submit** the deal

### What Happens:
- ✅ Deal is created
- ✅ 3 party invitation emails sent
- ✅ 1 admin notification sent to trust@dealguard.org

### Check Results:
1. **Check your inbox** (all 3 test emails should arrive)
2. **Verify invitation links** don't show `{{invitationToken}}`
3. **Should look like:** `https://dealguard.org/confirm-invitation/abc123...`
4. **Click a link** to test the invitation flow

---

## Option 2: Run Test Script on Railway (ADVANCED)

### Steps:

1. **SSH into Railway:**
```bash
railway run bash
```

2. **Run test script:**
```bash
cd backend
npx ts-node scripts/create-test-deal-with-parties.ts
```

3. **Check output** for invitation links

4. **Check emails:**
   - If `EMAIL_TEST_MODE=true`: Check `EMAIL_TEST_RECIPIENT`
   - If `EMAIL_TEST_MODE=false`: Check actual party emails

---

## Option 3: Use API Directly (MANUAL)

### Create Deal via API:

```bash
curl -X POST https://dealguard.org/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Deal - Email Testing",
    "description": "Testing party invitation emails",
    "currency": "EGP",
    "totalAmount": 50000,
    "serviceTier": "GOVERNANCE_ADVISORY",
    "transactionType": "SIMPLE",
    "parties": [
      {
        "role": "BUYER",
        "name": "Test Buyer",
        "contactEmail": "your-email+buyer@gmail.com",
        "isOrganization": false
      },
      {
        "role": "SELLER",
        "name": "Test Seller",
        "contactEmail": "your-email+seller@gmail.com",
        "isOrganization": false
      }
    ]
  }'
```

---

## What to Check

### ✅ In Party Invitation Emails:

**Subject:** "You've been invited to join a DealGuard transaction"

**Check these variables render correctly:**
- [ ] {{recipientName}} → Shows party name (not literal `{{}}`)
- [ ] {{inviterName}} → Shows your name
- [ ] {{dealTitle}} → Shows deal title
- [ ] {{dealNumber}} → Shows DEAL-2026-XXXX
- [ ] {{partyRole}} → Shows BUYER/SELLER/AGENT
- [ ] {{dealValue}} → Shows 50000 (or your amount)
- [ ] {{currency}} → Shows EGP
- [ ] {{serviceTier}} → Shows GOVERNANCE_ADVISORY
- [ ] **{{invitationUrl}}** → Shows full link like `https://dealguard.org/confirm-invitation/abc123...`

**Most Important:** The invitation link button should have a REAL token, not `{{invitationToken}}`!

### ✅ In Admin Email (trust@dealguard.org):

**Subject:** "New Deal Created - DEAL-2026-XXXX"

**Check these variables render correctly:**
- [ ] {{dealNumber}} → Shows DEAL-2026-XXXX
- [ ] {{dealTitle}} → Shows deal title
- [ ] {{creatorName}} → Shows your name
- [ ] {{creatorEmail}} → Shows your email
- [ ] {{serviceTier}} → Shows tier
- [ ] {{totalAmount}} → Shows amount
- [ ] {{currency}} → Shows currency
- [ ] {{partiesCount}} → Shows 2 or 3
- [ ] {{createdAt}} → Shows Cairo time

---

## Email Testing Mode

### Check Current Mode:

```bash
railway variables | grep EMAIL_TEST
```

### If EMAIL_TEST_MODE=true:
- All emails redirect to `EMAIL_TEST_RECIPIENT`
- Good for testing without spamming real emails
- **To test for real:** Set `EMAIL_TEST_MODE=false`

### If EMAIL_TEST_MODE=false:
- Emails go to actual recipients
- Use Gmail+ trick: `youremail+test@gmail.com`
- All go to same inbox but treated as different addresses

---

## Click Test - Invitation Link

### After receiving email:

1. **Click:** "Review & Accept Invitation" button
2. **Should redirect to:** `https://dealguard.org/confirm-invitation/[token]`
3. **Page should show:**
   - Deal details
   - Your role
   - Other parties
   - Accept/Decline buttons

4. **If not signed in:** Should redirect to sign-up first
5. **After signing in:** Should show invitation page

### If Link Broken:

**Check Railway logs:**
```bash
railway logs | grep "Rendering template"
```

**Look for:**
```
📧 Rendering template "party-invitation" with variables:
   Variables provided: recipientName, inviterName, dealTitle, partyRole, dealNumber, dealValue, currency, serviceTier, invitationUrl
   ✓ Replaced {{invitationUrl}} (1 occurrence(s))
```

**If you see:**
```
⚠️ Unreplaced variables in template "party-invitation": {{invitationToken}}
```

Then there's a mismatch between template and variables!

---

## Quick Verification

### After creating test deal:

```bash
# Check logs for email sending
railway logs --filter "Sending email"

# Should see:
# Sending email: party-invitation to test-buyer@...
# Sending email: party-invitation to test-seller@...
# Sending email: admin-new-deal to trust@dealguard.org
```

### Check email queue:

```bash
railway run bash
redis-cli
> LLEN bull:email-sending:wait
# Should return 0 if all processed
```

---

## Success Criteria

✅ **All emails received** (3 party + 1 admin = 4 total)
✅ **No `{{}}` literals** in any email
✅ **Invitation links work** (click redirects to proper page)
✅ **All variables render** correctly
✅ **Admin notification** received at trust@dealguard.org

---

## If Something Goes Wrong

### Emails not arriving:

1. **Check Mailgun dashboard:** https://app.mailgun.com/mg/dashboard
2. **Check logs:** `railway logs | grep "email"`
3. **Check test mode:** `railway variables | grep EMAIL_TEST`
4. **Check spam folder**

### Variables not replacing:

1. **Check template cache** (should be disabled in dev now)
2. **Check logs for unreplaced variables**
3. **Verify variable names match** in template and backend

### Links showing `{{invitationToken}}`:

1. **This means old cached template** - restart deployment
2. **Or template uses wrong variable** - check template source
3. **Or backend sends wrong variable** - check deals.service.ts

---

## Recommended Test

**Use Gmail+ trick for solo testing:**

Create deal with parties:
- `youremail+buyer@gmail.com`
- `youremail+seller@gmail.com`
- `youremail+agent@gmail.com`

All emails arrive in ONE inbox (yours!) but system treats them as different addresses.

Perfect for testing invitation flow without needing multiple email accounts!

---

**Ready to test! Create a deal on https://dealguard.org now.**
