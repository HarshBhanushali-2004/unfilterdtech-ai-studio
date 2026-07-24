-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('POST', 'CAROUSEL', 'STORY', 'REEL');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "tone" TEXT,
    "creativity" INTEGER,
    "caption" TEXT NOT NULL,
    "hashtags" JSONB,
    "carousel" JSONB,
    "story" JSONB,
    "reel" JSONB,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Creation_projectId_idx" ON "Creation"("projectId");

-- CreateIndex
CREATE INDEX "Creation_createdAt_idx" ON "Creation"("createdAt");

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
