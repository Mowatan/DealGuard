# Amendment & Deletion System Test Scripts

## Overview

Three test scripts have been created to verify the deal amendment and deletion system:

1. **Comprehensive TypeScript Test** - Automated end-to-end tests
2. **Simple Bash Runner** - Quick test execution
3. **Manual curl Test** - Interactive testing guide

---

## ✅ Prerequisites

- Backend server running on `http://localhost:4000`
- PostgreSQL database with migrations applied
- Valid authentication credentials

---

## 🚀 Quick Start

### Method 1: Automated TypeScript Tests (Recommended)

```bash
cd fouad-ai/backend

# Set environment variables
export TEST_USER_EMAIL="admin@dealguard.com"
export TEST_USER_PASSWORD="your-password"

# Run the comprehensive test suite
./scripts/run-amendment-tests.sh
```

**What it tests:**
- ✅ Phase 1: Unilateral update (no agreements)
- ✅ Phase 1: Unilateral delete (no agreements)
- ✅ Phase 2: Amendment proposal (with agreements)
- ✅ Phase 2: Party approval workflow
- ✅ Phase 2: Dispute escalation
- ✅ Phase 2: Deletion proposal
- ✅ Phase 2: Deletion approval

### Method 2: Manual Interactive Tests

```bash
cd fouad-ai/backend
./scripts/test-amendment-deletion-simple.sh
```

Follow the interactive prompts to test each scenario manually.

### Method 3: Direct TypeScript Execution

```bash
cd fouad-ai/backend
npx tsx scripts/test-amendment-deletion.ts
```

---

## 📋 Test Scenarios Covered

### Scenario 1: Phase 1 - Unilateral Update
**Setup:** Deal created, no parties have accepted yet

**Steps:**
1. Create a deal
2. Update deal title, description, totalAmount
3. Verify changes applied immediately
4. Verify parties notified via email

**Expected Result:** ✅ Changes applied without approval

---

### Scenario 2: Phase 1 - Unilateral Delete
**Setup:** Deal created, no parties have accepted yet

**Steps:**
1. Create a deal
2. Delete the deal with a reason
3. Verify deal is deleted
4. Verify parties notified via email

**Expected Result:** ✅ Deal deleted without approval

---

### Scenario 3: Phase 2 - Amendment Proposal
**Setup:** Deal created, at least one party has accepted

**Steps:**
1. Create a deal
2. Have one party accept the invitation
3. Try to update deal directly (should fail)
4. Propose an amendment instead
5. Verify amendment status is PENDING
6. Verify all parties notified

**Expected Result:**
- ❌ Direct update blocked
- ✅ Amendment proposal created
- ✅ Parties notified

---

### Scenario 4: Phase 2 - All Parties Approve Amendment
**Setup:** Amendment proposed in Phase 2

**Steps:**
1. Party 1 approves amendment
2. Party 2 approves amendment
3. Verify amendment status changes to APPLIED
4. Verify deal is updated with new values
5. Verify all parties notified of approval

**Expected Result:**
- ✅ Amendment automatically applied
- ✅ Deal updated
- ✅ Parties notified

---

### Scenario 5: Phase 2 - Party Disputes Amendment
**Setup:** Amendment proposed in Phase 2

**Steps:**
1. Party 1 disputes amendment with notes
2. Verify amendment status changes to DISPUTED
3. Verify proposer notified
4. Verify changes NOT applied

**Expected Result:**
- ✅ Amendment marked as DISPUTED
- ✅ Escalated to admin
- ❌ Changes NOT applied

---

### Scenario 6: Phase 2 - Deletion Request Approved
**Setup:** Deal in Phase 2

**Steps:**
1. Propose deletion request
2. All parties approve deletion
3. Verify deal is deleted
4. Verify parties notified

**Expected Result:**
- ✅ Deal automatically deleted after all approvals
- ✅ Parties notified

---

## 🔍 Manual Testing with curl

If you prefer to test manually with curl:

### Get Authentication Token

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dealguard.com","password":"password"}' \
  | jq -r '.token')

echo $TOKEN
```

### Create a Test Deal

```bash
DEAL=$(curl -s -X POST http://localhost:4000/api/deals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Deal",
    "transactionType": "SIMPLE",
    "totalAmount": 10000,
    "currency": "EGP",
    "parties": [
      {
        "role": "BUYER",
        "name": "Buyer",
        "isOrganization": false,
        "contactEmail": "buyer@test.com"
      },
      {
        "role": "SELLER",
        "name": "Seller",
        "isOrganization": false,
        "contactEmail": "seller@test.com"
      }
    ],
    "creatorName": "Creator",
    "creatorEmail": "admin@dealguard.com"
  }')

DEAL_ID=$(echo $DEAL | jq -r '.id')
echo "Deal ID: $DEAL_ID"
```

### Test Phase 1: Update Deal

```bash
# Should succeed - no agreements yet
curl -X PATCH http://localhost:4000/api/deals/$DEAL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "totalAmount": 15000
  }' | jq
