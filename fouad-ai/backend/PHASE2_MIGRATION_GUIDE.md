# Phase 2 Migration Guide

## Overview
This guide helps migrate existing fouad.ai deployments from Phase 1 to Phase 2 with minimal downtime.

## Pre-Migration Checklist

### 1. Backup Current Database
```bash
# PostgreSQL backup
pg_dump fouad_ai > backup_pre_phase2_$(date +%Y%m%d).sql

# Verify backup
pg_restore --list backup_pre_phase2_*.sql | head
```

### 2. Backup MinIO Data
```bash
# List current buckets
docker exec minio-container mc ls local/

# Export bucket data
docker exec minio-container mc mirror local/fouad-documents ./backup/documents
docker exec minio-container mc mirror local/fouad-evidence ./backup/evidence
```

### 3. Note Current State
```sql
-- Count existing milestones
SELECT COUNT(*) FROM "Milestone";

-- Count parties needing KYC
SELECT COUNT(*) FROM "Party" WHERE "kycStatus" = 'NONE';

-- Count active deals
SELECT COUNT(*) FROM "Deal" WHERE status IN ('FUNDED', 'IN_PROGRESS');
```

## Migration Steps

### Step 1: Stop Application Server (Optional)
```bash
# Graceful shutdown
docker-compose down backend

# Or if running directly
pkill -SIGTERM node
```

### Step 2: Apply Database Schema Changes
```bash
cd backend

# Generate Prisma client with new schema
npx prisma generate

# Apply schema changes to database
npx prisma db push --accept-data-loss
```

**Note:** The `--accept-data-loss` flag is required because we're renaming fields:
- `Milestone.title` → `Milestone.name`
- `Milestone.sequence` → `Milestone.order`

### Step 3: Create Default Approval Requirements

Create a migration script: `scripts/create-default-approvals.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating default approval requirements for existing milestones...');

  // Get all milestones without approval requirements
  const milestones = await prisma.milestone.findMany({
    where: {
      approvalRequirement: null,
    },
  });

  console.log(`Found ${milestones.length} milestones without approval requirements`);

  // Create default requirement for each (admin approval required)
  for (const milestone of milestones) {
    await prisma.milestoneApprovalRequirement.create({
      data: {
        milestoneId: milestone.id,
        requireAdminApproval: true,
        requireBuyerApproval: false,
        requireSellerApproval: false,
      },
    });
    console.log(`Created approval requirement for milestone ${milestone.id}`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run the script:
```bash
npx ts-node scripts/create-default-approvals.ts
```

### Step 4: Restart Application Server
```bash
# Using Docker Compose
docker-compose up -d backend

# Or direct run
npm run dev
```

### Step 5: Verify Migration

#### Check Database Schema
```sql
-- Verify new tables exist
\d "MilestoneApprovalRequirement"
\d "MilestoneApproval"

-- Verify new fields exist
\d "EvidenceItem"  -- Should have quarantineReason
\d "Dispute"       -- Should have milestoneFrozen

-- Verify enum updated
SELECT enum_range(NULL::public."EvidenceStatus");
-- Should include QUARANTINED
```

#### Check API Endpoints
```bash
# Test milestone endpoints
curl http://localhost:4000/api/milestones/test_id

# Test KYC endpoints
curl http://localhost:4000/api/kyc/pending

# Test dispute endpoints
curl http://localhost:4000/api/disputes/open
```

#### Check Application Logs
```bash
docker-compose logs -f backend | grep -i error
```

## Data Migration Scenarios

### Scenario 1: Existing Milestones with Evidence
**Problem:** Existing milestones in IN_PROGRESS might have evidence but no approval tracking.

**Solution:**
```typescript
// Evaluate readiness for all IN_PROGRESS milestones
const milestones = await prisma.milestone.findMany({
  where: { status: 'IN_PROGRESS' },
});

