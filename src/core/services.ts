import { randomBytes } from "node:crypto";
import { prisma } from "@/db/client";
import type { InvoiceRow, PatientRow } from "@/adapters/interfaces";
import { addDays, buildSchedule, splitEvenly, termMonths, type PeriodUnit } from "./engine";
import { config } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { netAppliedCents, outstandingCents } from "./ledger";

// ---------------------------------------------------------------------------
// Organization (singleton multi-tenancy — see master document rule #2)
// ---------------------------------------------------------------------------

export async function getOrCreateOrganization() {
  const existing = await prisma.organization.findFirst();
  if (existing) return existing;
  return prisma.organization.create({
    data: { name: process.env.APP_NAME ?? "My Clinic", slug: "default" },
  });
}

// ---------------------------------------------------------------------------
// Patients & invoices (CSV import)
// ---------------------------------------------------------------------------

async function newPayToken(): Promise<string> {
  // 18-char URL-safe token; unpredictable, so the portal link doubles as auth.
  for (let i = 0; i < 5; i++) {
    const token = randomBytes(13).toString("base64url");
    const exists = await prisma.patient.findUnique({ where: { payToken: token } });
    if (!exists) return token;
  }
  throw new Error("Could not generate a unique portal token.");
}

export async function ensurePatient(
  orgId: string,
  row: PatientRow
): Promise<{ patient: { id: string }; created: boolean }> {
  const existing = await prisma.patient.findFirst({
    where: { organizationId: orgId, externalId: row.externalId },
  });
  if (existing) {
    return { patient: existing, created: false };
  }
  const patient = await prisma.patient.create({
    data: {
      organizationId: orgId,
      externalId: row.externalId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      payToken: await newPayToken(),
    },
  });
  return { patient, created: true };
}

export interface ImportSummary {
  patientsCreated: number;
  patientsUpdated: number;
  invoicesCreated: number;
  invoicesSkipped: number;
}

export async function importRows(
  orgId: string,
  patients: PatientRow[],
  invoices: InvoiceRow[]
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    patientsCreated: 0,
    patientsUpdated: 0,
    invoicesCreated: 0,
    invoicesSkipped: 0,
  };

  for (const row of patients) {
    const { created } = await ensurePatient(orgId, row);
    if (created) summary.patientsCreated++;
    else summary.patientsUpdated++;
  }

  for (const inv of invoices) {
    const patient = await prisma.patient.findFirst({
      where: { organizationId: orgId, externalId: inv.patientExternalId },
    });
    if (!patient) {
      summary.invoicesSkipped++;
      continue;
    }
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber: inv.invoiceNumber } });
    if (existing) {
      summary.invoicesSkipped++;
      continue;
    }
    await prisma.invoice.create({
      data: {
        organizationId: orgId,
        patientId: patient.id,
        invoiceNumber: inv.invoiceNumber,
        description: inv.description,
        totalCents: inv.amountCents,
        issuedAt: inv.issuedAt,
        dueAt: inv.dueAt,
      },
    });
    summary.invoicesCreated++;
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Installment plans (FR-2)
// ---------------------------------------------------------------------------

export interface CreatePlanInput {
  patientId: string;
  invoiceId: string;
  count: number;
  periodUnit: PeriodUnit;
  periodValue: number;
  firstPaymentAt?: Date;
}

export class PlanValidationError extends Error {}

/**
 * Create an installment plan, enforcing the provider's configured limits
 * (PLAN_MAX_PAYMENTS, PLAN_MIN_PAYMENT_CENTS, PLAN_MAX_MONTHS, allowed units,
 * custom-date window). Throws PlanValidationError with a user-facing message.
 */
