# Amendment System Testing Guide

## 🚀 System Status
- **Backend:** http://localhost:4000 ✅ Running
- **Frontend:** http://localhost:3000 ✅ Running

## 📋 Testing Checklist

### Part 1: Frontend UI Testing (Manual in Browser)

#### 1. Navigate to Deal Detail Page
1. Open http://localhost:3000
2. Sign in with your Clerk credentials
3. Navigate to "Deals" page
4. Click on any existing deal to open deal detail page
5. **Look for the new "Amendments" tab** at the top

#### 2. Test Amendments Tab
**Expected UI Elements:**
- ✅ "Propose Amendment" button (top right)
- ✅ "Request Deal Deletion" button (top right)
- ✅ "Amendment History" section (timeline view)
- ✅ "Pending Amendments" section (if any exist)

#### 3. Test Propose Amendment Modal
**Steps:**
1. Click "Propose Amendment" button
2. Modal should open with form

**Test Cases:**
- [ ] Select each amendment type (6 options):
  - Add Party
  - Remove Party
  - Update Deal Terms
  - Change Milestone
  - Update Payment Schedule
  - Other
- [ ] Enter description (required)
- [ ] Enter JSON changes (optional) - use placeholder examples
- [ ] Enter reason (required)
- [ ] Click "Propose Amendment"
- [ ] Verify success toast notification
- [ ] Verify modal closes
- [ ] Verify amendment appears in Pending Amendments

**Example Data:**
```
Type: Update Deal Terms
Description: Change total amount due to client request
Changes: {"totalAmount": 15000}
Reason: Client requested payment adjustment based on new requirements
```

#### 4. Test Pending Amendments Display
**Verify:**
- [ ] Amendment appears with status badge (Pending)
- [ ] Shows proposer name
- [ ] Shows amendment type
- [ ] Shows approval status (X/Y approvals)
- [ ] Shows party-by-party approval list with icons:
  - ✅ Green checkmark = Approved
  - ❌ Red X = Disputed
  - ⏰ Yellow clock = Awaiting response

#### 5. Test Amendment Approval/Dispute
**As a different party (use another account):**
1. Navigate to the same deal
2. Go to Amendments tab
3. See the pending amendment

**Test Approve:**
- [ ] Click "Approve" button
- [ ] Modal opens showing amendment details
- [ ] "Approve this amendment" is selected by default
- [ ] Add optional notes
- [ ] Click "Approve Amendment"
- [ ] Verify success toast
- [ ] Verify your approval shows in party list
- [ ] If all parties approved → Status changes to "Applied"

**Test Dispute:**
- [ ] Click "Dispute" button
- [ ] Modal opens
- [ ] Select "Dispute this amendment"
- [ ] Enter dispute reason (required field should show)
- [ ] Click "Dispute Amendment"
- [ ] Verify success toast with "escalated to admin" message
- [ ] Status changes to "Disputed"
- [ ] Dispute reason shows in red alert box

#### 6. Test Amendment History
**Verify Timeline Display:**
- [ ] All amendments shown in chronological order (newest first)
- [ ] Each amendment has:
  - Status icon (green ✅, red ❌, yellow ⏰, etc.)
  - Amendment type badge
  - Proposer name and timestamp
  - Description and reason
  - Party responses with timestamps
  - Admin resolution (if applicable)
- [ ] Vertical timeline line connects amendments
- [ ] Applied amendments show blue success box
- [ ] Rejected amendments show gray box

#### 7. Test Delete Deal Button
**Safety Checks:**
1. Click "Request Deal Deletion" button
2. Modal should open

**If Deal Has Blockers:**
- [ ] Shows red alert box listing blockers:
  - Documents in custody
  - Funds in escrow
  - Active milestones
- [ ] Shows "Required Actions" list in orange
- [ ] "Close" button only (no deletion allowed)
- [ ] Contact info displayed

**If Deal is Safe to Delete:**
- [ ] Shows green checklist with ✓ marks:
  - ✓ Documents in custody: NO
  - ✓ Funds in escrow: NO
  - ✓ Active milestones: 0
- [ ] Reason field is shown (required)
- [ ] Warning about multi-party approval
- [ ] "Request Deletion" button enabled
- [ ] Submit and verify all parties notified

