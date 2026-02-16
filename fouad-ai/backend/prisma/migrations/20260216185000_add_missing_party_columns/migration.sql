-- CreateEnums (if not exist)
DO $$ BEGIN
 CREATE TYPE "PartyType" AS ENUM ('INDIVIDUAL', 'BUSINESS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "IDType" AS ENUM ('PASSPORT', 'NATIONAL_ID', 'BUSINESS_REGISTRY', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "KYCStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add all missing Party columns
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "partyType" "PartyType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "idType" "IDType";
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "idNumber" TEXT;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "poaRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "kycStatus" "KYCStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "kycDocumentUrls" TEXT[] DEFAULT '{}';
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "invitationStatus" "InvitationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "invitationToken" TEXT;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP(3);

-- Create unique index on invitationToken if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "Party_invitationToken_key" ON "Party"("invitationToken");

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Party_invitationToken_idx" ON "Party"("invitationToken");
CREATE INDEX IF NOT EXISTS "Party_invitationStatus_idx" ON "Party"("invitationStatus");