for (const milestone of milestones) {
  await evaluateMilestoneReadiness(milestone.id);
}
```

### Scenario 2: Parties with KYC Documents
**Problem:** Parties might have `kycDocumentUrls` but status is still NONE.

**Solution:**
```typescript
// Update parties with documents to PENDING
const parties = await prisma.party.updateMany({
  where: {
    kycStatus: 'NONE',
    kycDocumentUrls: {
      isEmpty: false,
    },
  },
  data: {
    kycStatus: 'PENDING',
  },
});

console.log(`Updated ${parties.count} parties to PENDING status`);
```

### Scenario 3: Active Disputes
**Problem:** Existing disputes don't have `milestoneFrozen` field set.

**Solution:**
```typescript
// Set milestoneFrozen for disputes with milestoneId
const disputes = await prisma.dispute.findMany({
  where: {
    milestoneId: { not: null },
    status: { in: ['OPENED', 'EVIDENCE_COLLECTION', 'ADMIN_REVIEW'] },
  },
});

for (const dispute of disputes) {
  await prisma.dispute.update({
    where: { id: dispute.id },
    data: { milestoneFrozen: true },
  });

  // Also update milestone status to DISPUTED
  if (dispute.milestoneId) {
    await prisma.milestone.update({
      where: { id: dispute.milestoneId },
      data: { status: 'DISPUTED' },
    });
  }
}
```

## Post-Migration Tasks

### 1. Update User Documentation
- Notify users about new approval workflow
- Provide KYC document upload instructions
- Explain dispute resolution process

### 2. Configure Monitoring
```typescript
// Add alerts for:
- Milestones stuck in READY_FOR_REVIEW (missing approvals)
- KYC submissions exceeding review SLA
- Disputes open > 48 hours
- Quarantined evidence > 24 hours
```

### 3. Train Admin Users
- How to verify KYC documents
- How to resolve disputes
- How to review quarantined evidence
- How to configure milestone approval requirements

### 4. Enable Feature Flags (If Using)
```env
# .env
ENABLE_MILESTONE_APPROVALS=true
ENABLE_KYC_VERIFICATION=true
ENABLE_DISPUTE_MANAGEMENT=true
ENABLE_EMAIL_QUARANTINE=true
```

## Rollback Procedure

### If Migration Fails

#### Option 1: Restore from Backup (Recommended)
```bash
# Stop application
docker-compose down

# Drop current database
dropdb fouad_ai

# Create fresh database
createdb fouad_ai

# Restore backup
pg_restore -d fouad_ai backup_pre_phase2_*.sql

# Restore MinIO data
docker exec minio-container mc mirror ./backup/documents local/fouad-documents
docker exec minio-container mc mirror ./backup/evidence local/fouad-evidence

# Checkout Phase 1 code
git checkout phase1

# Restart application
docker-compose up -d
```

#### Option 2: Manual Schema Rollback
```sql
-- Drop new tables
DROP TABLE "MilestoneApproval";
DROP TABLE "MilestoneApprovalRequirement";

-- Remove new fields
ALTER TABLE "EvidenceItem" DROP COLUMN "quarantineReason";
ALTER TABLE "Dispute" DROP COLUMN "milestoneFrozen";

-- Revert enum (complex - prefer full restore)
-- See PostgreSQL enum alteration docs
```

## Performance Considerations

### Indexes to Add (Optional)
```sql
-- Speed up approval queries
CREATE INDEX idx_milestone_approval_milestone ON "MilestoneApproval"("milestoneId");
CREATE INDEX idx_milestone_approval_user ON "MilestoneApproval"("userId");

-- Speed up KYC queries
CREATE INDEX idx_party_kyc_status ON "Party"("kycStatus");

-- Speed up dispute queries
CREATE INDEX idx_dispute_milestone ON "Dispute"("milestoneId") WHERE "milestoneId" IS NOT NULL;

-- Speed up evidence quarantine queries
CREATE INDEX idx_evidence_quarantined ON "EvidenceItem"("status") WHERE "status" = 'QUARANTINED';
```

### Query Optimization
```typescript
// Use select to limit fields returned
await prisma.milestone.findMany({
  select: {
    id: true,
    name: true,
    status: true,
    // Only include fields you need
  },
});

