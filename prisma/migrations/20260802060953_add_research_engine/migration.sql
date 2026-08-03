-- AlterTable
ALTER TABLE "Creation" ADD COLUMN     "researchId" TEXT;

-- CreateTable
CREATE TABLE "Research" (
    "id" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "model" TEXT DEFAULT 'Gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Research_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Research_topicKey_key" ON "Research"("topicKey");

-- CreateIndex
CREATE INDEX "Creation_researchId_idx" ON "Creation"("researchId");

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE SET NULL ON UPDATE CASCADE;
