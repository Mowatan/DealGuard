-- CreateEnums (if not exist)
DO $$ BEGIN
 CREATE TYPE "AssetType" AS ENUM ('SHARES', 'REAL_ESTATE', 'GOODS', 'SERVICES', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "SettlementMethod" AS ENUM ('BANK_TRANSFER', 'INSTAPAY', 'CASH', 'CHEQUE', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "FeesPaidBy" AS ENUM ('BUYER', 'SELLER', 'SPLIT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add all missing Deal columns
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "assetType" "AssetType";
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT NOT NULL DEFAULT 'EG';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'EGP';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(15,2);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "settlementMethod" "SettlementMethod";
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "feesPaidBy" "FeesPaidBy";
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "allPartiesConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "description" TEXT;
