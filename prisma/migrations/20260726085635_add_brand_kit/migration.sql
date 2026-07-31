-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "brandKitId" TEXT;

-- CreateTable
CREATE TABLE "BrandKit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "targetAudience" TEXT,
    "language" TEXT DEFAULT 'English',
    "tone" TEXT,
    "writingStyle" TEXT,
    "emojiStyle" TEXT,
    "ctaStyle" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "keywords" TEXT[],
    "hashtags" TEXT[],
    "avoidWords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_brandKitId_idx" ON "Project"("brandKitId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_brandKitId_fkey" FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
