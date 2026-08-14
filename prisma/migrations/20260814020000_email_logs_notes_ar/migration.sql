-- AR workflows: email audit log, patient notes/call log, collections status.
-- (Hand-written because prisma migrate dev needs interactivity for new enums.)

CREATE TYPE "ArStatus" AS ENUM ('ACTIVE', 'IN_COLLECTIONS');
CREATE TYPE "NoteKind" AS ENUM ('NOTE', 'CALL', 'COLLECTIONS', 'INSURANCE');
CREATE TYPE "EmailKind" AS ENUM ('MAGIC_LINK', 'PORTAL_LINK', 'RECEIPT', 'STATEMENT', 'REMINDER', 'BULK_STATEMENT', 'BULK_REMINDER');
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'MOCKED', 'FAILED');

ALTER TABLE "Patient"
  ADD COLUMN "arStatus" "ArStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "insuranceCarrier" TEXT;

CREATE TABLE "EmailLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "kind" "EmailKind" NOT NULL,
  "to" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "EmailStatus" NOT NULL DEFAULT 'MOCKED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientNote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "kind" "NoteKind" NOT NULL DEFAULT 'NOTE',
  "body" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailLog_organizationId_idx" ON "EmailLog"("organizationId");
CREATE INDEX "EmailLog_patientId_idx" ON "EmailLog"("patientId");
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
CREATE INDEX "PatientNote_organizationId_idx" ON "PatientNote"("organizationId");
CREATE INDEX "PatientNote_patientId_idx" ON "PatientNote"("patientId");
CREATE INDEX "PatientNote_createdAt_idx" ON "PatientNote"("createdAt");

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
