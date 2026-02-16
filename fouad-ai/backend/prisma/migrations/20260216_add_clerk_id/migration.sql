-- AlterTable: Add clerkId column to User table
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;

-- CreateIndex: Add unique constraint and index on clerkId
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");
