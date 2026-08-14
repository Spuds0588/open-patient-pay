-- Magic-link auth, reminder opt-in, and billing contact info.

-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN "billingEmail" TEXT,
ADD COLUMN "billingPhone" TEXT;

-- AlterTable Patient
ALTER TABLE "Patient" ADD COLUMN "magicToken" TEXT,
ADD COLUMN "magicTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "remindersEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_magicToken_key" ON "Patient"("magicToken");
