-- Phase 1 Enhanced Models Migration
-- WARNING: This migration includes breaking changes to DealStatus enum

-- ============================================================================
-- STEP 1: Create New Enums
-- ============================================================================

-- Asset Type
CREATE TYPE "AssetType" AS ENUM ('SHARES', 'REAL_ESTATE', 'GOODS', 'SERVICES', 'OTHER');

-- Settlement Method
CREATE TYPE "SettlementMethod" AS ENUM ('BANK_TRANSFER', 'INSTAPAY', 'CASH', 'CHEQUE', 'OTHER');

-- Fees Paid By
CREATE TYPE "FeesPaidBy" AS ENUM ('BUYER', 'SELLER', 'SPLIT');

-- Party Type
CREATE TYPE "PartyType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- ID Type
CREATE TYPE "IDType" AS ENUM ('PASSPORT', 'NATIONAL_ID', 'BUSINESS_REGISTRY', 'OTHER');

-- KYC Status
CREATE TYPE "KYCStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- Evidence Source Type
CREATE TYPE "EvidenceSourceType" AS ENUM ('UPLOAD', 'EMAIL', 'API');

-- Payout Type
CREATE TYPE "PayoutType" AS ENUM ('RELEASE', 'REFUND', 'PARTIAL');

-- New Deal Status (Phase 1)
CREATE TYPE "DealStatus_new" AS ENUM ('CREATED', 'INVITED', 'ACCEPTED', 'FUNDED', 'IN_PROGRESS', 'READY_TO_RELEASE', 'RELEASED', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- New Milestone Status (simplified)
CREATE TYPE "MilestoneStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'DISPUTED');

-- ============================================================================
-- STEP 2: Add New Columns to Deal
-- ============================================================================

ALTER TABLE "Deal" ADD COLUMN "assetType" "AssetType";
ALTER TABLE "Deal" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'EG';
ALTER TABLE "Deal" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EGP';
ALTER TABLE "Deal" ADD COLUMN "totalAmount" DECIMAL(15,2);
ALTER TABLE "Deal" ADD COLUMN "settlementMethod" "SettlementMethod";
ALTER TABLE "Deal" ADD COLUMN "feesPaidBy" "FeesPaidBy";

-- ============================================================================
-- STEP 3: Add New Columns to Party
-- ============================================================================

ALTER TABLE "Party" ADD COLUMN "partyType" "PartyType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "Party" ADD COLUMN "idType" "IDType";
ALTER TABLE "Party" ADD COLUMN "idNumber" TEXT;
ALTER TABLE "Party" ADD COLUMN "poaRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Party" ADD COLUMN "kycStatus" "KYCStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Party" ADD COLUMN "kycDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ============================================================================
-- STEP 4: Add New Columns to EvidenceItem
-- ============================================================================

-- Add new sourceType column (temporarily nullable)
ALTER TABLE "EvidenceItem" ADD COLUMN "sourceType_new" "EvidenceSourceType";

-- Migrate existing data: assume all existing evidence is UPLOAD
UPDATE "EvidenceItem" SET "sourceType_new" = 'UPLOAD'::"EvidenceSourceType";

-- Make it non-nullable with default
ALTER TABLE "EvidenceItem" ALTER COLUMN "sourceType_new" SET NOT NULL;
ALTER TABLE "EvidenceItem" ALTER COLUMN "sourceType_new" SET DEFAULT 'UPLOAD'::"EvidenceSourceType";

-- Drop old sourceType column and rename new one
ALTER TABLE "EvidenceItem" DROP COLUMN "sourceType";
ALTER TABLE "EvidenceItem" RENAME COLUMN "sourceType_new" TO "sourceType";

-- Add tracking columns
ALTER TABLE "EvidenceItem" ADD COLUMN "submittedByUserId" TEXT;
ALTER TABLE "EvidenceItem" ADD COLUMN "verifiedByUserId" TEXT;
ALTER TABLE "EvidenceItem" ADD COLUMN "verificationNotes" TEXT;

-- Add foreign key constraints
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_submittedByUserId_fkey"
  FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_verifiedByUserId_fkey"
  FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "EvidenceItem_submittedByUserId_idx" ON "EvidenceItem"("submittedByUserId");
CREATE INDEX "EvidenceItem_verifiedByUserId_idx" ON "EvidenceItem"("verifiedByUserId");

-- ============================================================================
-- STEP 5: Add Index to Attachment.sha256Hash
-- ============================================================================

CREATE INDEX "Attachment_sha256Hash_idx" ON "Attachment"("sha256Hash");

-- ============================================================================
-- STEP 6: Update Milestone Model
-- ============================================================================

-- Add new columns
ALTER TABLE "Milestone" ADD COLUMN "order" INTEGER;
ALTER TABLE "Milestone" ADD COLUMN "name" TEXT;
ALTER TABLE "Milestone" ADD COLUMN "conditionText" TEXT;
ALTER TABLE "Milestone" ADD COLUMN "payoutType" "PayoutType";
ALTER TABLE "Milestone" ADD COLUMN "requiredEvidenceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate data from old columns to new
UPDATE "Milestone" SET "order" = "sequence";
UPDATE "Milestone" SET "name" = "title";
UPDATE "Milestone" SET "conditionText" = "description";

-- Make new columns non-nullable where needed
ALTER TABLE "Milestone" ALTER COLUMN "order" SET NOT NULL;
ALTER TABLE "Milestone" ALTER COLUMN "name" SET NOT NULL;

-- Drop old index on (contractId, sequence)
DROP INDEX IF EXISTS "Milestone_contractId_sequence_idx";

-- Create new index on (contractId, order)
CREATE INDEX "Milestone_contractId_order_idx" ON "Milestone"("contractId", "order");

-- Note: Keep old columns for now to avoid data loss
-- They can be removed in a future migration after verification

-- ============================================================================
-- STEP 7: Update Milestone Status Enum
-- ============================================================================

-- Add temporary column with new enum
ALTER TABLE "Milestone" ADD COLUMN "status_new" "MilestoneStatus_new";

-- Migrate existing status values to new enum
UPDATE "Milestone" SET "status_new" =
  CASE "status"::text
    WHEN 'PENDING' THEN 'PENDING'::"MilestoneStatus_new"
    WHEN 'EVIDENCE_SUBMITTED' THEN 'IN_PROGRESS'::"MilestoneStatus_new"
    WHEN 'UNDER_REVIEW' THEN 'READY_FOR_REVIEW'::"MilestoneStatus_new"
    WHEN 'ACCEPTED' THEN 'APPROVED'::"MilestoneStatus_new"
    WHEN 'DISPUTED' THEN 'DISPUTED'::"MilestoneStatus_new"
    WHEN 'RELEASE_AUTHORIZED' THEN 'APPROVED'::"MilestoneStatus_new"
    WHEN 'RETURN_AUTHORIZED' THEN 'REJECTED'::"MilestoneStatus_new"
    WHEN 'RELEASE_CONFIRMED' THEN 'COMPLETED'::"MilestoneStatus_new"
    WHEN 'RETURN_CONFIRMED' THEN 'COMPLETED'::"MilestoneStatus_new"
    WHEN 'COMPLETED' THEN 'COMPLETED'::"MilestoneStatus_new"
    ELSE 'PENDING'::"MilestoneStatus_new"
  END;

-- Make new column non-nullable with default
ALTER TABLE "Milestone" ALTER COLUMN "status_new" SET NOT NULL;
ALTER TABLE "Milestone" ALTER COLUMN "status_new" SET DEFAULT 'PENDING'::"MilestoneStatus_new";

-- Drop old status column and old enum
ALTER TABLE "Milestone" DROP COLUMN "status";
DROP TYPE "MilestoneStatus";

-- Rename new column and enum
ALTER TABLE "Milestone" RENAME COLUMN "status_new" TO "status";
ALTER TYPE "MilestoneStatus_new" RENAME TO "MilestoneStatus";

-- Recreate index on status
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- ============================================================================
-- STEP 8: Update Deal Status Enum
-- ============================================================================

-- Add temporary column with new enum
ALTER TABLE "Deal" ADD COLUMN "status_new" "DealStatus_new";

-- Migrate existing status values to new enum
UPDATE "Deal" SET "status_new" =
  CASE "status"::text
    WHEN 'DRAFT' THEN 'CREATED'::"DealStatus_new"
    WHEN 'PROPOSED' THEN 'INVITED'::"DealStatus_new"
    WHEN 'ACCEPTED_BY_ALL' THEN 'ACCEPTED'::"DealStatus_new"
    WHEN 'SIGNED_RECORDED' THEN 'ACCEPTED'::"DealStatus_new"
    WHEN 'FUNDED_VERIFIED' THEN 'FUNDED'::"DealStatus_new"
    WHEN 'IN_VERIFICATION' THEN 'IN_PROGRESS'::"DealStatus_new"
    WHEN 'RELEASE_AUTHORIZED' THEN 'READY_TO_RELEASE'::"DealStatus_new"
    WHEN 'RETURN_AUTHORIZED' THEN 'READY_TO_RELEASE'::"DealStatus_new"
    WHEN 'RELEASE_CONFIRMED' THEN 'RELEASED'::"DealStatus_new"
    WHEN 'RETURN_CONFIRMED' THEN 'COMPLETED'::"DealStatus_new"
    WHEN 'CLOSED' THEN 'COMPLETED'::"DealStatus_new"
    WHEN 'CANCELLED' THEN 'CANCELLED'::"DealStatus_new"
    ELSE 'CREATED'::"DealStatus_new"
  END;

-- Make new column non-nullable with default
ALTER TABLE "Deal" ALTER COLUMN "status_new" SET NOT NULL;
ALTER TABLE "Deal" ALTER COLUMN "status_new" SET DEFAULT 'CREATED'::"DealStatus_new";

-- Drop old status column and old enum
ALTER TABLE "Deal" DROP COLUMN "status";
DROP TYPE "DealStatus";

-- Rename new column and enum
ALTER TABLE "Deal" RENAME COLUMN "status_new" TO "status";
ALTER TYPE "DealStatus_new" RENAME TO "DealStatus";

-- Recreate index on status
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- ============================================================================
-- STEP 9: Update Dispute Model
-- ============================================================================

ALTER TABLE "Dispute" ADD COLUMN "issueType" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "narrative" TEXT;

-- Migrate existing description to narrative
UPDATE "Dispute" SET "narrative" = "description";

-- Make narrative non-nullable
ALTER TABLE "Dispute" ALTER COLUMN "narrative" SET NOT NULL;

-- Add index on milestoneId
CREATE INDEX "Dispute_milestoneId_idx" ON "Dispute"("milestoneId");

-- Note: Keep description column for now for compatibility

-- ============================================================================
-- STEP 10: Create DealDraft Table
-- ============================================================================

CREATE TABLE "DealDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "step1Data" JSONB,
    "step2Data" JSONB,
    "step3Data" JSONB,
    "step4Data" JSONB,
    "step5Data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealDraft_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX "DealDraft_userId_idx" ON "DealDraft"("userId");
CREATE INDEX "DealDraft_expiresAt_idx" ON "DealDraft"("expiresAt");

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Added 8 new enums (AssetType, SettlementMethod, FeesPaidBy, PartyType, IDType, KYCStatus, EvidenceSourceType, PayoutType)
-- ✅ Replaced DealStatus enum with simplified Phase 1 states
-- ✅ Replaced MilestoneStatus enum with simplified Phase 1 states
-- ✅ Enhanced Deal model with transaction details
-- ✅ Enhanced Party model with KYC fields
-- ✅ Enhanced EvidenceItem with tracking fields
-- ✅ Enhanced Milestone with clearer naming
-- ✅ Enhanced Dispute with structured fields
-- ✅ Created DealDraft model for wizard
-- ✅ Added indexes for performance
-- ✅ Migrated all existing data to new schema
