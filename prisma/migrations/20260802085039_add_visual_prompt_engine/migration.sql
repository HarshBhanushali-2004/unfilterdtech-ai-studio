-- AlterTable
ALTER TABLE "Creation" ADD COLUMN     "visualPromptId" TEXT;

-- CreateTable
CREATE TABLE "VisualPrompt" (
    "id" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "plannerId" TEXT,
    "brandKitId" TEXT,
    "data" JSONB NOT NULL,
    "model" TEXT DEFAULT 'Gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisualPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisualPrompt_promptKey_key" ON "VisualPrompt"("promptKey");

-- CreateIndex
CREATE INDEX "VisualPrompt_plannerId_idx" ON "VisualPrompt"("plannerId");

-- CreateIndex
CREATE INDEX "Creation_visualPromptId_idx" ON "Creation"("visualPromptId");

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_visualPromptId_fkey" FOREIGN KEY ("visualPromptId") REFERENCES "VisualPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualPrompt" ADD CONSTRAINT "VisualPrompt_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "Planner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
