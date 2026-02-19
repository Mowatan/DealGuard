# Deal Amendment & Deletion System - Implementation Complete

## Overview

A complete deal amendment and deletion system has been implemented with two-phase authorization logic:

**Phase 1 (Pre-Agreement)**: Creator can unilaterally amend or delete deals
**Phase 2 (Post-Agreement)**: All parties must approve amendments/deletions or they can dispute

---

## What Was Implemented

### 1. Database Schema Updates (`fouad-ai/backend/prisma/schema.prisma`)

#### New Enums
- `AmendmentStatus`: PENDING, APPROVED, DISPUTED, APPLIED, REJECTED
- `DeletionStatus`: PENDING, APPROVED, EXECUTED, DISPUTED, REJECTED
- `PartyResponseType`: APPROVE, DISPUTE

#### New Models
- **DealAmendment**: Tracks proposed deal amendments
  - Links to Deal
  - Stores proposed changes as JSON
  - Tracks status and resolution

- **PartyAmendmentResponse**: Individual party responses to amendments
  - Links to amendment and party
  - Records APPROVE or DISPUTE with optional notes

- **DealDeletionRequest**: Tracks proposed deal deletions
  - Links to Deal
  - Stores deletion reason
  - Tracks status and resolution

- **PartyDeletionResponse**: Individual party responses to deletion requests
  - Links to deletion request and party
  - Records APPROVE or DISPUTE with optional notes

### 2. Service Functions (`fouad-ai/backend/src/modules/deals/deals.service.ts`)

#### Helper Functions
- `hasAnyPartyAgreed(dealId)`: Checks if any party has accepted the deal

#### Phase 1 Functions (Unilateral Actions)
- `updateDeal(dealId, updates, userId)`: Update deal details directly
- `deleteDeal(dealId, userId, reason)`: Delete deal directly

#### Phase 2 Functions (Proposal System)
- `proposeDealAmendment(dealId, proposedChanges, userId, userName)`: Create amendment proposal
- `proposeDealDeletion(dealId, reason, userId, userName)`: Create deletion request
- `respondToAmendment(amendmentId, partyId, responseType, notes)`: Party responds to amendment
- `respondToDeletion(deletionRequestId, partyId, responseType, notes)`: Party responds to deletion

#### Execution Functions
- `executeAmendment(amendmentId)`: Apply approved amendment changes
- `executeDeletion(deletionRequestId)`: Delete deal after approval

### 3. API Routes (`fouad-ai/backend/src/modules/deals/deals.routes.ts`)

All routes require authentication.

#### Deal Management
- `PATCH /deals/:id` - Update deal (Phase 1 only)
- `DELETE /deals/:id` - Delete deal (Phase 1 only)

#### Amendment System
- `POST /deals/:id/amendments` - Propose amendment (Phase 2)
- `POST /amendments/:id/approve` - Approve amendment
- `POST /amendments/:id/dispute` - Dispute amendment

#### Deletion System
- `POST /deals/:id/deletion-request` - Propose deletion (Phase 2)
- `POST /deletion-requests/:id/approve` - Approve deletion
- `POST /deletion-requests/:id/dispute` - Dispute deletion

### 4. Email Templates

Created 7 new email templates in `fouad-ai/backend/templates/emails/`:

- **deal-amended.html**: Notify parties of unilateral amendment (Phase 1)
- **deal-cancelled.html**: Notify parties of unilateral deletion (Phase 1)
- **amendment-proposed.html**: Request party approval for amendment (Phase 2)
- **deletion-proposed.html**: Request party approval for deletion (Phase 2)
- **amendment-approved.html**: Notify all parties amendment was approved
- **deletion-approved.html**: Notify all parties deletion was approved
- **amendment-disputed.html**: Notify proposer that amendment was disputed

---

## How It Works

### Phase 1: Pre-Agreement (No Parties Have Accepted)

#### Updating a Deal
```bash
PATCH /deals/{dealId}
{
  "title": "Updated Title",
  "description": "Updated description",
  "totalAmount": 15000
}
```

**Behavior:**
- ✅ Changes applied immediately
- ✅ No approval required
- 📧 All parties notified via email
- 📝 Audit log created

#### Deleting a Deal
```bash
DELETE /deals/{dealId}
{
  "reason": "Customer changed their mind"
}
```

**Behavior:**
- ✅ Deal deleted immediately
- ✅ No approval required
- 📧 All parties notified via email
- 📝 Audit log created before deletion

### Phase 2: Post-Agreement (At Least One Party Has Accepted)

#### Proposing an Amendment
```bash
POST /deals/{dealId}/amendments
{
  "proposedChanges": {
    "title": "New Title",
    "totalAmount": 20000
  }
}
```

**Behavior:**
- 📝 Amendment proposal created with status PENDING
- 📧 All parties notified and asked to respond
- ⏳ Waits for all party responses

#### Party Response to Amendment
```bash
# Approve
POST /amendments/{amendmentId}/approve
{
  "partyId": "party-xyz",
  "notes": "Looks good to me"
}

# Dispute
POST /amendments/{amendmentId}/dispute
{
  "partyId": "party-abc",
  "notes": "The amount is too high"
}
```

