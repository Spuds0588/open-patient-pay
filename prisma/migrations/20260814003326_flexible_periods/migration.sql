/*
  Warnings:

  - You are about to drop the column `downPaymentCents` on the `InstallmentPlan` table. All the data in the column will be lost.
  - You are about to drop the column `frequency` on the `InstallmentPlan` table. All the data in the column will be lost.
  - You are about to drop the column `startsOn` on the `InstallmentPlan` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PeriodUnit" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- AlterTable
ALTER TABLE "InstallmentPlan" DROP COLUMN "downPaymentCents",
DROP COLUMN "frequency",
DROP COLUMN "startsOn",
ADD COLUMN     "firstPaymentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "periodUnit" "PeriodUnit" NOT NULL DEFAULT 'MONTH',
ADD COLUMN     "periodValue" INTEGER NOT NULL DEFAULT 1;

-- DropEnum
DROP TYPE "InstallmentFrequency";
