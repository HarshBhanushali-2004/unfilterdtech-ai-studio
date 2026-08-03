-- CreateEnum
CREATE TYPE "ImageGenerationStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL,
    "visualPromptId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ImageGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "imageUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "promptText" TEXT,
    "promptVersion" TEXT,
    "generationTimeMs" INTEGER,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "seed" TEXT,
    "cost" DOUBLE PRECISION,
    "generationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedImage_visualPromptId_idx" ON "GeneratedImage"("visualPromptId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedImage_visualPromptId_slot_key" ON "GeneratedImage"("visualPromptId", "slot");

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_visualPromptId_fkey" FOREIGN KEY ("visualPromptId") REFERENCES "VisualPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
