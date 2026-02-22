-- CreateEnum: ApprovalStatus
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'OFFICER_RECOMMENDED_APPROVE', 'OFFICER_RECOMMENDED_REJECT', 'SENIOR_APPROVED', 'SENIOR_REJECTED', 'ADMIN_OVERRIDDEN', 'WITHDRAWN');

-- CreateEnum: ApprovalType
CREATE TYPE "ApprovalType" AS ENUM ('DEAL_ACTIVATION', 'MILESTONE_APPROVAL', 'FUND_RELEASE', 'DISPUTE_RESOLUTION', 'CONTRACT_MODIFICATION', 'PARTY_REMOVAL', 'DEAL_CANCELLATION');

-- AlterEnum: Update UserRole to add SENIOR_ESCROW_OFFICER and USER
-- Note: This requires careful migration if data exists
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SENIOR_ESCROW_OFFICER';

-- AlterTable: Add authority delegation fields to User
ALTER TABLE "User" ADD COLUMN "delegatedAuthority" JSONB;
ALTER TABLE "User" ADD COLUMN "assignedBy" TEXT;
ALTER TABLE "User" ADD COLUMN "assignedAt" TIMESTAMP(3);

-- CreateTable: ApprovalRequest
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "dealId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" JSONB,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "officerId" TEXT,
    "officerRecommendation" TEXT,
    "officerNotes" TEXT,
    "officerReviewedAt" TIMESTAMP(3),
    "seniorOfficerId" TEXT,
    "seniorDecision" TEXT,
    "seniorNotes" TEXT,
    "seniorReviewedAt" TIMESTAMP(3),
    "adminOverrideBy" TEXT,
    "adminOverrideReason" TEXT,
    "adminOverriddenAt" TIMESTAMP(3),
    "finalDecision" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ApprovalAuditLog
CREATE TABLE "ApprovalAuditLog" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "previousStatus" "ApprovalStatus",
    "newStatus" "ApprovalStatus" NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuthorityDelegation
CREATE TABLE "AuthorityDelegation" (
    "id" TEXT NOT NULL,
    "delegatedTo" TEXT NOT NULL,
    "delegatedBy" TEXT NOT NULL,
    "approvalTypes" TEXT[],
    "maxAmount" DECIMAL(15,2),
    "requiresSeniorReview" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorityDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ApprovalRequest indexes
CREATE INDEX "ApprovalRequest_dealId_idx" ON "ApprovalRequest"("dealId");
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");
CREATE INDEX "ApprovalRequest_type_idx" ON "ApprovalRequest"("type");
CREATE INDEX "ApprovalRequest_requestedBy_idx" ON "ApprovalRequest"("requestedBy");
CREATE INDEX "ApprovalRequest_officerId_idx" ON "ApprovalRequest"("officerId");
CREATE INDEX "ApprovalRequest_seniorOfficerId_idx" ON "ApprovalRequest"("seniorOfficerId");

-- CreateIndex: ApprovalAuditLog indexes
CREATE INDEX "ApprovalAuditLog_approvalRequestId_idx" ON "ApprovalAuditLog"("approvalRequestId");
CREATE INDEX "ApprovalAuditLog_performedBy_idx" ON "ApprovalAuditLog"("performedBy");
CREATE INDEX "ApprovalAuditLog_createdAt_idx" ON "ApprovalAuditLog"("createdAt");

-- CreateIndex: AuthorityDelegation indexes
CREATE INDEX "AuthorityDelegation_delegatedTo_idx" ON "AuthorityDelegation"("delegatedTo");
CREATE INDEX "AuthorityDelegation_delegatedBy_idx" ON "AuthorityDelegation"("delegatedBy");
CREATE INDEX "AuthorityDelegation_isActive_idx" ON "AuthorityDelegation"("isActive");
CREATE INDEX "AuthorityDelegation_validFrom_idx" ON "AuthorityDelegation"("validFrom");
CREATE INDEX "AuthorityDelegation_validUntil_idx" ON "AuthorityDelegation"("validUntil");

-- AddForeignKey: ApprovalRequest to Deal
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ApprovalRequest to User (requestedBy)
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ApprovalRequest to User (officer)
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ApprovalRequest to User (senior officer)
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_seniorOfficerId_fkey" FOREIGN KEY ("seniorOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ApprovalRequest to User (admin override)
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_adminOverrideBy_fkey" FOREIGN KEY ("adminOverrideBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ApprovalAuditLog to ApprovalRequest
ALTER TABLE "ApprovalAuditLog" ADD CONSTRAINT "ApprovalAuditLog_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ApprovalAuditLog to User (performer)
ALTER TABLE "ApprovalAuditLog" ADD CONSTRAINT "ApprovalAuditLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: AuthorityDelegation to User (delegatedTo)
ALTER TABLE "AuthorityDelegation" ADD CONSTRAINT "AuthorityDelegation_delegatedTo_fkey" FOREIGN KEY ("delegatedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: AuthorityDelegation to User (delegatedBy)
ALTER TABLE "AuthorityDelegation" ADD CONSTRAINT "AuthorityDelegation_delegatedBy_fkey" FOREIGN KEY ("delegatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
