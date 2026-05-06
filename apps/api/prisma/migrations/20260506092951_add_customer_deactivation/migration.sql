-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "deactivateReason" TEXT,
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedBy" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
