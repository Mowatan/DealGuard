# Database Migration Deployment Checklist

**Migration:** `20260216190000_add_all_missing_tables`
**Date:** February 16, 2026

## Pre-Deployment Checklist

- [ ] Backup current database
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] Verify DATABASE_URL is set
  ```bash
  echo $DATABASE_URL
  ```

- [ ] Check Prisma CLI version
  ```bash
  npx prisma --version  # Should be 5.22.0 or higher
  ```

- [ ] Review migration file
  ```bash
  cat fouad-ai/backend/prisma/migrations/20260216190000_add_all_missing_tables/migration.sql
  ```

## Deployment Steps

- [ ] Navigate to backend directory
  ```bash
  cd fouad-ai/backend
  ```

- [ ] Apply migration
  ```bash
  npx prisma migrate deploy
  ```

- [ ] Regenerate Prisma Client
  ```bash
  npx prisma generate
  ```

- [ ] Rebuild application
  ```bash
  npm run build
  ```

- [ ] Restart application
  ```bash
  npm run start:prod
  ```

## Post-Deployment Verification

### 1. Check Migration Status
- [ ] Verify migration applied
  ```bash
  npx prisma migrate status
  ```

### 2. Test New Tables (All should return without errors)

- [ ] Test CompanySettings
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.companySettings.findMany().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test CustodyDocument
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.custodyDocument.count().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test DealAmendment
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.dealAmendment.count().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test DealDeletionRequest
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.dealDeletionRequest.count().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test DealProgressEvent
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.dealProgressEvent.count().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test EscrowAssignment
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.escrowAssignment.count().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test MilestoneApproval
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.milestoneApproval.count().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test MilestoneApprovalRequirement
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.milestoneApprovalRequirement.count().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test PartyAmendmentResponse
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.partyAmendmentResponse.count().then(console.log).finally(() => p.\$disconnect())"
  ```

- [ ] Test PartyDeletionResponse
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.partyDeletionResponse.count().then(console.log).finally(() => p.\$disconnect())"
  ```

### 3. Verify New Enums Work

- [ ] Test TransactionType enum
  ```bash
  node -e "const { TransactionType } = require('@prisma/client'); console.log(TransactionType)"
  ```

- [ ] Test ServiceTier enum
  ```bash
  node -e "const { ServiceTier } = require('@prisma/client'); console.log(ServiceTier)"
  ```

- [ ] Test MilestoneType enum
  ```bash
  node -e "const { MilestoneType } = require('@prisma/client'); console.log(MilestoneType)"
  ```

### 4. Test New Columns in Existing Tables

- [ ] Verify Deal.transactionType exists
  ```sql
  SELECT id, "transactionType", "serviceTier" FROM "Deal" LIMIT 1;
  ```

- [ ] Verify Deal.allPartiesConfirmed exists
  ```sql
  SELECT id, "allPartiesConfirmed" FROM "Deal" LIMIT 1;
  ```

- [ ] Verify Milestone.milestoneType exists
  ```sql
  SELECT id, "milestoneType", "isActive" FROM "Milestone" LIMIT 1;
  ```

- [ ] Verify User.clerkId exists
  ```sql
  SELECT id, email, "clerkId" FROM "User" LIMIT 1;
  ```

### 5. Check Indexes Were Created

- [ ] Verify indexes exist
  ```sql
  SELECT tablename, indexname FROM pg_indexes
  WHERE schemaname = 'public'
  AND (
    tablename = 'CustodyDocument' OR
    tablename = 'DealAmendment' OR
    tablename = 'DealProgressEvent' OR
    tablename = 'EscrowAssignment' OR
    tablename = 'MilestoneApproval'
  )
  ORDER BY tablename, indexname;
  ```

### 6. Check Foreign Keys Were Created

- [ ] Verify foreign key constraints
  ```sql
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (
    tc.table_name = 'CustodyDocument' OR
    tc.table_name = 'DealAmendment' OR
    tc.table_name = 'EscrowAssignment' OR
    tc.table_name = 'MilestoneApproval'
  )
  ORDER BY tc.table_name;
  ```

### 7. Application Health Checks

- [ ] Application starts without errors
- [ ] Health endpoint responds: `curl http://localhost:3000/health`
- [ ] API endpoints are accessible
- [ ] No database connection errors in logs
- [ ] No Prisma validation errors in logs

### 8. Functional Testing

- [ ] Create a new deal with service tier selection
- [ ] View existing deals (should not error)
- [ ] Create a milestone with approval requirements
- [ ] Test document custody tracking (if Tier 2)
- [ ] Verify progress events are logged
- [ ] Check user authentication with Clerk (clerkId)

## Rollback Procedure (If Needed)

⚠️ **Only use if critical issues occur**

- [ ] Stop the application
- [ ] Restore database from backup
  ```bash
  psql $DATABASE_URL < backup_TIMESTAMP.sql
  ```
- [ ] Revert Prisma migration
  ```bash
  npx prisma migrate resolve --rolled-back 20260216190000_add_all_missing_tables
  ```
- [ ] Restart application with previous version

## Success Criteria

✅ All tables created successfully
✅ All enums available
✅ All indexes present
✅ All foreign keys enforced
✅ Application starts without errors
✅ No database-related errors in logs
✅ All API endpoints functional
✅ All tests passing

## Sign-Off

- [ ] Database migration completed successfully
- [ ] All verification tests passed
- [ ] Application is stable and functional
- [ ] Monitoring shows no errors

**Deployed By:** ________________
**Date:** ________________
**Time:** ________________

---

## Quick Verification Command

Run this single command to test all new tables at once:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const results = {
      companySettings: await prisma.companySettings.count(),
      custodyDocument: await prisma.custodyDocument.count(),
      dealAmendment: await prisma.dealAmendment.count(),
      partyAmendmentResponse: await prisma.partyAmendmentResponse.count(),
      dealDeletionRequest: await prisma.dealDeletionRequest.count(),
      partyDeletionResponse: await prisma.partyDeletionResponse.count(),
      dealProgressEvent: await prisma.dealProgressEvent.count(),
      escrowAssignment: await prisma.escrowAssignment.count(),
      milestoneApproval: await prisma.milestoneApproval.count(),
      milestoneApprovalRequirement: await prisma.milestoneApprovalRequirement.count(),
    };
    console.log('✅ All tables accessible!');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

verify();
"
```

Expected output: All counts should be 0 or greater (no errors).
