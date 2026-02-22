# 🧪 Test Invitation Flow - Step by Step Guide

## Quick Test (5 minutes)

### Part 1: Create Test Deal with Invitation

1. **Go to DealGuard**:
   ```
   https://dealguard.org/deals/new
   ```

2. **Fill in Deal Details**:
   - Title: "Test Invitation Flow"
   - Description: "Testing auto-accept after signup"
   - Service Tier: Choose any
   - Currency: USD
   - Amount: 10000

3. **Add a Party**:
   - Role: "BUYER" (or any role)
   - Name: "Test Buyer"
   - Email: **Use a NEW email you haven't used before**
     - Example: `test+invite1@yourdomain.com`
     - Gmail tip: Add `+anything` before @gmail.com
   - Is Organization: No

4. **Submit the Deal**

5. **Get the Invitation Link**:
   - Check the email inbox for the party
   - OR copy from the browser console if emails aren't working
   - Look for: `https://dealguard.org/invitations/[TOKEN]`

---

### Part 2: Test the Invitation Flow

#### Test A: API Endpoints (Automated)

Run this command with your invitation token:

```bash
cd fouad-ai/backend/scripts
./test-invitation-api.sh [YOUR_TOKEN_HERE]
```

**Expected Results**:
- ✅ Step 1: Successfully fetches invitation details (200 OK)
- ✅ Step 2: Rejects acceptance without auth (401 Unauthorized)

---

#### Test B: Full User Flow (Manual)

**Prerequisites**: Use an incognito/private browser window

1. **Open Invitation Link**:
   ```
   https://dealguard.org/invitations/[YOUR_TOKEN]
   ```

2. **Verify Invitation Page**:
   - [ ] Page loads successfully
   - [ ] Shows deal title and details
   - [ ] Shows your party role
   - [ ] Shows "Sign Up & Accept" button (since you're not logged in)

3. **Click "Sign Up & Accept"**:
   - [ ] Redirects to `/sign-up?redirect=/invitations/[TOKEN]`
   - [ ] Shows blue banner: "You're signing up to join a deal"

4. **Complete Signup**:
   - [ ] Fill in email, password, etc.
   - [ ] Complete Clerk signup flow
   - [ ] **Watch for auto-redirect** (this is the magic!)

5. **Verify Auto-Accept**:
   - [ ] Automatically redirects to `/deals/[ID]?message=invitation-accepted`
   - [ ] Shows green success banner: "Welcome to the deal!"
   - [ ] Deal page loads with all details visible

6. **Check Deal List**:
   - [ ] Go to `/deals`
   - [ ] Deal appears in "My Deals" list
   - [ ] You can access it anytime now

---

### Part 3: Verify in Database (Optional)

If you have database access, verify:

```sql
-- Check party status changed to ACCEPTED
SELECT
  id, name, role, "invitationStatus", "respondedAt"
FROM "Party"
WHERE "invitationToken" = '[YOUR_TOKEN]';

-- Check party member was created
SELECT
  pm.id, pm."userId", u.name, u.email
FROM "PartyMember" pm
JOIN "User" u ON pm."userId" = u.id
WHERE pm."partyId" = '[PARTY_ID_FROM_ABOVE]';

-- Check audit log
SELECT
  "eventType", actor, "entityType", "createdAt", metadata
FROM "AuditLog"
WHERE "dealId" = '[DEAL_ID]'
ORDER BY "createdAt" DESC
LIMIT 5;
```

---

## 🎯 Success Criteria

### Frontend
- [x] Invitation page loads (public, no auth required)
- [x] "Sign Up & Accept" redirects to signup with invitation context
- [x] Signup page shows invitation message
- [x] After signup, auto-redirects back to invitation page
- [x] InvitationChecker detects pending invitation
- [x] Auto-calls accept API
- [x] Redirects to deal page with success message
- [x] Success banner displays
- [x] Deal appears in user's list

### Backend
- [x] GET /api/invitations/:token returns deal details (public)
- [x] POST /api/invitations/:token/accept requires auth (401 without token)
- [x] POST /api/invitations/:token/accept creates PartyMember
- [x] POST /api/invitations/:token/accept updates party status to ACCEPTED
- [x] POST /api/invitations/:token/accept creates audit log
- [x] Deal activates when all parties accept

---

## 🐛 Troubleshooting

### Issue: Page doesn't auto-redirect after signup

**Check**:
1. Open browser DevTools → Console
2. Look for: `📨 Found pending invitation, auto-accepting...`
3. Check Network tab for POST to `/api/invitations/[token]/accept`

**Fix**:
- Clear localStorage and try again
- Check if InvitationChecker is loaded in layout
- Verify Clerk session is active

---

### Issue: "Deal not found" after accepting

**Check**:
1. Verify user is authenticated
2. Check PartyMember was created in database
3. Verify listDeals query includes party members

**Fix**:
- Check deals.service.ts line 318-328
- Verify query: `parties.members.userId`

---

### Issue: API returns 404 for invitation

**Check**:
1. Verify token is correct
2. Check party hasn't already accepted
3. Verify invitation wasn't declined

---

## 📹 Recording the Test

For documentation, record your screen while testing:

1. **Screen Record**: Start recording
2. **Open incognito window**: Show empty state
3. **Paste invitation link**: Show invitation page load
4. **Click Sign Up & Accept**: Show redirect
5. **Complete signup**: Show form fill
6. **Watch auto-redirect**: Capture the magic moment!
7. **Show success message**: Green banner
8. **Show deals list**: Deal is there!

This recording will be valuable for:
- User onboarding documentation
- Support troubleshooting
- Future feature comparisons

---

## ✅ Test Checklist

Use this checklist for each test run:

```
[ ] Created test deal with new party email
[ ] Received invitation email (or have token)
[ ] Opened link in incognito window
[ ] Invitation page loaded successfully
[ ] Clicked "Sign Up & Accept"
[ ] Saw invitation context message on signup page
[ ] Completed Clerk signup
[ ] Auto-redirected to deal page
[ ] Saw success message banner
[ ] Deal appeared in "My Deals" list
[ ] Party status is ACCEPTED in database
[ ] PartyMember record created in database
[ ] Audit log shows PARTY_ACCEPTED_INVITATION
```

---

## 🚀 Next: Test Edge Cases

After basic flow works, test these scenarios:

1. **Already Accepted**:
   - Use same invitation link again
   - Should show "Already accepted" message

2. **Existing User**:
   - Log in first, then open invitation
   - Should accept directly without signup

3. **Multiple Parties**:
   - Create deal with 3 parties
   - Have each accept independently
   - Verify deal activates after last one

4. **Declined Invitation**:
   - Decline an invitation
   - Try to accept - should fail

---

**Ready to test?** Follow Part 1 → Part 2 → Part 3 in order!