// Use pagination for large result sets
await prisma.party.findMany({
  where: { kycStatus: 'PENDING' },
  take: 50,
  skip: 0,
});
```

## Troubleshooting

### Issue: Migration Fails with Foreign Key Error
**Cause:** Orphaned records referencing deleted data.

**Fix:**
```sql
-- Find orphaned milestones
SELECT m.id FROM "Milestone" m
LEFT JOIN "Contract" c ON m."contractId" = c.id
WHERE c.id IS NULL;

-- Delete orphaned milestones
DELETE FROM "Milestone" WHERE "contractId" NOT IN (
  SELECT id FROM "Contract"
);
```

### Issue: Prisma Generate Fails
**Cause:** Invalid schema syntax or missing dependency.

**Fix:**
```bash
# Clear Prisma cache
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# Reinstall Prisma
npm install @prisma/client prisma --save-exact

# Regenerate
npx prisma generate
```

### Issue: Application Won't Start After Migration
**Cause:** Missing environment variables or incompatible code.

**Fix:**
```bash
# Check environment variables
env | grep -i prisma
env | grep -i minio
env | grep -i clerk

# Verify all required vars are set
# Check application logs
docker-compose logs backend | tail -50
```

## Success Criteria

✅ All existing milestones have approval requirements
✅ All new API endpoints respond correctly
✅ No TypeScript compilation errors
✅ All existing deals, parties, and contracts preserved
✅ Application starts without errors
✅ Database queries complete in < 100ms (with indexes)
✅ Users can submit approvals successfully
✅ Admins can verify KYC documents
✅ Email quarantine system functional

## Support Contacts

For migration assistance:
- Technical Lead: [Contact Info]
- Database Admin: [Contact Info]
- DevOps: [Contact Info]

## Timeline Estimate

| Task | Duration | Downtime? |
|------|----------|-----------|
| Backup database | 5-10 min | No |
| Backup MinIO | 5-10 min | No |
| Apply schema changes | 2-5 min | **Yes** |
| Run migration scripts | 5-15 min | **Yes** |
| Restart application | 1-2 min | **Yes** |
| Verification testing | 10-15 min | No |
| **Total** | **30-60 min** | **~15 min** |

## Post-Migration Monitoring

Monitor these metrics for 24-48 hours:
- API response times (should be < 200ms)
- Database query performance (should be < 100ms)
- Error rates (should be < 0.1%)
- Memory usage (should be stable)
- Disk I/O (should not spike abnormally)

## Appendix: SQL Migration Script

For reference, the core schema changes can be applied manually:

```sql
-- Add new enum value
ALTER TYPE "EvidenceStatus" ADD VALUE 'QUARANTINED';

-- Add new fields
ALTER TABLE "EvidenceItem" ADD COLUMN "quarantineReason" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "milestoneFrozen" BOOLEAN NOT NULL DEFAULT false;

-- Create new tables
CREATE TABLE "MilestoneApprovalRequirement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "milestoneId" TEXT NOT NULL UNIQUE,
  "requireAdminApproval" BOOLEAN NOT NULL DEFAULT true,
  "requireBuyerApproval" BOOLEAN NOT NULL DEFAULT false,
  "requireSellerApproval" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "MilestoneApproval" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "milestoneId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "partyId" TEXT,
  "approvalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MilestoneApproval_milestoneId_userId_unique" UNIQUE ("milestoneId", "userId")
);

-- Add foreign keys
ALTER TABLE "MilestoneApprovalRequirement"
  ADD CONSTRAINT "MilestoneApprovalRequirement_milestoneId_fkey"
  FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE;

ALTER TABLE "MilestoneApproval"
  ADD CONSTRAINT "MilestoneApproval_milestoneId_fkey"
  FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE;

ALTER TABLE "MilestoneApproval"
  ADD CONSTRAINT "MilestoneApproval_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id");

ALTER TABLE "MilestoneApproval"
  ADD CONSTRAINT "MilestoneApproval_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "Party"("id");

-- Create indexes
CREATE INDEX "MilestoneApproval_milestoneId_idx" ON "MilestoneApproval"("milestoneId");
```
