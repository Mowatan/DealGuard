# 🧪 Testing the New Deal Creation Flow - UI Guide

## Prerequisites

✅ **Servers Running:**
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

✅ **User Account:**
- You need to be signed in to Clerk
- If not, go to http://localhost:3000/sign-in

---

## 🎯 Test Scenario: Commercial Property Sale

We'll create a deal with **5 parties** including **2 custom roles**.

---

## 📝 Step-by-Step Testing Instructions

### **Step 1: Navigate to Create New Deal**

1. Open browser: http://localhost:3000/deals/new
2. You should see the **5-step progress bar** at the top:
   - [ ] Your Role → [ ] Details → [ ] Counterparty → [ ] Additional → [ ] Review
3. Current step should be highlighted in **blue**

---

### **Step 2: Your Role (Step 1 of 5)**

You should see a page titled: **"What is your role in this transaction?"**

**Test Actions:**

1. ✅ **Select "Buyer"** radio button
   - The card should highlight with blue border
   - Description shows: "I am purchasing the asset/property"

2. ✅ **Try selecting "Other"**
   - A text input should appear below
   - Type: `Legal Representative`
   - Max 50 characters enforced

3. ✅ **Switch back to "Broker"**
   - The custom text input should disappear

4. ✅ **Click "Next"** button
   - You should advance to Step 2
   - Progress bar shows Step 1 with green checkmark

**Validation Tests:**
- Try clicking "Next" without selecting anything → Error: "Please select your role"
- Select "Other" and click "Next" without text → Error: "Please describe your role"

---

### **Step 3: Deal Details (Step 2 of 5)**

You should see: **"Deal Details"**

**Test Actions:**

1. ✅ **Your Role Display**
   - Should show "BROKER" (or whatever you selected)
   - Gray background, read-only

2. ✅ **Enter Deal Title:**
   ```
   Commercial Property Sale - 123 Main Street
   ```

3. ✅ **Enter Description (optional):**
   ```
   Sale of a commercial property in downtown area. Property includes ground floor retail space and upper floor offices.
   ```

4. ✅ **Click "Next"**
   - Advance to Step 3

**Validation Tests:**
- Clear title field and click "Next" → Error: "Deal title is required"
- Enter "AB" (too short) → Error: "Title must be at least 3 characters"

---

### **Step 4: Invite Counterparty (Step 3 of 5)**

You should see: **"Invite Counterparty"** with subtitle "Who is the other main party in this transaction?"

**Test Actions:**

1. ✅ **Enter Counterparty Details:**
   - **Name:** `Jane Smith`
   - **Email:** `jane.smith@example.com`
   - **Role:** Select `SELLER` from dropdown
   - **Phone:** `+1 234 567 8901` (optional)
   - **Is Organization:** Leave unchecked

2. ✅ **Test Custom Role for Counterparty:**
   - Change Role to `OTHER`
   - A text input should appear
   - Type: `Property Owner`

3. ✅ **Click "Next"**

**Validation Tests:**
- Try without name → Error: "Name is required"
- Try invalid email → Error: "Invalid email address"
- Select "OTHER" without text → Error: "Please specify their role"

---

### **Step 5: Additional Parties (Step 4 of 5)**

You should see: **"Additional Parties (Optional)"**

**Empty State:**
- Shows user icon and "No additional parties yet"
- "Add Party" button

**Test Actions:**

1. ✅ **Add First Additional Party:**
   - Click "Add Party" button
   - A card labeled "Additional Party 1" appears

   **Fill in:**
   - **Name:** `Bob Wilson`
   - **Email:** `bob.wilson@example.com`
   - **Role:** Select `OTHER` from dropdown
   - **Custom Role:** `Legal Representative`
   - **Phone:** `+1 234 567 8902`

2. ✅ **Add Second Additional Party:**
   - Click "Add Another Party" button at bottom
   - Fill in:
     - **Name:** `Sarah Johnson`
     - **Email:** `sarah.johnson@example.com`
     - **Role:** `AGENT`
     - **Phone:** `+1 234 567 8903`

3. ✅ **Add Third Party (Organization):**
   - Click "Add Another Party"
   - Fill in:
     - **Name:** `SecureEscrow LLC`
     - **Email:** `contact@secureescrow.com`
     - **Role:** `OTHER` → `Escrow Service Provider`
     - **Phone:** `+1 234 567 8904`
     - **Is Organization:** ✅ Check this box

4. ✅ **Test Remove Functionality:**
   - Click the **red trash icon** on any party card
   - That party should be removed

5. ✅ **Click "Next"**

**Validation Tests:**
- Try clicking "Next" with incomplete party (name but no email) → Error toast
- Try clicking "Next" with invalid email → Error toast

---

### **Step 6: Review & Create (Step 5 of 5)**

You should see: **"Review & Create"** with complete summary

**Verify Display:**

1. ✅ **Deal Information Section:**
   - Title: "Commercial Property Sale - 123 Main Street"
   - Description shown

2. ✅ **Parties Section (5 total):**

   **Your Card (Blue background with "You" badge):**
   - Your name
   - Your email
   - Role: BROKER

   **Counterparty Card (Gray background):**
   - Jane Smith
   - jane.smith@example.com
   - Role: Property Owner (custom!)

   **Additional Party 1:**
   - Bob Wilson
   - bob.wilson@example.com
   - Role: Legal Representative (custom!)

   **Additional Party 2:**
   - Sarah Johnson
   - sarah.johnson@example.com
   - Role: AGENT

   **Additional Party 3:**
   - SecureEscrow LLC
   - contact@secureescrow.com
   - Role: Escrow Service Provider (custom!)
   - "Organization" badge shown

