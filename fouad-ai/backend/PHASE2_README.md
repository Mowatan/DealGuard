# Phase 2: Milestone Approvals, KYC, Disputes & Email Security

## Quick Start

### 1. Database Setup
```bash
# Apply schema changes
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 2. Start Server
```bash
npm run dev
```

### 3. Verify Installation
```bash
# Health check
curl http://localhost:4000/health
```

## New Features

### ✅ Milestone Approval System
- Configurable approval requirements per milestone
- Admin approval ALWAYS required by default
- Optional buyer/seller approvals
- Auto-approval when all requirements met
- Evidence-driven milestone transitions (PENDING → IN_PROGRESS → READY_FOR_REVIEW → APPROVED)

### ✅ KYC Verification
- Upload KYC documents (passport, national ID, business registry)
- Submit for verification (NONE → PENDING)
- Admin verify/reject (PENDING → VERIFIED/REJECTED)
- Document storage in MinIO with presigned URLs
- Audit trail for all KYC state changes

### ✅ Dispute Management
- Create disputes with optional milestone reference
- Automatic milestone freeze (status → DISPUTED)
- Admin mediation notes
- Resolve disputes with automatic milestone restore (DISPUTED → IN_PROGRESS)
- Full audit trail

### ✅ Email Evidence Security
- Sender verification (match party contact emails)
- Quarantine for unregistered senders
- Case officer review and release from quarantine
- Audit logs for security events

## API Endpoints

### Milestone Approvals
```
GET    /api/milestones/:id                    - Get details
GET    /api/milestones/contract/:contractId   - List by contract
POST   /api/milestones/:id/approvals          - Submit approval
GET    /api/milestones/:id/approvals          - List approvals
POST   /api/milestones/:id/requirements       - Set requirements (admin)
POST   /api/milestones/:id/evaluate-readiness - Evaluate readiness
```

### KYC Verification
```
POST   /api/kyc/parties/:partyId/documents    - Upload document
POST   /api/kyc/parties/:partyId/submit       - Submit for verification
GET    /api/kyc/parties/:partyId              - Get status
GET    /api/kyc/parties/:partyId/documents    - Get document URLs
POST   /api/kyc/parties/:partyId/verify       - Verify (admin)
POST   /api/kyc/parties/:partyId/reject       - Reject (admin)
GET    /api/kyc/pending                       - List pending (case officer+)
```

### Dispute Management
```
POST   /api/disputes                          - Create dispute
GET    /api/disputes/:id                      - Get details
GET    /api/disputes/deal/:dealId             - List by deal
POST   /api/disputes/:id/mediation            - Add note (admin)
POST   /api/disputes/:id/resolve              - Resolve (admin)
GET    /api/disputes/open                     - List open
```

### Evidence Quarantine
```
GET    /api/evidence/quarantined              - List quarantined
POST   /api/evidence/:id/release              - Release from quarantine
```

## Testing Workflows

### Test Milestone Approval Flow
```bash
# 1. Get milestone details
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/milestones/milestone_123

# 2. Set approval requirements (admin only)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requireAdminApproval":true,"requireBuyerApproval":true}' \
  http://localhost:4000/api/milestones/milestone_123/requirements

# 3. Submit approval
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"partyId":"party_456","notes":"Approved"}' \
  http://localhost:4000/api/milestones/milestone_123/approvals

# 4. Check if auto-approved
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/milestones/milestone_123
```

### Test KYC Verification Flow
```bash
# 1. Upload KYC document
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@passport.pdf" \
  http://localhost:4000/api/kyc/parties/party_123/documents

# 2. Submit for verification
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/kyc/parties/party_123/submit

# 3. Admin verify
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"ID verified"}' \
  http://localhost:4000/api/kyc/parties/party_123/verify

# 4. Check status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/kyc/parties/party_123
```

### Test Dispute Flow
```bash
# 1. Create dispute
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dealId":"deal_123",
    "milestoneId":"milestone_456",
    "issueType":"Payment delay",
    "narrative":"Buyer has not submitted payment proof as agreed"
  }' \
  http://localhost:4000/api/disputes

# 2. Add mediation note (admin)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note":"Contacted buyer, payment proof expected by EOD"}' \
  http://localhost:4000/api/disputes/dispute_789/mediation

# 3. Resolve dispute (admin)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolutionNotes":"Buyer submitted payment proof, dispute resolved"}' \
  http://localhost:4000/api/disputes/dispute_789/resolve

