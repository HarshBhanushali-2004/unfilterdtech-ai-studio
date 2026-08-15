-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "CarouselSlideMediaType" AS ENUM ('IMAGE', 'VIDEO', 'NO_MEDIA');

-- CreateEnum
CREATE TYPE "MediaAssetSource" AS ENUM ('USER_PROVIDED', 'SOURCE_MEDIA', 'GEMINI', 'LOCAL_AI', 'FREE_API', 'PAID_PROVIDER');

-- CreateEnum
CREATE TYPE "MediaLicenseStatus" AS ENUM ('USER_PROVIDED', 'OFFICIAL_SOURCE', 'LICENSED', 'PUBLIC_DOMAIN', 'PERMITTED', 'UNKNOWN', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "MediaResolutionStatus" AS ENUM ('PENDING', 'RESOLVING', 'RENDERING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Creation" ADD COLUMN     "carouselPlanId" TEXT;

-- CreateTable
CREATE TABLE "CarouselPlan" (
    "id" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "plannerId" TEXT,
    "brandKitId" TEXT,
    "data" JSONB NOT NULL,
    "model" TEXT DEFAULT 'Gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarouselPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "source" "MediaAssetSource" NOT NULL,
    "licenseStatus" "MediaLicenseStatus" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "mimeType" TEXT,
    "provider" TEXT,
    "attribution" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarouselSlideMedia" (
    "id" TEXT NOT NULL,
    "carouselPlanId" TEXT NOT NULL,
    "slideOrder" INTEGER NOT NULL,
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

    CONSTRAINT "CarouselSlideMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarouselPlan_planKey_key" ON "CarouselPlan"("planKey");

-- CreateIndex
CREATE INDEX "CarouselPlan_plannerId_idx" ON "CarouselPlan"("plannerId");

-- CreateIndex
CREATE INDEX "CarouselSlideMedia_carouselPlanId_idx" ON "CarouselSlideMedia"("carouselPlanId");

-- CreateIndex
CREATE INDEX "CarouselSlideMedia_mediaAssetId_idx" ON "CarouselSlideMedia"("mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "CarouselSlideMedia_carouselPlanId_slideOrder_key" ON "CarouselSlideMedia"("carouselPlanId", "slideOrder");

-- CreateIndex
CREATE INDEX "Creation_carouselPlanId_idx" ON "Creation"("carouselPlanId");

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_carouselPlanId_fkey" FOREIGN KEY ("carouselPlanId") REFERENCES "CarouselPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarouselPlan" ADD CONSTRAINT "CarouselPlan_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "Planner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarouselSlideMedia" ADD CONSTRAINT "CarouselSlideMedia_carouselPlanId_fkey" FOREIGN KEY ("carouselPlanId") REFERENCES "CarouselPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarouselSlideMedia" ADD CONSTRAINT "CarouselSlideMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
