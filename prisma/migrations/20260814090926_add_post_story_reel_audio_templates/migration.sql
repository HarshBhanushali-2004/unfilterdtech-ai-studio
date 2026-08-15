-- CreateEnum
CREATE TYPE "AudioAssetSource" AS ENUM ('USER_PROVIDED', 'LICENSED_LIBRARY', 'ROYALTY_FREE', 'ORIGINAL_VIDEO_AUDIO', 'UNKNOWN');

-- AlterTable
ALTER TABLE "BrandKit" ADD COLUMN     "templateFamilyId" TEXT DEFAULT 'editorial-tech';

-- AlterTable
ALTER TABLE "Creation" ADD COLUMN     "audioAssetId" TEXT,
ADD COLUMN     "postPlanId" TEXT,
ADD COLUMN     "reelPlanId" TEXT,
ADD COLUMN     "storyPlanId" TEXT;

-- CreateTable
CREATE TABLE "PostPlan" (
    "id" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "plannerId" TEXT,
    "brandKitId" TEXT,
    "data" JSONB NOT NULL,
    "model" TEXT DEFAULT 'Gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMedia" (
    "id" TEXT NOT NULL,
    "postPlanId" TEXT NOT NULL,
    "mediaType" "CarouselSlideMediaType" NOT NULL,
    "mediaAssetId" TEXT,
    "renderedImageUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "status" "MediaResolutionStatus" NOT NULL DEFAULT 'PENDING',
    "resolutionPath" TEXT,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryPlan" (
    "id" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "plannerId" TEXT,
    "brandKitId" TEXT,
    "data" JSONB NOT NULL,
    "model" TEXT DEFAULT 'Gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryFrameMedia" (
    "id" TEXT NOT NULL,
    "storyPlanId" TEXT NOT NULL,
    "frameOrder" INTEGER NOT NULL,
    "mediaType" "CarouselSlideMediaType" NOT NULL,
    "mediaAssetId" TEXT,
    "renderedImageUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "status" "MediaResolutionStatus" NOT NULL DEFAULT 'PENDING',
    "resolutionPath" TEXT,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryFrameMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelPlan" (
    "id" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "plannerId" TEXT,
    "brandKitId" TEXT,
    "data" JSONB NOT NULL,
    "model" TEXT DEFAULT 'Gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReelPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelSceneMedia" (
    "id" TEXT NOT NULL,
    "reelPlanId" TEXT NOT NULL,
    "sceneOrder" INTEGER NOT NULL,
    "mediaType" "CarouselSlideMediaType" NOT NULL,
    "mediaAssetId" TEXT,
    "renderedImageUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "status" "MediaResolutionStatus" NOT NULL DEFAULT 'PENDING',
    "resolutionPath" TEXT,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReelSceneMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "source" "AudioAssetSource" NOT NULL,
    "licenseStatus" "MediaLicenseStatus" NOT NULL,
    "provider" TEXT,
    "title" TEXT,
    "artist" TEXT,
    "mood" TEXT,
    "duration" INTEGER,
    "url" TEXT,
    "attribution" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostPlan_planKey_key" ON "PostPlan"("planKey");

-- CreateIndex
CREATE INDEX "PostPlan_plannerId_idx" ON "PostPlan"("plannerId");

-- CreateIndex
CREATE UNIQUE INDEX "PostMedia_postPlanId_key" ON "PostMedia"("postPlanId");

-- CreateIndex
CREATE INDEX "PostMedia_mediaAssetId_idx" ON "PostMedia"("mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryPlan_planKey_key" ON "StoryPlan"("planKey");

-- CreateIndex
CREATE INDEX "StoryPlan_plannerId_idx" ON "StoryPlan"("plannerId");

-- CreateIndex
CREATE INDEX "StoryFrameMedia_storyPlanId_idx" ON "StoryFrameMedia"("storyPlanId");

-- CreateIndex
CREATE INDEX "StoryFrameMedia_mediaAssetId_idx" ON "StoryFrameMedia"("mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryFrameMedia_storyPlanId_frameOrder_key" ON "StoryFrameMedia"("storyPlanId", "frameOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ReelPlan_planKey_key" ON "ReelPlan"("planKey");

-- CreateIndex
CREATE INDEX "ReelPlan_plannerId_idx" ON "ReelPlan"("plannerId");

-- CreateIndex
CREATE INDEX "ReelSceneMedia_reelPlanId_idx" ON "ReelSceneMedia"("reelPlanId");

-- CreateIndex
CREATE INDEX "ReelSceneMedia_mediaAssetId_idx" ON "ReelSceneMedia"("mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "ReelSceneMedia_reelPlanId_sceneOrder_key" ON "ReelSceneMedia"("reelPlanId", "sceneOrder");

-- CreateIndex
CREATE INDEX "Creation_postPlanId_idx" ON "Creation"("postPlanId");

-- CreateIndex
CREATE INDEX "Creation_storyPlanId_idx" ON "Creation"("storyPlanId");

-- CreateIndex
CREATE INDEX "Creation_reelPlanId_idx" ON "Creation"("reelPlanId");

-- CreateIndex
CREATE INDEX "Creation_audioAssetId_idx" ON "Creation"("audioAssetId");

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_postPlanId_fkey" FOREIGN KEY ("postPlanId") REFERENCES "PostPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_storyPlanId_fkey" FOREIGN KEY ("storyPlanId") REFERENCES "StoryPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_reelPlanId_fkey" FOREIGN KEY ("reelPlanId") REFERENCES "ReelPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "AudioAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPlan" ADD CONSTRAINT "PostPlan_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "Planner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postPlanId_fkey" FOREIGN KEY ("postPlanId") REFERENCES "PostPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPlan" ADD CONSTRAINT "StoryPlan_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "Planner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryFrameMedia" ADD CONSTRAINT "StoryFrameMedia_storyPlanId_fkey" FOREIGN KEY ("storyPlanId") REFERENCES "StoryPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryFrameMedia" ADD CONSTRAINT "StoryFrameMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelPlan" ADD CONSTRAINT "ReelPlan_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "Planner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelSceneMedia" ADD CONSTRAINT "ReelSceneMedia_reelPlanId_fkey" FOREIGN KEY ("reelPlanId") REFERENCES "ReelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelSceneMedia" ADD CONSTRAINT "ReelSceneMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