```

### Simulate Party Acceptance (Enter Phase 2)

```bash
# Get invitation token for first party
INVITATION_TOKEN=$(echo $DEAL | jq -r '.parties[0].invitationToken')

# Accept invitation
curl -X POST http://localhost:4000/api/deals/invitations/$INVITATION_TOKEN/confirm | jq
```

### Test Phase 2: Propose Amendment

```bash
# Should succeed - creates proposal
AMENDMENT=$(curl -s -X POST http://localhost:4000/api/deals/$DEAL_ID/amendments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proposedChanges": {
      "title": "Amended Title",
      "totalAmount": 20000
    }
  }')

AMENDMENT_ID=$(echo $AMENDMENT | jq -r '.id')
echo "Amendment ID: $AMENDMENT_ID"
```

### Test Phase 2: Approve Amendment

```bash
# Get party IDs
PARTY1_ID=$(echo $DEAL | jq -r '.parties[0].id')
PARTY2_ID=$(echo $DEAL | jq -r '.parties[1].id')

# Party 1 approves
curl -X POST http://localhost:4000/api/amendments/$AMENDMENT_ID/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"partyId\": \"$PARTY1_ID\",
    \"notes\": \"Approved\"
  }" | jq

# Party 2 approves (should auto-apply)
curl -X POST http://localhost:4000/api/amendments/$AMENDMENT_ID/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"partyId\": \"$PARTY2_ID\",
    \"notes\": \"Agreed\"
  }" | jq
```

### Test Phase 2: Dispute Amendment

```bash
# Create new amendment
AMENDMENT2=$(curl -s -X POST http://localhost:4000/api/deals/$DEAL_ID/amendments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proposedChanges": {
      "totalAmount": 100000
    }
  }')

AMENDMENT2_ID=$(echo $AMENDMENT2 | jq -r '.id')

# Party 1 disputes
curl -X POST http://localhost:4000/api/amendments/$AMENDMENT2_ID/dispute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"partyId\": \"$PARTY1_ID\",
    \"notes\": \"Amount too high\"
  }" | jq
```

---

## 📊 Checking Results

### Database Queries

```sql
-- Check amendments
SELECT id, "dealId", status, "proposedBy", "proposedChanges"
FROM "DealAmendment"
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check amendment responses
SELECT a.id, dar."partyId", dar."responseType", dar.notes
FROM "DealAmendment" a
JOIN "PartyAmendmentResponse" dar ON dar."amendmentId" = a.id
ORDER BY dar."respondedAt" DESC;

-- Check deletion requests
SELECT id, "dealId", status, reason
FROM "DealDeletionRequest"
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check audit trail
SELECT "eventType", actor, "entityType", "createdAt"
FROM "AuditEvent"
WHERE "dealId" = 'YOUR_DEAL_ID'
ORDER BY "createdAt" DESC;
```

### Check Email Queue

```sql
-- Check queued emails
SELECT * FROM bull_email_queue
ORDER BY timestamp DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### "Cannot update deal unilaterally" Error
**Cause:** At least one party has accepted the deal
**Solution:** Use the amendment proposal system instead of direct update

### "Amendment not found" Error
**Cause:** Invalid amendment ID
**Solution:** Verify the amendment ID from the database or creation response

### "Party has already responded" Error
**Cause:** Party trying to respond twice to same amendment
**Solution:** Each party can only respond once per amendment

### Authentication Errors
**Cause:** Invalid or expired token
**Solution:** Get a fresh authentication token

### Server Not Running
**Cause:** Backend server not started
**Solution:**
```bash
cd fouad-ai/backend
npm run dev
```

---

## 📧 Verifying Email Notifications

Check your email queue or Mailgun dashboard for:

1. **deal-amended** - Sent when deal updated in Phase 1
2. **deal-cancelled** - Sent when deal deleted in Phase 1
3. **amendment-proposed** - Sent to all parties when amendment proposed
4. **amendment-approved** - Sent when amendment approved by all
5. **amendment-disputed** - Sent when amendment disputed
6. **deletion-proposed** - Sent when deletion requested
7. **deletion-approved** - Sent when deletion approved by all

---

## ✅ Success Criteria

All tests pass when:

- ✅ Phase 1 updates work without approval
- ✅ Phase 1 deletions work without approval
- ✅ Phase 2 blocks direct updates/deletions
- ✅ Amendment proposals are created correctly
- ✅ All parties can approve amendments
- ✅ Any party can dispute amendments
- ✅ Approved amendments auto-apply
- ✅ Disputed amendments escalate to admin
- ✅ Deletion requests work same as amendments
- ✅ Email notifications sent for all events
- ✅ Audit logs created for all actions

---

## 🎯 Next Steps After Testing

1. **Build Frontend UI**
   - Amendment proposal form
   - Party response interface
   - Admin dispute resolution

2. **Add Admin Endpoints**
   - Resolve disputed amendments
   - Override approvals if needed

3. **Enhanced Notifications**
   - Real-time WebSocket updates
   - In-app notification center

4. **Advanced Features**
   - Partial approval thresholds
   - Time limits on responses
   - Amendment history/versioning
