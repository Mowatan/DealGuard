# Migration: Add All Missing Tables

**Migration Name:** `20260216190000_add_all_missing_tables`
**Created:** 2026-02-16
**Status:** Ready to apply

## Overview

This comprehensive migration adds ALL missing tables and columns from the Prisma schema to the PostgreSQL database. It resolves "column does not exist" and "table does not exist" errors throughout the application.

## What This Migration Creates

### New Tables (10)

1. **CompanySettings** - Company office address and authorized document receivers
2. **CustodyDocument** - Physical document custody tracking (Tier 2)
3. **DealAmendment** - Deal amendment proposals
4. **PartyAmendmentResponse** - Party responses to amendments
5. **DealDeletionRequest** - Deal deletion requests
6. **PartyDeletionResponse** - Party responses to deletion requests
7. **DealProgressEvent** - Deal progress stage tracking
8. **EscrowAssignment** - Escrow officer assignments to deals
9. **MilestoneApprovalRequirement** - Milestone approval configuration
10. **MilestoneApproval** - Milestone approval records

### New Enums (13)

- `TransactionType` - SIMPLE | MILESTONE_BASED
- `ServiceTier` - GOVERNANCE_ADVISORY | DOCUMENT_CUSTODY | FINANCIAL_ESCROW
- `MilestoneType` - PAYMENT | PERFORMANCE
- `TriggerType` - IMMEDIATE | TIME_BASED | PERFORMANCE_BASED | KPI_BASED | HYBRID
- `PaymentMethod` - CASH | BANK_TRANSFER | IN_KIND_ASSET | MIXED
- `DeliveryMethod` - COURIER | HAND_DELIVERY | REGISTERED_MAIL
- `CustodyDocumentType` - TITLE_DEED | STOCK_CERTIFICATE | etc.
- `CustodyDocumentStatus` - PENDING_DELIVERY | IN_TRANSIT | etc.
- `AmendmentStatus` - PENDING | APPROVED | DISPUTED | APPLIED | REJECTED
- `DeletionStatus` - PENDING | APPROVED | EXECUTED | DISPUTED | REJECTED
- `PartyResponseType` - APPROVE | DISPUTE
- `ProgressStageStatus` - PENDING | IN_PROGRESS | COMPLETED | BLOCKED | SKIPPED
- Plus additions to existing enums (ESCROW_OFFICER, BROKER, QUARANTINED)

### New Columns Added to Existing Tables

#### Deal Table
- `transactionType` (TransactionType)
- `serviceTier` (ServiceTier)
- `estimatedValue` (Decimal)
- `serviceFee` (Decimal)
- `allPartiesConfirmed` (Boolean)

#### Milestone Table
- `description` (Text)
- `milestoneType` (MilestoneType)
- `triggerType` (TriggerType)
- `triggerConfig` (JSONB)
- `paymentMethod` (PaymentMethod)
- `paymentDetails` (JSONB)
- `amount` (Decimal)
- `deliveryDetails` (JSONB)
- `payerPartyId` (Foreign key to Party)
- `receiverPartyId` (Foreign key to Party)
- `delivererPartyId` (Foreign key to Party)
- `evidenceRequirements` (JSONB)
- `isActive` (Boolean)
- `activatedAt` (Timestamp)

#### User Table
- `clerkId` (Text, unique)

#### EvidenceItem Table
- `quarantineReason` (Text)

#### Dispute Table
- `milestoneFrozen` (Boolean)

### Indexes Created

All tables include appropriate indexes for:
- Foreign key relationships
- Status fields
- Unique constraints
- Frequently queried columns

### Foreign Key Constraints

All foreign key relationships are properly defined with:
- CASCADE delete where appropriate (e.g., deleting a Deal deletes related records)
- SET NULL for optional relationships
- RESTRICT where referential integrity is critical

## How to Apply This Migration

### Option 1: Using Prisma Migrate (Recommended)

If you have the DATABASE_URL environment variable set:

```bash
cd fouad-ai/backend
npx prisma migrate deploy
```

This will automatically apply all pending migrations including this one.

### Option 2: Manual Application

If you prefer to apply the migration manually:

```bash
# Connect to your PostgreSQL database
psql -h your-host -U your-user -d your-database

# Run the migration file
\i prisma/migrations/20260216190000_add_all_missing_tables/migration.sql

# Exit psql
\q
```

### Option 3: Railway/Production Deployment

The migration will be automatically applied during deployment if you have Prisma migrate set up in your build/start scripts.

## Verification

After applying the migration, verify it worked:

```bash
# Generate Prisma Client with new tables
npx prisma generate

# Check database schema
npx prisma db pull

# Run a test query (in Node REPL or your app)
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.companySettings.findMany().then(console.log).finally(() => prisma.\$disconnect())"
```

## Safety Features

This migration is safe to run because:

1. **Idempotent Design** - Uses `IF NOT EXISTS` clauses throughout
2. **No Data Loss** - Only adds new tables/columns, doesn't drop anything
3. **Backward Compatible** - Existing functionality continues to work
4. **Default Values** - All new columns have sensible defaults
5. **Error Handling** - Uses DO $$ blocks to handle duplicate objects gracefully

## Rollback

If you need to rollback this migration:

```sql
-- WARNING: This will delete data!
DROP TABLE IF EXISTS "EscrowAssignment" CASCADE;
DROP TABLE IF EXISTS "DealProgressEvent" CASCADE;
DROP TABLE IF EXISTS "PartyDeletionResponse" CASCADE;
DROP TABLE IF EXISTS "DealDeletionRequest" CASCADE;
DROP TABLE IF EXISTS "PartyAmendmentResponse" CASCADE;
DROP TABLE IF EXISTS "DealAmendment" CASCADE;
DROP TABLE IF EXISTS "MilestoneApproval" CASCADE;
DROP TABLE IF EXISTS "MilestoneApprovalRequirement" CASCADE;
DROP TABLE IF EXISTS "CustodyDocument" CASCADE;
DROP TABLE IF EXISTS "CompanySettings" CASCADE;

-- Drop new columns (only if needed)
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "transactionType";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "serviceTier";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "estimatedValue";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "serviceFee";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "allPartiesConfirmed";

-- Continue for other columns...
```

**Note:** Rolling back will lose all data in these tables. Only do this if absolutely necessary.

## Files Modified

- `prisma/migrations/20260216190000_add_all_missing_tables/migration.sql` - The migration SQL
- `prisma/migrations/20260216190000_add_all_missing_tables/README.md` - This documentation

## Related Issues

This migration resolves:
- "column does not exist" errors for all missing columns
- "table does not exist" errors for all 10 missing tables
- Foreign key constraint errors for flexible milestone system
- Enum value errors for new status types

## Testing

After applying this migration, test:

1. Deal creation with service tiers
2. Milestone approval system
3. Deal amendment proposals
4. Deal deletion requests
5. Document custody tracking
6. Progress event tracking
7. Escrow officer assignments

## Support

If you encounter any issues:
1. Check that your Prisma schema matches the migration
2. Ensure DATABASE_URL is correctly set
3. Verify PostgreSQL version compatibility (v12+)
4. Check the migration was fully applied: `SELECT * FROM "_prisma_migrations";`
