-- AlterTable
ALTER TABLE "BrandKit" ADD COLUMN     "bodyFont" TEXT DEFAULT 'Inter',
ADD COLUMN     "darkLogoUrl" TEXT,
ADD COLUMN     "headingFont" TEXT DEFAULT 'Inter',
ADD COLUMN     "iconStyle" TEXT DEFAULT 'outline',
ADD COLUMN     "layoutStyle" TEXT DEFAULT 'bottom-aligned',
ADD COLUMN     "logoPosition" TEXT DEFAULT 'bottom-right',
ADD COLUMN     "overlayOpacity" INTEGER DEFAULT 45,
ADD COLUMN     "safeMargin" INTEGER DEFAULT 5,
ADD COLUMN     "secondaryLogoUrl" TEXT,
ADD COLUMN     "textStyle" TEXT DEFAULT 'bold',
ADD COLUMN     "watermarkEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watermarkLogoUrl" TEXT,
ADD COLUMN     "whiteLogoUrl" TEXT;
