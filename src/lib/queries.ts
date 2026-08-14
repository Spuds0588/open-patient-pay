import { prisma } from "@/db/client";
import { collectionRate } from "@/core/ledger";
import { formatCents } from "@/lib/money";

// All monetary fields are computed server-side; nothing here is trusted from
// the client. Return plain JSON-serializable shapes for server components.

export async function getDashboardMetrics() {
  const [invoices, transactions, patients, plans, overdueInstallments] = await Promise.all([
    prisma.invoice.findMany({ select: { totalCents: true } }),
    prisma.transaction.findMany({
      where: { status: "SUCCEEDED" },
      select: { amountCents: true },
    }),
    prisma.patient.count(),
    prisma.installmentPlan.count({ where: { status: "ACTIVE" } }),
    prisma.installment.count({
      where: { status: "SCHEDULED", dueDate: { lt: new Date() } },
    }),
  ]);

  const billedCents = invoices.reduce((a, i) => a + i.totalCents, 0);
  const collectedCents = transactions.reduce((a, t) => a + t.amountCents, 0);
  const outstandingCents = Math.max(0, billedCents - collectedCents);

  return {
    billedCents,
    collectedCents,
    outstandingCents,
    collectionRate: collectionRate(
      billedCents,
      transactions.map((t) => ({ amountCents: t.amountCents, status: "SUCCEEDED" as const }))
    ),
    patientCount: patients,
    activePlanCount: plans,
    overdueInstallmentCount: overdueInstallments,
    invoiceCount: invoices.length,
  };
}

export async function getPatientsWithBalances() {
  const patients = await prisma.patient.findMany({
    include: {
      invoices: { select: { totalCents: true } },
      transactions: { where: { status: "SUCCEEDED" }, select: { amountCents: true } },
      _count: { select: { plans: true } },
    },
    orderBy: { name: "asc" },
  });

  return patients.map((p) => {
    const billed = p.invoices.reduce((a, i) => a + i.totalCents, 0);
    const collected = p.transactions.reduce((a, t) => a + t.amountCents, 0);
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      payToken: p.payToken,
      externalId: p.externalId,
      billedCents: billed,
      outstandingCents: Math.max(0, billed - collected),
      planCount: p._count.plans,
    };
  });
}

