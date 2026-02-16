-- CreateEnum (if not exists)
DO $$ BEGIN
 CREATE TYPE "TransactionType" AS ENUM ('SIMPLE', 'MILESTONE_BASED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add missing transactionType column
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "transactionType" "TransactionType" NOT NULL DEFAULT 'SIMPLE';
