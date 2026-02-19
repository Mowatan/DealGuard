-- AlterTable
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "creatorId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_creatorId_idx" ON "Deal"("creatorId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Deal_creatorId_fkey'
  ) THEN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
