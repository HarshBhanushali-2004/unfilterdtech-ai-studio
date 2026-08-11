-- AlterEnum
ALTER TYPE "ConnectionStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "ConnectedAccount" ADD COLUMN     "connectedAt" TIMESTAMP(3);