export async function createInstallmentPlan(input: CreatePlanInput) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new PlanValidationError("Invoice not found.");
  if (invoice.patientId !== input.patientId) {
    throw new PlanValidationError("Invoice does not belong to this patient.");
  }

  const existing = await prisma.installmentPlan.findUnique({ where: { invoiceId: invoice.id } });
  if (existing) throw new PlanValidationError("This invoice already has an installment plan.");

  const limits = config.planLimits;
  const { count, periodUnit, periodValue } = input;

  if (!Number.isInteger(count) || count < 1 || count > limits.maxPayments) {
    throw new PlanValidationError(`Number of payments must be between 1 and ${limits.maxPayments}.`);
  }
  if (!limits.allowedUnits.includes(periodUnit)) {
    throw new PlanValidationError(
      `Period unit "${periodUnit}" is not allowed by this practice.`
    );
  }
  if (!Number.isInteger(periodValue) || periodValue < 1) {
    throw new PlanValidationError("Period interval must be at least 1.");
  }
  if (termMonths(periodUnit, periodValue, count) > limits.maxMonths) {
    throw new PlanValidationError(
      `This plan would exceed the maximum length of ${limits.maxMonths} months.`
    );
  }

  if (count > 1) {
    const perPayment = splitEvenly(invoice.totalCents, count);
    if (perPayment.some((a) => a < limits.minPaymentCents)) {
      throw new PlanValidationError(
        `Each payment must be at least ${formatCents(limits.minPaymentCents)}. Increase the number of payments or the balance.`
      );
    }
  }

  const now = new Date();
  let firstPaymentAt = now;
  if (input.firstPaymentAt) {
    if (!limits.allowCustomDate) {
      throw new PlanValidationError("Choosing a first-payment date is not enabled.");
    }
    const requested = new Date(input.firstPaymentAt);
    if (Number.isNaN(requested.getTime())) throw new PlanValidationError("Invalid first-payment date.");
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (requested < today) throw new PlanValidationError("First payment date cannot be in the past.");
    const maxDate = addDays(now, limits.firstPaymentWindowDays);
    if (requested > maxDate) {
      throw new PlanValidationError(
        `First payment must be within ${limits.firstPaymentWindowDays} days.`
      );
    }
    firstPaymentAt = requested;
  }

  const schedule = buildSchedule({
    totalCents: invoice.totalCents,
    count,
    periodUnit,
    periodValue,
    firstPaymentAt,
  });

  const plan = await prisma.installmentPlan.create({
    data: {
      organizationId: invoice.organizationId,
      patientId: invoice.patientId,
      invoiceId: invoice.id,
      count,
      periodUnit,
      periodValue,
      totalCents: invoice.totalCents,
      firstPaymentAt,
      status: "ACTIVE",
      installments: {
        create: schedule.lines.map((line) => ({
          organizationId: invoice.organizationId,
          index: line.index,
          amountCents: line.amountCents,
          dueDate: line.dueDate,
          status: "SCHEDULED",
        })),
      },
    },
    include: { installments: { orderBy: { index: "asc" } } },
  });

  return plan;
}

// ---------------------------------------------------------------------------
// Payments (append-only ledger)
// ---------------------------------------------------------------------------

export interface RecordPaymentInput {
  patientId: string;
  invoiceId?: string | null;
  planId?: string | null;
  installmentIndex?: number | null;
  amountCents: number;
  externalRef: string;
  description: string;
}

/**
 * Append a SUCCEEDED payment to the ledger and mark the matching installment
 * paid. Idempotent by `externalRef` so duplicate webhooks are safe.
 */
export async function recordSuccessfulPayment(input: RecordPaymentInput) {
  const existing = await prisma.transaction.findUnique({
    where: { externalRef: input.externalRef },
  });
  if (existing) return { transaction: existing, alreadyRecorded: true };

  const transaction = await prisma.transaction.create({
    data: {
      organizationId: (await prisma.patient.findUniqueOrThrow({
        where: { id: input.patientId },
        select: { organizationId: true },
      })).organizationId,
      patientId: input.patientId,
      invoiceId: input.invoiceId ?? null,
      type: "PAYMENT",
      status: "SUCCEEDED",
      amountCents: input.amountCents,
      externalRef: input.externalRef,
      description: input.description,
    },
  });

  if (input.planId && input.installmentIndex != null) {
    const installment = await prisma.installment.findUnique({
      where: {
        planId_index: { planId: input.planId, index: input.installmentIndex },
      },
    });
    if (installment) {
      await prisma.installment.update({
        where: { id: installment.id },
        data: { status: "PAID", transactionId: transaction.id },
      });
      await updatePlanStatus(input.planId);
    }
  }

  return { transaction, alreadyRecorded: false };
}

async function updatePlanStatus(planId: string) {
  const plan = await prisma.installmentPlan.findUnique({
    where: { id: planId },
    include: { installments: true },
  });
  if (!plan) return;
  const allPaid = plan.installments.every((i) => i.status === "PAID");
  if (allPaid && plan.status !== "COMPLETED") {
    await prisma.installmentPlan.update({
      where: { id: planId },
      data: { status: "COMPLETED" },
    });
  }
}

/** Record a manual adjustment/refund (still append-only — a new row, never an edit). */
export async function recordAdjustment(input: {
  patientId: string;
  invoiceId?: string | null;
  amountCents: number; // negative = reduces balance (write-off/refund), positive = added charge
  description: string;
  externalRef?: string;
}) {
  return prisma.transaction.create({
    data: {
      organizationId: (await prisma.patient.findUniqueOrThrow({
        where: { id: input.patientId },
        select: { organizationId: true },
      })).organizationId,
      patientId: input.patientId,
      invoiceId: input.invoiceId ?? null,
      type: "ADJUSTMENT",
      status: "SUCCEEDED",
      amountCents: input.amountCents,
      externalRef: input.externalRef ?? null,
      description: input.description,
    },
  });
}

// ---------------------------------------------------------------------------
// Balance aggregation
// ---------------------------------------------------------------------------

export interface PatientBalance {
  billedCents: number;
  appliedCents: number;
  outstandingCents: number;
}

export async function computePatientBalance(patientId: string): Promise<PatientBalance> {
  const invoices = await prisma.invoice.findMany({
    where: { patientId },
    select: { totalCents: true },
  });
  const transactions = await prisma.transaction.findMany({
    where: { patientId },
    select: { amountCents: true, status: true },
  });
  const billedCents = invoices.reduce((a, i) => a + i.totalCents, 0);
  const appliedCents = netAppliedCents(transactions);
  return { billedCents, appliedCents, outstandingCents: outstandingCents(billedCents, transactions) };
}
