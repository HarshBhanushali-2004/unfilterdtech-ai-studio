-- AlterTable
ALTER TABLE "Creation" ADD COLUMN     "plannerId" TEXT,
ADD COLUMN     "qualityScore" JSONB,
ADD COLUMN     "suggestions" JSONB;

-- CreateTable
CREATE TABLE "Planner" (
    "id" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "researchId" TEXT,
    "brandKitId" TEXT,
    "tone" TEXT,
    "creativity" INTEGER,
    "data" JSONB NOT NULL,
    "model" TEXT DEFAULT 'Gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Planner_planKey_key" ON "Planner"("planKey");

-- CreateIndex
CREATE INDEX "Planner_researchId_idx" ON "Planner"("researchId");

-- CreateIndex
CREATE INDEX "Creation_plannerId_idx" ON "Creation"("plannerId");

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "Planner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planner" ADD CONSTRAINT "Planner_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE SET NULL ON UPDATE CASCADE;