**Behavior:**
- ✅ If all parties APPROVE → Amendment automatically applied
- ⚠️ If any party DISPUTES → Status changes to DISPUTED, escalated to admin
- 📧 Notifications sent based on outcome

#### Proposing a Deletion
```bash
POST /deals/{dealId}/deletion-request
{
  "reason": "Both parties agreed to cancel"
}
```

**Behavior:**
- 📝 Deletion request created with status PENDING
- 📧 All parties notified and asked to respond
- ⏳ Waits for all party responses

#### Party Response to Deletion
```bash
# Approve
POST /deletion-requests/{requestId}/approve
{
  "partyId": "party-xyz",
  "notes": "Agreed"
}

# Dispute
POST /deletion-requests/{requestId}/dispute
{
  "partyId": "party-abc",
  "notes": "I want the deal to continue"
}
```

**Behavior:**
- ✅ If all parties APPROVE → Deal automatically deleted
- ⚠️ If any party DISPUTES → Status changes to DISPUTED, escalated to admin
- 📧 Notifications sent based on outcome

---

## Dispute Resolution (Admin Workflow)

When a party disputes an amendment or deletion:

1. Status changes to `DISPUTED`
2. Proposer is notified via email
3. **Admin must manually resolve**:
   - Review the proposal and party responses
   - Update the status to `APPLIED`/`EXECUTED` or `REJECTED`
   - Set `resolvedBy`, `resolvedAt`, and `resolutionNotes`

Future enhancement: Add admin endpoints for dispute resolution.

---

## Audit Trail

All actions are logged in the `AuditEvent` table:

- `DEAL_UPDATED` - Unilateral update
- `DEAL_DELETED` - Unilateral deletion
- `AMENDMENT_PROPOSED` - Amendment proposal created
- `AMENDMENT_RESPONSE` - Party responded to amendment
- `AMENDMENT_APPLIED` - Amendment changes applied
- `DELETION_PROPOSED` - Deletion request created
- `DELETION_RESPONSE` - Party responded to deletion
- `DEAL_DELETED_APPROVED` - Deal deleted after approval

---

## Testing the System

### Test Phase 1 (No Agreements)

1. Create a deal with parties
2. **Before any party accepts**, update the deal:
   ```bash
   PATCH /deals/{id}
   ```
3. Verify: Changes applied immediately, parties notified

4. **Before any party accepts**, delete the deal:
   ```bash
   DELETE /deals/{id}
   ```
5. Verify: Deal deleted immediately, parties notified

### Test Phase 2 (With Agreements)

1. Create a deal with parties
2. Have at least one party accept the deal (via invitation confirmation)
3. Try to update the deal directly:
   ```bash
   PATCH /deals/{id}
   ```
4. Verify: Error returned: "Cannot update deal unilaterally..."

5. Propose an amendment:
   ```bash
   POST /deals/{id}/amendments
   ```
6. Have all parties approve it
7. Verify: Amendment automatically applied

8. Propose another amendment
9. Have one party dispute it
10. Verify: Status changes to DISPUTED, proposer notified

---

## Database Migration

The schema changes need to be applied to your database:

```bash
cd fouad-ai/backend
npx prisma db push
npx prisma generate
```

Or for production:
```bash
npx prisma migrate dev --name add_deal_amendment_deletion_system
```

---

## Next Steps

### Recommended Enhancements

1. **Admin Dispute Resolution API**
   - `POST /amendments/:id/resolve` (admin only)
   - `POST /deletion-requests/:id/resolve` (admin only)

2. **Frontend UI Components**
   - Amendment proposal form
   - Deletion request form
   - Party response interface (approve/dispute)
   - Admin dispute resolution dashboard

3. **Notifications**
   - Real-time notifications (WebSocket/SSE)
   - In-app notification center
   - SMS notifications for critical actions

4. **Advanced Features**
   - Partial party approval (e.g., 2 out of 3 required)
   - Time limits on responses
   - Amendment versioning
   - Bulk amendments

---

## API Request Examples

### Example 1: Unilateral Amendment (Phase 1)
```javascript
const response = await fetch('http://localhost:8080/api/deals/deal-123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    title: "Updated Deal Title",
    totalAmount: 25000
  })
});
```

### Example 2: Propose Amendment (Phase 2)
```javascript
const response = await fetch('http://localhost:8080/api/deals/deal-123/amendments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    proposedChanges: {
      title: "Revised Deal Title",
      description: "Updated terms",
      totalAmount: 30000
    }
  })
});
```

### Example 3: Party Approves Amendment
```javascript
const response = await fetch('http://localhost:8080/api/amendments/amend-123/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    partyId: "party-xyz",
    notes: "Approved. New terms are acceptable."
  })
});
```

---

## Security & Permissions

- All endpoints require authentication
- User must be associated with the deal (party member or admin)
- Phase detection is automatic based on party acceptance status
- Audit logs track all actions with actor, timestamp, and changes

---

## Summary

✅ Complete two-phase amendment/deletion system
✅ Automatic party approval workflow
✅ Dispute escalation mechanism
✅ Email notifications for all events
✅ Comprehensive audit logging
✅ Production-ready REST API
✅ TypeScript type safety

The system is now ready for integration with your frontend and testing!