3. ✅ **Info Box:**
   - Yellow/amber background
   - Lists what happens next:
     - Deal created in DRAFT status
     - Invitation emails sent
     - Parties can sign up via link
     - You'll be redirected

4. ✅ **Click "Create Deal & Send Invitations"**

**Expected Results:**
- Button text changes to "Creating..."
- After 1-2 seconds:
  - ✅ Success toast appears: "Deal created and invitations sent!"
  - ✅ You're redirected to: `/admin/deals/{dealId}`
  - ✅ Deal detail page loads showing the new deal

---

## 📧 Email Verification

### **Check Console Logs (Backend)**

The backend should log email sending:

```
📧 Email queued: party-invitation
   To: jane.smith@example.com
   Subject: You've been invited to join a DealGuard transaction

📧 Email queued: party-invitation
   To: bob.wilson@example.com
   ...
```

### **Check Email Queue (If Redis configured)**

```bash
redis-cli
> KEYS *email*
> LRANGE bull:email-sending:wait 0 -1
```

### **Check Email Template Variables**

Each invitation email should include:
- `{{invitedName}}` - Party's name
- `{{inviterName}}` - Your name
- `{{dealTitle}}` - Deal title
- `{{yourRole}}` - Their assigned role (including custom roles!)
- `{{dealNumber}}` - Generated deal number
- `{{signUpLink}}` - Link with query params

**Example Sign-Up Link:**
```
http://localhost:3000/sign-up?dealId=abc123&email=jane.smith@example.com&name=Jane%20Smith
```

---

## 🔍 Database Verification

### **Check Deal Created:**

```sql
SELECT * FROM "Deal"
WHERE title = 'Commercial Property Sale - 123 Main Street'
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Expected:**
- `status` = 'DRAFT'
- `dealNumber` = 'DEAL-2025-XXXX'
- `emailAddress` = 'deal-{id}@dealguard.org'

### **Check Parties Created:**

```sql
SELECT id, role, name, "contactEmail", "isOrganization"
FROM "Party"
WHERE "dealId" = '{your_deal_id}'
ORDER BY "createdAt";
```

**Expected 5 rows:**
1. BROKER - You
2. Property Owner - Jane (custom role!)
3. Legal Representative - Bob (custom role!)
4. AGENT - Sarah
5. Escrow Service Provider - SecureEscrow (custom role!)

---

## 🎯 Key Features to Verify

### ✅ **Custom Roles Work:**
- Custom roles stored as plain strings
- Displayed correctly in UI
- Included in email invitations
- No errors from backend

### ✅ **Visual Progress Indicator:**
- Shows current step in blue
- Previous steps show green checkmarks
- Future steps show gray

### ✅ **Navigation:**
- Back button works (except Step 1)
- Next validates before advancing
- Can't skip steps

### ✅ **Validation:**
- Inline errors show in red
- Toast notifications for complex errors
- Clear, helpful error messages

### ✅ **Organization Support:**
- Checkbox works
- Badge displays correctly
- Stored in database

### ✅ **Email Invitations:**
- Creator gets confirmation email
- Others get invitation emails
- Links include deal context

---

## 🐛 Common Issues & Fixes

### **"Authentication required" error:**
- Make sure you're signed in via Clerk
- Check: http://localhost:3000/sign-in

### **Backend not responding:**
- Check: http://localhost:4000/health
- Restart: `cd fouad-ai/backend && npm run dev`

### **Frontend errors:**
- Check browser console (F12)
- Check: http://localhost:3000
- Restart: `cd fouad-ai/frontend && npm run dev`

### **Custom roles not saving:**
- Check backend logs for errors
- Verify `role` field in database is string type

### **Emails not sending:**
- Check Redis is running
- Check SMTP config in `.env`
- Set `EMAIL_TEST_MODE=true` to capture emails

---

## ✅ Success Criteria

The test is **SUCCESSFUL** if:

1. ✅ All 5 steps completed without errors
2. ✅ Custom roles (Legal Representative, Property Owner, Escrow Service Provider) accepted
3. ✅ Deal created with status = DRAFT
4. ✅ All 5 parties created in database
5. ✅ Custom roles stored as strings
6. ✅ Organization flag works
7. ✅ Redirected to deal detail page
8. ✅ Success toast displayed
9. ✅ Email queue contains 4 invitation jobs
10. ✅ Creator info correctly identified

---

## 📸 Screenshots to Take

If documenting, capture:
1. Step 1 - Role selection with "Other" expanded
2. Step 2 - Deal details form
3. Step 3 - Counterparty form with custom role
4. Step 4 - Multiple additional parties
5. Step 5 - Review page showing all parties
6. Success toast after creation
7. Final deal detail page

---

## 🎉 What This Tests

✅ Multi-step wizard flow
✅ Custom role support (unlimited text)
✅ Organization support
✅ Party invitation system
✅ Email queuing
✅ Frontend validation
✅ Backend validation
✅ Database persistence
✅ User experience (smooth flow)
✅ Authentication integration

---

**Happy Testing! 🚀**

If you encounter any issues, check:
- Browser console (F12)
- Backend logs
- Network tab for API calls
- Database state