# 4. Verify milestone restored
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/milestones/milestone_456
```

### Test Email Quarantine
```bash
# 1. Simulate inbound email from unregistered sender
# (Would normally come from email webhook)

# 2. List quarantined evidence (case officer)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/evidence/quarantined

# 3. Release from quarantine
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"releaseNotes":"Verified sender identity manually"}' \
  http://localhost:4000/api/evidence/evidence_999/release
```

## Architecture Changes

### New Service Modules
```
backend/src/modules/
├── milestones/
│   ├── milestones.service.ts   # Approval logic & evidence evaluation
│   └── milestones.routes.ts    # REST API endpoints
├── kyc/
│   ├── kyc.service.ts          # KYC workflow & document management
│   └── kyc.routes.ts           # REST API endpoints
└── disputes/
    ├── disputes.service.ts     # Dispute creation & resolution
    └── disputes.routes.ts      # REST API endpoints
```

### Updated Modules
```
backend/src/modules/evidence/
├── evidence.service.ts         # + Email sender verification & quarantine
└── evidence.routes.ts          # + Quarantine endpoints
```

### Database Schema
```
New Tables:
- MilestoneApprovalRequirement  # Approval configuration per milestone
- MilestoneApproval             # Approval records from users

New Fields:
- EvidenceItem.quarantineReason # Why evidence was quarantined
- Dispute.milestoneFrozen       # Track if milestone was frozen

New Enum Values:
- EvidenceStatus.QUARANTINED    # For suspicious evidence
```

## Access Control

| Role | Milestone Approvals | KYC Admin | Dispute Admin | Quarantine |
|------|-------------------|-----------|---------------|------------|
| Party User | Submit | - | Create | - |
| Case Officer | Submit | View pending | View | Manage |
| Admin | Submit + Config | Verify/Reject | Resolve | Manage |
| Super Admin | All | All | All | All |

## Key Design Decisions

1. **Admin Approval Always Required**
   - Default: `requireAdminApproval = true`
   - Cannot be disabled (system requirement)
   - Buyer/seller approvals are optional add-ons

2. **Auto-Approval on Completeness**
   - System automatically approves when all requirements met
   - No manual "approve" button needed
   - Triggered by approval submission

3. **Automatic Milestone Restore**
   - When dispute is resolved, milestone returns to IN_PROGRESS
   - No manual "unfreeze" step needed
   - Prevents stuck milestones

4. **Email Security: Verify Only (No Virus Scan)**
   - MVP focuses on sender verification
   - Virus scanning deferred to Phase 3
   - Quarantine allows manual review

5. **Case Officer Access to Quarantine**
   - Case officers can view and release quarantined evidence
   - Admins also have full access
   - Party users cannot see quarantine

## Troubleshooting

### Milestone Not Auto-Approving
```bash
# Check approval requirements
GET /api/milestones/:id

# Check who has approved
GET /api/milestones/:id/approvals

# Verify admin approval present
# Verify buyer/seller approvals if required
```

### KYC Documents Not Accessible
```bash
# Check if MinIO is running
docker ps | grep minio

# Check if documents stored
GET /api/kyc/parties/:partyId

# Generate fresh presigned URLs
GET /api/kyc/parties/:partyId/documents
```

### Dispute Not Freezing Milestone
```bash
# Check if milestoneId was provided
GET /api/disputes/:id

# Check milestoneFrozen field
# Check milestone status (should be DISPUTED)
GET /api/milestones/:milestoneId
```

### Email Evidence Quarantined
```bash
# Check party contact emails
GET /api/deals/:dealId

# Verify sender email matches party.contactEmail
# List quarantined evidence
GET /api/evidence/quarantined
```

## Next Steps

### Recommended Enhancements
1. Add notification system (email/SMS) for approvals and disputes
2. Implement batch operations for admin workflows
3. Add analytics dashboard for KYC completion rates
4. Integrate virus scanning for attachments
5. Add WebSocket support for real-time updates

### Production Checklist
- [ ] Add rate limiting on dispute creation
- [ ] Implement caching for approval requirements
- [ ] Add indexes on frequently queried fields
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy for KYC documents
- [ ] Test disaster recovery procedures

## Support

For issues or questions:
1. Check the audit logs for detailed event history
2. Review the implementation summary: `PHASE2_IMPLEMENTATION_SUMMARY.md`
3. Check TypeScript compilation: `npx tsc --noEmit`
4. Verify Prisma schema: `npx prisma validate`

## License

Proprietary - fouad.ai