export async function getPlans() {
  const plans = await prisma.installmentPlan.findMany({
    include: {
      patient: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true, totalCents: true } },
      installments: { orderBy: { index: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return plans.map((p) => {
    const paid = p.installments.filter((i) => i.status === "PAID").length;
    return {
      id: p.id,
      patientId: p.patientId,
      patientName: p.patient.name,
      invoiceNumber: p.invoice.invoiceNumber,
      totalCents: p.totalCents,
      count: p.count,
      periodUnit: p.periodUnit,
      periodValue: p.periodValue,
      firstPaymentAt: p.firstPaymentAt.toISOString(),
      status: p.status,
      paidCount: paid,
      overdueCount: p.installments.filter(
        (i) => i.status === "SCHEDULED" && i.dueDate.getTime() < Date.now()
      ).length,
      installments: p.installments.map((i) => ({
        id: i.id,
        index: i.index,
        amountCents: i.amountCents,
        dueDate: i.dueDate.toISOString(),
        status: i.status,
      })),
    };
  });
}

export async function getLedger(limit = 100) {
  const txs = await prisma.transaction.findMany({
    include: { patient: { select: { name: true } } },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  return txs.map((t) => ({
    id: t.id,
    type: t.type,
    status: t.status,
    amountCents: t.amountCents,
    amountDisplay: formatCents(t.amountCents, { sign: true }),
    description: t.description,
    patientName: t.patient.name,
    externalRef: t.externalRef,
    occurredAt: t.occurredAt.toISOString(),
  }));
}

export async function getPatientPortalData(payToken: string) {
  const patient = await prisma.patient.findUnique({
    where: { payToken },
    include: {
      invoices: {
        include: {
          plan: { include: { installments: { orderBy: { index: "asc" } } } },
          transactions: { where: { status: "SUCCEEDED" }, select: { amountCents: true } },
        },
      },
    },
  });

  if (!patient) return null;

  const invoices = patient.invoices.map((inv) => {
    const applied = inv.transactions.reduce((a, t) => a + t.amountCents, 0);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      description: inv.description,
      totalCents: inv.totalCents,
      outstandingCents: Math.max(0, inv.totalCents - applied),
      issuedAt: inv.issuedAt.toISOString(),
      dueAt: inv.dueAt?.toISOString() ?? null,
      hasPlan: Boolean(inv.plan),
      plan: inv.plan
        ? {
            id: inv.plan.id,
            count: inv.plan.count,
            periodUnit: inv.plan.periodUnit,
            periodValue: inv.plan.periodValue,
            firstPaymentAt: inv.plan.firstPaymentAt.toISOString(),
            status: inv.plan.status,
            installments: inv.plan.installments.map((i) => ({
              id: i.id,
              index: i.index,
              amountCents: i.amountCents,
              dueDate: i.dueDate.toISOString(),
              status: i.status,
            })),
          }
        : null,
    };
  });

  const totalBilled = invoices.reduce((a, i) => a + i.totalCents, 0);
  const totalOutstanding = invoices.reduce((a, i) => a + i.outstandingCents, 0);

  const org = await prisma.organization.findUnique({ where: { id: patient.organizationId } });

  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    phone: patient.phone,
    remindersEnabled: patient.remindersEnabled,
    payToken: patient.payToken,
    totalBilledCents: totalBilled,
    totalOutstandingCents: totalOutstanding,
    billingContact: {
      email: org?.billingEmail ?? null,
      phone: org?.billingPhone ?? null,
    },
    invoices,
  };
}

/** Full drill-down for the admin patient page: balances, invoices, ledger, plans. */
export async function getPatientDetail(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      invoices: {
        include: {
          transactions: { where: { status: "SUCCEEDED" }, select: { amountCents: true } },
          plan: { include: { installments: { orderBy: { index: "asc" } } } },
        },
        orderBy: { issuedAt: "desc" },
      },
      transactions: {
        include: { invoice: { select: { invoiceNumber: true } } },
        orderBy: { occurredAt: "desc" },
        take: 200,
      },
      plans: { include: { installments: { orderBy: { index: "asc" } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!patient) return null;

  const billed = patient.invoices.reduce((a, i) => a + i.totalCents, 0);
  const applied = patient.transactions.reduce((a, t) => a + t.amountCents, 0);

  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    phone: patient.phone,
    externalId: patient.externalId,
    payToken: patient.payToken,
    remindersEnabled: patient.remindersEnabled,
    createdAt: patient.createdAt.toISOString(),
    billedCents: billed,
    appliedCents: applied,
    outstandingCents: Math.max(0, billed - applied),
    invoices: patient.invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      description: i.description,
      totalCents: i.totalCents,
      outstandingCents: Math.max(
        0,
        i.totalCents - i.transactions.reduce((a, t) => a + t.amountCents, 0)
      ),
      issuedAt: i.issuedAt.toISOString(),
      dueAt: i.dueAt?.toISOString() ?? null,
      hasPlan: Boolean(i.plan),
      plan: i.plan
        ? {
            id: i.plan.id,
            count: i.plan.count,
            periodUnit: i.plan.periodUnit,
            periodValue: i.plan.periodValue,
            status: i.plan.status,
            installments: i.plan.installments.map((x) => ({
              id: x.id,
              index: x.index,
              amountCents: x.amountCents,
              dueDate: x.dueDate.toISOString(),
              status: x.status,
            })),
          }
        : null,
    })),
    transactions: patient.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      amountCents: t.amountCents,
      description: t.description,
      invoiceNumber: t.invoice?.invoiceNumber ?? null,
      externalRef: t.externalRef,
      occurredAt: t.occurredAt.toISOString(),
    })),
    plans: patient.plans.map((pl) => ({
      id: pl.id,
      invoiceId: pl.invoiceId,
      count: pl.count,
      periodUnit: pl.periodUnit,
      periodValue: pl.periodValue,
      status: pl.status,
      totalCents: pl.totalCents,
      firstPaymentAt: pl.firstPaymentAt.toISOString(),
      installments: pl.installments.map((x) => ({
        id: x.id,
        index: x.index,
        amountCents: x.amountCents,
        dueDate: x.dueDate.toISOString(),
        status: x.status,
      })),
    })),
  };
}
