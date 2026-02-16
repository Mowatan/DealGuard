-- ============================================================================
-- COMPREHENSIVE MIGRATION: Add All Missing Tables and Columns
-- ============================================================================
-- This migration creates all missing tables from the Prisma schema:
-- 1. CompanySettings
-- 2. CustodyDocument
-- 3. DealAmendment
-- 4. DealDeletionRequest
-- 5. DealProgressEvent
-- 6. EscrowAssignment
-- 7. MilestoneApproval
-- 8. MilestoneApprovalRequirement
-- 9. PartyAmendmentResponse
-- 10. PartyDeletionResponse
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Missing Enums
-- ============================================================================

-- TransactionType enum
DO $$ BEGIN
 CREATE TYPE "TransactionType" AS ENUM ('SIMPLE', 'MILESTONE_BASED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ServiceTier enum
DO $$ BEGIN
 CREATE TYPE "ServiceTier" AS ENUM ('GOVERNANCE_ADVISORY', 'DOCUMENT_CUSTODY', 'FINANCIAL_ESCROW');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- MilestoneType enum
DO $$ BEGIN
 CREATE TYPE "MilestoneType" AS ENUM ('PAYMENT', 'PERFORMANCE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- TriggerType enum
DO $$ BEGIN
 CREATE TYPE "TriggerType" AS ENUM ('IMMEDIATE', 'TIME_BASED', 'PERFORMANCE_BASED', 'KPI_BASED', 'HYBRID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- PaymentMethod enum
DO $$ BEGIN
 CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'IN_KIND_ASSET', 'MIXED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- DeliveryMethod enum
DO $$ BEGIN
 CREATE TYPE "DeliveryMethod" AS ENUM ('COURIER', 'HAND_DELIVERY', 'REGISTERED_MAIL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CustodyDocumentType enum
DO $$ BEGIN
 CREATE TYPE "CustodyDocumentType" AS ENUM ('TITLE_DEED', 'STOCK_CERTIFICATE', 'POWER_OF_ATTORNEY', 'VEHICLE_REGISTRATION', 'PROPERTY_REGISTRATION', 'CONTRACT_ORIGINAL', 'PASSPORT', 'IDENTITY_DOCUMENT', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CustodyDocumentStatus enum
DO $$ BEGIN
 CREATE TYPE "CustodyDocumentStatus" AS ENUM ('PENDING_DELIVERY', 'IN_TRANSIT', 'DELIVERY_REFUSED', 'RECEIVED_IN_OFFICE', 'IN_CUSTODY', 'PENDING_RELEASE', 'RELEASED', 'RETURNED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AmendmentStatus enum
DO $$ BEGIN
 CREATE TYPE "AmendmentStatus" AS ENUM ('PENDING', 'APPROVED', 'DISPUTED', 'APPLIED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- DeletionStatus enum
DO $$ BEGIN
 CREATE TYPE "DeletionStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'DISPUTED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- PartyResponseType enum
DO $$ BEGIN
 CREATE TYPE "PartyResponseType" AS ENUM ('APPROVE', 'DISPUTE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ProgressStageStatus enum
DO $$ BEGIN
 CREATE TYPE "ProgressStageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'SKIPPED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add ESCROW_OFFICER to UserRole if not exists
DO $$ BEGIN
 ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ESCROW_OFFICER';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add BROKER to PartyRole if not exists
DO $$ BEGIN
 ALTER TYPE "PartyRole" ADD VALUE IF NOT EXISTS 'BROKER';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add QUARANTINED to EvidenceStatus if not exists
DO $$ BEGIN
 ALTER TYPE "EvidenceStatus" ADD VALUE IF NOT EXISTS 'QUARANTINED';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Add Missing Columns to Existing Tables
-- ============================================================================

-- Add missing columns to Deal table
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "transactionType" "TransactionType" NOT NULL DEFAULT 'SIMPLE';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "serviceTier" "ServiceTier" NOT NULL DEFAULT 'GOVERNANCE_ADVISORY';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "estimatedValue" DECIMAL(15,2);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "serviceFee" DECIMAL(15,2);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "allPartiesConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- Add missing columns to Milestone table
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "milestoneType" "MilestoneType";
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "triggerType" "TriggerType";
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "triggerConfig" JSONB;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "paymentDetails" JSONB;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(15,2);
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "deliveryDetails" JSONB;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "payerPartyId" TEXT;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "receiverPartyId" TEXT;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "delivererPartyId" TEXT;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "evidenceRequirements" JSONB;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);

-- Add missing columns to EvidenceItem table
ALTER TABLE "EvidenceItem" ADD COLUMN IF NOT EXISTS "quarantineReason" TEXT;

-- Add missing columns to Dispute table
ALTER TABLE "Dispute" ADD COLUMN IF NOT EXISTS "milestoneFrozen" BOOLEAN NOT NULL DEFAULT false;

-- Add missing columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clerkId" TEXT;

-- ============================================================================
-- STEP 3: Create CompanySettings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "CompanySettings" (
    "id" TEXT NOT NULL,
    "officeAddress" TEXT NOT NULL DEFAULT '45 Narges 3, New Cairo, Cairo, Egypt',
    "officeAddressLine2" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Cairo',
    "country" TEXT NOT NULL DEFAULT 'Egypt',
    "postalCode" TEXT,
    "officePhone" TEXT,
    "officeEmail" TEXT,
    "officeHours" TEXT DEFAULT 'Sunday-Thursday, 9 AM - 5 PM',
    "authorizedReceivers" TEXT[] DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 4: Create CustodyDocument Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "CustodyDocument" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "documentType" "CustodyDocumentType" NOT NULL,
    "description" TEXT NOT NULL,
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "deliveryInstructions" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "courierService" TEXT,
    "trackingNumber" TEXT,
    "authorizedReceiverName" TEXT NOT NULL,
    "actualReceiverName" TEXT,
    "receivedByUserId" TEXT,
    "originalReceived" BOOLEAN NOT NULL DEFAULT false,
    "receivedDate" TIMESTAMP(3),
    "receiptPhotoUrl" TEXT,
    "vaultLocation" TEXT,
    "digitalTwinUrl" TEXT,
    "digitalTwinHash" TEXT,
    "insuranceValue" DECIMAL(15,2),
    "insurancePolicyNumber" TEXT,
    "releaseAuthorizedBy" TEXT[] DEFAULT '{}',
    "releaseAuthorizedAt" TIMESTAMP(3),
    "releasedTo" TEXT,
    "releasedAt" TIMESTAMP(3),
    "refusalReason" TEXT,
    "refusalNotes" TEXT,
    "refusedAt" TIMESTAMP(3),
    "refusedBy" TEXT,
    "status" "CustodyDocumentStatus" NOT NULL DEFAULT 'PENDING_DELIVERY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustodyDocument_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 5: Create MilestoneApprovalRequirement Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "MilestoneApprovalRequirement" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "requireAdminApproval" BOOLEAN NOT NULL DEFAULT true,
    "requireBuyerApproval" BOOLEAN NOT NULL DEFAULT false,
    "requireSellerApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneApprovalRequirement_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 6: Create MilestoneApproval Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "MilestoneApproval" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partyId" TEXT,
    "approvalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneApproval_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 7: Create DealAmendment Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "DealAmendment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "proposedByName" TEXT NOT NULL,
    "proposedChanges" JSONB NOT NULL,
    "status" "AmendmentStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealAmendment_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 8: Create PartyAmendmentResponse Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "PartyAmendmentResponse" (
    "id" TEXT NOT NULL,
    "amendmentId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "responseType" "PartyResponseType" NOT NULL,
    "notes" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyAmendmentResponse_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 9: Create DealDeletionRequest Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "DealDeletionRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DeletionStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 10: Create PartyDeletionResponse Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "PartyDeletionResponse" (
    "id" TEXT NOT NULL,
    "deletionRequestId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "responseType" "PartyResponseType" NOT NULL,
    "notes" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyDeletionResponse_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 11: Create DealProgressEvent Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "DealProgressEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "status" "ProgressStageStatus" NOT NULL DEFAULT 'PENDING',
    "enteredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "currentActor" TEXT,
    "completedBy" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealProgressEvent_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 12: Create EscrowAssignment Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "EscrowAssignment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "escrowOfficerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "currentMessage" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowAssignment_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 13: Create Unique Constraints
-- ============================================================================

-- CompanySettings (only one row should exist)
-- No unique constraint needed, id is primary key

-- MilestoneApprovalRequirement
ALTER TABLE "MilestoneApprovalRequirement" DROP CONSTRAINT IF EXISTS "MilestoneApprovalRequirement_milestoneId_key";
DO $$ BEGIN
 ALTER TABLE "MilestoneApprovalRequirement" ADD CONSTRAINT "MilestoneApprovalRequirement_milestoneId_key" UNIQUE ("milestoneId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- MilestoneApproval
ALTER TABLE "MilestoneApproval" DROP CONSTRAINT IF EXISTS "MilestoneApproval_milestoneId_userId_key";
DO $$ BEGIN
 ALTER TABLE "MilestoneApproval" ADD CONSTRAINT "MilestoneApproval_milestoneId_userId_key" UNIQUE ("milestoneId", "userId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- PartyAmendmentResponse
ALTER TABLE "PartyAmendmentResponse" DROP CONSTRAINT IF EXISTS "PartyAmendmentResponse_amendmentId_partyId_key";
DO $$ BEGIN
 ALTER TABLE "PartyAmendmentResponse" ADD CONSTRAINT "PartyAmendmentResponse_amendmentId_partyId_key" UNIQUE ("amendmentId", "partyId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- PartyDeletionResponse
ALTER TABLE "PartyDeletionResponse" DROP CONSTRAINT IF EXISTS "PartyDeletionResponse_deletionRequestId_partyId_key";
DO $$ BEGIN
 ALTER TABLE "PartyDeletionResponse" ADD CONSTRAINT "PartyDeletionResponse_deletionRequestId_partyId_key" UNIQUE ("deletionRequestId", "partyId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- DealProgressEvent
ALTER TABLE "DealProgressEvent" DROP CONSTRAINT IF EXISTS "DealProgressEvent_dealId_stageKey_key";
DO $$ BEGIN
 ALTER TABLE "DealProgressEvent" ADD CONSTRAINT "DealProgressEvent_dealId_stageKey_key" UNIQUE ("dealId", "stageKey");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- EscrowAssignment
ALTER TABLE "EscrowAssignment" DROP CONSTRAINT IF EXISTS "EscrowAssignment_dealId_key";
DO $$ BEGIN
 ALTER TABLE "EscrowAssignment" ADD CONSTRAINT "EscrowAssignment_dealId_key" UNIQUE ("dealId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- User clerkId
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_clerkId_key";
DO $$ BEGIN
 ALTER TABLE "User" ADD CONSTRAINT "User_clerkId_key" UNIQUE ("clerkId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- ============================================================================
-- STEP 14: Create Indexes
-- ============================================================================

-- CustodyDocument indexes
CREATE INDEX IF NOT EXISTS "CustodyDocument_dealId_idx" ON "CustodyDocument"("dealId");
CREATE INDEX IF NOT EXISTS "CustodyDocument_status_idx" ON "CustodyDocument"("status");
CREATE INDEX IF NOT EXISTS "CustodyDocument_trackingNumber_idx" ON "CustodyDocument"("trackingNumber");

-- MilestoneApproval indexes
CREATE INDEX IF NOT EXISTS "MilestoneApproval_milestoneId_idx" ON "MilestoneApproval"("milestoneId");

-- DealAmendment indexes
CREATE INDEX IF NOT EXISTS "DealAmendment_dealId_idx" ON "DealAmendment"("dealId");
CREATE INDEX IF NOT EXISTS "DealAmendment_status_idx" ON "DealAmendment"("status");

-- PartyAmendmentResponse indexes
CREATE INDEX IF NOT EXISTS "PartyAmendmentResponse_amendmentId_idx" ON "PartyAmendmentResponse"("amendmentId");
CREATE INDEX IF NOT EXISTS "PartyAmendmentResponse_partyId_idx" ON "PartyAmendmentResponse"("partyId");

-- DealDeletionRequest indexes
CREATE INDEX IF NOT EXISTS "DealDeletionRequest_dealId_idx" ON "DealDeletionRequest"("dealId");
CREATE INDEX IF NOT EXISTS "DealDeletionRequest_status_idx" ON "DealDeletionRequest"("status");

-- PartyDeletionResponse indexes
CREATE INDEX IF NOT EXISTS "PartyDeletionResponse_deletionRequestId_idx" ON "PartyDeletionResponse"("deletionRequestId");
CREATE INDEX IF NOT EXISTS "PartyDeletionResponse_partyId_idx" ON "PartyDeletionResponse"("partyId");

-- DealProgressEvent indexes
CREATE INDEX IF NOT EXISTS "DealProgressEvent_dealId_stageOrder_idx" ON "DealProgressEvent"("dealId", "stageOrder");
CREATE INDEX IF NOT EXISTS "DealProgressEvent_dealId_status_idx" ON "DealProgressEvent"("dealId", "status");

-- EscrowAssignment indexes
CREATE INDEX IF NOT EXISTS "EscrowAssignment_escrowOfficerId_idx" ON "EscrowAssignment"("escrowOfficerId");

-- Milestone flexible relations indexes
CREATE INDEX IF NOT EXISTS "Milestone_isActive_idx" ON "Milestone"("isActive");
CREATE INDEX IF NOT EXISTS "Milestone_payerPartyId_idx" ON "Milestone"("payerPartyId");
CREATE INDEX IF NOT EXISTS "Milestone_receiverPartyId_idx" ON "Milestone"("receiverPartyId");
CREATE INDEX IF NOT EXISTS "Milestone_delivererPartyId_idx" ON "Milestone"("delivererPartyId");

-- User clerkId index
CREATE INDEX IF NOT EXISTS "User_clerkId_idx" ON "User"("clerkId");

-- ============================================================================
-- STEP 15: Add Foreign Key Constraints
-- ============================================================================

-- CustodyDocument foreign keys
DO $$ BEGIN
 ALTER TABLE "CustodyDocument" ADD CONSTRAINT "CustodyDocument_dealId_fkey"
   FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "CustodyDocument" ADD CONSTRAINT "CustodyDocument_receivedByUserId_fkey"
   FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- MilestoneApprovalRequirement foreign keys
DO $$ BEGIN
 ALTER TABLE "MilestoneApprovalRequirement" ADD CONSTRAINT "MilestoneApprovalRequirement_milestoneId_fkey"
   FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- MilestoneApproval foreign keys
DO $$ BEGIN
 ALTER TABLE "MilestoneApproval" ADD CONSTRAINT "MilestoneApproval_milestoneId_fkey"
   FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "MilestoneApproval" ADD CONSTRAINT "MilestoneApproval_userId_fkey"
   FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "MilestoneApproval" ADD CONSTRAINT "MilestoneApproval_partyId_fkey"
   FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- DealAmendment foreign keys
DO $$ BEGIN
 ALTER TABLE "DealAmendment" ADD CONSTRAINT "DealAmendment_dealId_fkey"
   FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- PartyAmendmentResponse foreign keys
DO $$ BEGIN
 ALTER TABLE "PartyAmendmentResponse" ADD CONSTRAINT "PartyAmendmentResponse_amendmentId_fkey"
   FOREIGN KEY ("amendmentId") REFERENCES "DealAmendment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "PartyAmendmentResponse" ADD CONSTRAINT "PartyAmendmentResponse_partyId_fkey"
   FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- DealDeletionRequest foreign keys
DO $$ BEGIN
 ALTER TABLE "DealDeletionRequest" ADD CONSTRAINT "DealDeletionRequest_dealId_fkey"
   FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- PartyDeletionResponse foreign keys
DO $$ BEGIN
 ALTER TABLE "PartyDeletionResponse" ADD CONSTRAINT "PartyDeletionResponse_deletionRequestId_fkey"
   FOREIGN KEY ("deletionRequestId") REFERENCES "DealDeletionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "PartyDeletionResponse" ADD CONSTRAINT "PartyDeletionResponse_partyId_fkey"
   FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- DealProgressEvent foreign keys
DO $$ BEGIN
 ALTER TABLE "DealProgressEvent" ADD CONSTRAINT "DealProgressEvent_dealId_fkey"
   FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- EscrowAssignment foreign keys
DO $$ BEGIN
 ALTER TABLE "EscrowAssignment" ADD CONSTRAINT "EscrowAssignment_dealId_fkey"
   FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "EscrowAssignment" ADD CONSTRAINT "EscrowAssignment_escrowOfficerId_fkey"
   FOREIGN KEY ("escrowOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Milestone flexible relations foreign keys
DO $$ BEGIN
 ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_payerPartyId_fkey"
   FOREIGN KEY ("payerPartyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_receiverPartyId_fkey"
   FOREIGN KEY ("receiverPartyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_delivererPartyId_fkey"
   FOREIGN KEY ("delivererPartyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Created 13 new enums (TransactionType, ServiceTier, MilestoneType, TriggerType, PaymentMethod, DeliveryMethod, CustodyDocumentType, CustodyDocumentStatus, AmendmentStatus, DeletionStatus, PartyResponseType, ProgressStageStatus)
-- ✅ Added ESCROW_OFFICER to UserRole enum
-- ✅ Added BROKER to PartyRole enum
-- ✅ Added QUARANTINED to EvidenceStatus enum
-- ✅ Added missing columns to Deal table (transactionType, serviceTier, estimatedValue, serviceFee, allPartiesConfirmed)
-- ✅ Added missing columns to Milestone table (description, milestoneType, triggerType, triggerConfig, paymentMethod, paymentDetails, amount, deliveryDetails, payerPartyId, receiverPartyId, delivererPartyId, evidenceRequirements, isActive, activatedAt)
-- ✅ Added missing columns to EvidenceItem table (quarantineReason)
-- ✅ Added missing columns to Dispute table (milestoneFrozen)
-- ✅ Added missing columns to User table (clerkId)
-- ✅ Created CompanySettings table
-- ✅ Created CustodyDocument table
-- ✅ Created MilestoneApprovalRequirement table
-- ✅ Created MilestoneApproval table
-- ✅ Created DealAmendment table
-- ✅ Created PartyAmendmentResponse table
-- ✅ Created DealDeletionRequest table
-- ✅ Created PartyDeletionResponse table
-- ✅ Created DealProgressEvent table
-- ✅ Created EscrowAssignment table
-- ✅ Added all unique constraints
-- ✅ Added all indexes for performance
-- ✅ Added all foreign key constraints
