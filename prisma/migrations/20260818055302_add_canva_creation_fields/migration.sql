-- CreateEnum
CREATE TYPE "CanvaSyncStatus" AS ENUM ('NOT_LINKED', 'IMPORTING', 'EDITING', 'EXPORTING', 'SYNCED', 'FAILED');

-- AlterTable
ALTER TABLE "Creation" ADD COLUMN     "canvaDesignId" TEXT,
ADD COLUMN     "canvaEditUrl" TEXT,
ADD COLUMN     "canvaLastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "canvaSyncStatus" "CanvaSyncStatus" NOT NULL DEFAULT 'NOT_LINKED',
ADD COLUMN     "canvaViewUrl" TEXT;

-- CreateIndex
CREATE INDEX "Creation_canvaSyncStatus_idx" ON "Creation"("canvaSyncStatus");
