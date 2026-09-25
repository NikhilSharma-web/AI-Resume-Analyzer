-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loginOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "loginOtpHash" TEXT;
