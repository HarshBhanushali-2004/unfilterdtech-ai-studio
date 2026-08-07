-- CreateEnum
CREATE TYPE "CreationStatus" AS ENUM ('DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Creation" ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "status" "CreationStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Creation_status_idx" ON "Creation"("status");