#### 8. Test Admin Amendment Resolution Page
**Navigate to Admin Page:**
1. Go to http://localhost:3000/admin/amendments
2. Should see list of disputed amendments

**Test Resolution:**
- [ ] Each disputed amendment shows:
  - Deal number and title
  - Proposer name and reason
  - Dispute reason and disputing party
  - Party response summary
- [ ] Click "Resolve Dispute" button
- [ ] Modal opens with 3 resolution options:
  - 🟢 Approve Amendment (override dispute)
  - 🔴 Reject Amendment (support dispute)
  - 🔵 Request Compromise (ask parties to negotiate)
- [ ] Select each option and verify color changes
- [ ] Enter resolution notes (required)
- [ ] Click "Submit Resolution"
- [ ] Verify success toast
- [ ] Verify amendment removed from disputed list
- [ ] Check deal amendments tab to see updated status

### Part 2: API Testing (Use These Curl Commands)

#### Test 1: Get Deal Amendments
```bash
# Replace {dealId} with actual deal ID
# Replace {token} with your Clerk JWT token

curl -X GET "http://localhost:4000/deals/{dealId}/amendments" \
  -H "Authorization: Bearer {token}"
```

**Expected Response:**
```json
[
  {
    "id": "clx...",
    "dealId": "deal123",
    "proposedBy": "user123",
    "proposedByName": "John Doe",
    "status": "PENDING",
    "proposedChanges": {
      "_amendmentType": "update_terms",
      "_description": "Change payment terms",
      "_reason": "Client requested",
      "totalAmount": 15000
    },
    "createdAt": "2026-02-15T...",
    "responses": [...]
  }
]
```

#### Test 2: Propose Amendment
```bash
curl -X POST "http://localhost:4000/deals/{dealId}/amendments" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "proposedChanges": {
      "_amendmentType": "update_terms",
      "_description": "Update total amount",
      "_reason": "Client budget adjustment",
      "totalAmount": 20000
    }
  }'
```

**Expected Response:**
```json
{
  "id": "clx...",
  "dealId": "...",
  "status": "PENDING",
  "proposedBy": "...",
  "proposedByName": "...",
  ...
}
```

#### Test 3: Approve Amendment
```bash
curl -X POST "http://localhost:4000/amendments/{amendmentId}/approve" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "partyId": "{yourPartyId}",
    "notes": "I approve this change"
  }'
```

#### Test 4: Dispute Amendment
```bash
curl -X POST "http://localhost:4000/amendments/{amendmentId}/dispute" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "partyId": "{yourPartyId}",
    "notes": "I disagree with this amount, it should be $18000"
  }'
```

#### Test 5: Get Disputed Amendments (Admin)
```bash
curl -X GET "http://localhost:4000/admin/amendments/disputed" \
  -H "Authorization: Bearer {adminToken}"
```

#### Test 6: Resolve Amendment Dispute (Admin)
```bash
curl -X POST "http://localhost:4000/admin/amendments/{amendmentId}/resolve" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionType": "APPROVE",
    "notes": "After review, the proposed changes are reasonable and approved."
  }'
```

### Part 3: Email Notifications Testing

**Expected Emails (check Mailgun or email provider):**

1. **Amendment Proposed** - Sent to all parties
   - Subject: "Amendment Proposed for Deal: {dealNumber}"
   - Contains: Amendment type, description, reason
   - Call to action: "Review Amendment"

2. **Amendment Approved** - Sent when party approves
   - Subject: "Amendment Approved by {partyName}"
   - Contains: Who approved, their notes

3. **Amendment Disputed** - Sent when party disputes
   - Subject: "Amendment Disputed for Deal: {dealNumber}"
   - Contains: Who disputed, dispute reason
   - Notice: "Escalated to admin review"

4. **Amendment Applied** - Sent when all approve
   - Subject: "Amendment Applied to Deal: {dealNumber}"
   - Contains: What changed, new values

5. **Admin Resolution** - Sent after admin resolves dispute
   - Subject: "Admin Resolution for Deal {dealNumber} Amendment"
   - Contains: Admin decision, resolution notes

6. **Deletion Requested** - Sent when deletion requested
   - Subject: "Deletion Requested for Deal: {dealNumber}"
   - Contains: Who requested, reason

7. **Deletion Approved** - Sent when deal deleted
   - Subject: "Deletion Approved for Deal: {dealNumber}"
   - Contains: Final status

