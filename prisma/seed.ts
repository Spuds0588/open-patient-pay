import { CsvIngestionAdapter } from "../src/adapters";
import {
  createInstallmentPlan,
  getOrCreateOrganization,
  importRows,
  recordSuccessfulPayment,
} from "../src/core/services";
import { prisma } from "../src/db/client";
import { SAMPLE_CSV } from "../src/lib/sample-csv";

async function main() {
  console.log("Seeding Open Patient Pay…");

  // 1. Singleton organization (multi-tenant ready, single-org in V1).
  const org = await getOrCreateOrganization();
  console.log(`Organization: ${org.name} (${org.id})`);

  // 2. Ingest the sample billing export through the real CSV adapter.
  const adapter = new CsvIngestionAdapter();
  const { patients, invoices } = adapter.parse(SAMPLE_CSV);
  const summary = await importRows(org.id, patients, invoices);
  console.log(
    `Imported: ${summary.patientsCreated} patients created, ${summary.invoicesCreated} invoices created.`
  );

  // 3. Give Marcus a 6-month plan with the first installment already paid.
  const marcus = await prisma.patient.findFirstOrThrow({ where: { externalId: "MRN-1001" } });
  const marcusInvoice = await prisma.invoice.findFirstOrThrow({
    where: { patientId: marcus.id, invoiceNumber: "INV-1001" },
  });

  const existingPlan = await prisma.installmentPlan.findUnique({
    where: { invoiceId: marcusInvoice.id },
  });
  if (!existingPlan) {
    const plan = await createInstallmentPlan({
      patientId: marcus.id,
      invoiceId: marcusInvoice.id,
      count: 6,
      periodUnit: "MONTH",
      periodValue: 1,
    });
    const first = plan.installments[0];
    await recordSuccessfulPayment({
      patientId: marcus.id,
      invoiceId: marcusInvoice.id,
      planId: plan.id,
      installmentIndex: 0,
      amountCents: first.amountCents,
      externalRef: "pi_seed_marcus_1",
      description: "First installment (seed)",
    });
    console.log(`Created 6-month plan for Marcus Chen; first installment paid.`);
  }

  // 4. Give Diego a 12-month plan (fresh, nothing paid yet).
  const diego = await prisma.patient.findFirstOrThrow({ where: { externalId: "MRN-1003" } });
  const diegoInvoice = await prisma.invoice.findFirstOrThrow({
    where: { patientId: diego.id, invoiceNumber: "INV-1003" },
  });
  const diegoPlan = await prisma.installmentPlan.findUnique({ where: { invoiceId: diegoInvoice.id } });
  if (!diegoPlan) {
    await createInstallmentPlan({
      patientId: diego.id,
      invoiceId: diegoInvoice.id,
      count: 12,
      periodUnit: "MONTH",
      periodValue: 1,
    });
    console.log(`Created 12-month plan for Diego Ramirez.`);
  }

  console.log("Seed complete. ✅");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