### Part 4: Database Verification (Optional)

**Check Database Records:**

```sql
-- View all amendments for a deal
SELECT * FROM "DealAmendment" WHERE "dealId" = 'your-deal-id';

-- View amendment responses
SELECT * FROM "PartyAmendmentResponse" WHERE "amendmentId" = 'amendment-id';

-- View deletion requests
SELECT * FROM "DealDeletionRequest" WHERE "dealId" = 'your-deal-id';

-- View audit logs
SELECT * FROM "AuditLog"
WHERE "dealId" = 'your-deal-id'
AND "eventType" LIKE '%AMENDMENT%'
ORDER BY "timestamp" DESC;
```

## 🎯 Success Criteria

### All Tests Pass ✅
- [ ] Can propose amendments with all types
- [ ] Can approve amendments
- [ ] Can dispute amendments
- [ ] Can see pending amendments list
- [ ] Can view amendment history timeline
- [ ] Admin can see disputed amendments
- [ ] Admin can resolve disputes (3 ways)
- [ ] Can request deal deletion
- [ ] Safety checks work for deletion
- [ ] Email notifications sent for all actions
- [ ] Toast notifications appear
- [ ] UI updates after actions (auto-refresh)
- [ ] Status badges show correct colors
- [ ] Timeline displays chronologically
- [ ] Party response tracking accurate
- [ ] API endpoints return correct data
- [ ] Audit logs created

## 🐛 Common Issues & Solutions

### Issue: "You are not a party to this deal"
**Solution:** Make sure you're signed in as a user who is a party to the deal.

### Issue: "No parties have agreed yet"
**Solution:** At least one party must accept the deal invitation before amendments can be proposed.

### Issue: Amendment not appearing
**Solution:** Refresh the page or check browser console for errors.

### Issue: Can't propose deletion
**Solution:** Check if deal has:
- Active custody records
- Funds in escrow
- Active milestones
These must be resolved first.

### Issue: Email not received
**Solution:**
- Check Mailgun dashboard
- Verify email queue is running
- Check spam folder
- Verify email addresses are correct

## 📝 Test Scenarios

### Scenario 1: Happy Path - Amendment Approved
1. User A creates amendment
2. User B approves
3. User C approves
4. Amendment auto-applies
5. All parties receive "Applied" email
6. Deal values updated
7. Audit log created

### Scenario 2: Dispute & Admin Resolution
1. User A creates amendment
2. User B disputes with reason
3. Status changes to "Disputed"
4. Admin receives notification
5. Admin navigates to /admin/amendments
6. Admin reviews and selects "Approve Override"
7. Admin enters notes and submits
8. Amendment applies despite dispute
9. All parties receive admin resolution email

### Scenario 3: Deal Deletion with Approval
1. User A requests deletion (deal has no blockers)
2. All parties receive notification
3. User B approves deletion
4. User C approves deletion
5. Deal auto-deletes
6. All parties receive "Deletion Approved" email
7. Deal removed from database

### Scenario 4: Deal Deletion Blocked
1. User A requests deletion
2. System detects:
   - 1 custody record (HELD status)
   - 2 active milestones
3. Modal shows blockers in red
4. Shows required actions:
   - Release custody document
   - Complete or cancel milestones
5. Deletion button disabled
6. User contacts admin for help

## 🎨 UI Verification Checklist

### Colors & Badges
- [ ] 🟢 Green = Approved, Success, Safe
- [ ] 🟡 Yellow = Pending, Warning
- [ ] 🔴 Red = Disputed, Rejected, Danger
- [ ] 🔵 Blue = Applied, Info
- [ ] ⚪ Gray = Neutral, Rejected

### Icons
- [ ] ✅ CheckCircle = Approved
- [ ] ❌ XCircle = Disputed/Rejected
- [ ] ⏰ Clock = Pending
- [ ] ⚠️ AlertTriangle = Warning/Disputed
- [ ] 📝 FileEdit = Amendment
- [ ] 🗑️ Trash2 = Delete

### Responsive Design
- [ ] Works on desktop
- [ ] Modals scroll properly
- [ ] Timeline displays correctly
- [ ] Buttons accessible
- [ ] Forms easy to fill

---

**Happy Testing! 🧪**

If you find any bugs or issues, they can be documented and fixed as needed.
