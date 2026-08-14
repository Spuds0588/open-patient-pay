import { getPaymentAdapter } from "@/adapters";
import { prisma } from "@/db/client";
import { recordSuccessfulPayment } from "@/core/services";
import { config } from "./config";

export async function createCheckoutForInstallment(params: {
  patientToken: string;
  planId: string;
  installmentIndex: number;
}): Promise<{ url: string }> {
  const patient = await prisma.patient.findUnique({ where: { payToken: params.patientToken } });
  if (!patient) throw new Error("Patient portal link is invalid.");

  const plan = await prisma.installmentPlan.findUnique({
    where: { id: params.planId },
    include: { invoice: true, installments: { orderBy: { index: "asc" } } },
  });
  if (!plan || plan.patientId !== patient.id) throw new Error("Plan not found for this patient.");

  const installment = plan.installments.find((i) => i.index === params.installmentIndex);
  if (!installment) throw new Error("Installment not found.");
  if (installment.status === "PAID") throw new Error("This installment is already paid.");

  const amountCents = installment.amountCents;

  const baseUrl = config.baseUrl;
  const successUrl = `${baseUrl}/pay/${patient.payToken}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/pay/${patient.payToken}`;

  const adapter = getPaymentAdapter();
  const session = await adapter.createCheckoutSession({
    patientName: patient.name,
    patientEmail: patient.email,
    lineItems: [
      {
        description: `Payment ${params.installmentIndex + 1} of ${plan.count} — ${plan.invoice.invoiceNumber}`,
        amountCents,
      },
    ],
    metadata: {
      patientId: patient.id,
      invoiceId: plan.invoiceId,
      planId: plan.id,
      installmentIndex: String(params.installmentIndex),
      payToken: patient.payToken,
    },
    successUrl,
    cancelUrl,
  });

  if (!session.url) throw new Error("Payment provider returned no checkout URL.");
  return { url: session.url };
}

export interface ReconcileResult {
  status: "complete" | "open" | "expired" | "failed" | "unknown";
  recorded: boolean;
  alreadyRecorded: boolean;
  error?: string;
}

export async function reconcileCheckoutSession(sessionId: string): Promise<ReconcileResult> {
  const adapter = getPaymentAdapter();
  try {
    const session = await adapter.retrieveCheckoutSession(sessionId);

    if (session.status !== "complete") {
      return { status: session.status, recorded: false, alreadyRecorded: false };
    }

    const { patientId, invoiceId, planId, installmentIndex } = session.metadata;
    if (!patientId) {
      return { status: "complete", recorded: false, alreadyRecorded: false, error: "No patient metadata." };
    }

    const amountCents = session.amountCents;
    if (amountCents == null || amountCents <= 0) {
      return { status: "complete", recorded: false, alreadyRecorded: false, error: "No amount on session." };
    }

    const externalRef = session.paymentIntentId ?? session.id;
    const { alreadyRecorded } = await recordSuccessfulPayment({
      patientId,
      invoiceId: invoiceId ?? null,
      planId: planId ?? null,
      installmentIndex: installmentIndex != null ? Number(installmentIndex) : null,
      amountCents,
      externalRef,
      description: `Payment via ${adapter.mode === "mock" ? "mock" : "Stripe"} checkout`,
    });

    return { status: "complete", recorded: true, alreadyRecorded };
  } catch (err) {
    return {
      status: "unknown",
      recorded: false,
      alreadyRecorded: false,
      error: err instanceof Error ? err.message : "Unknown reconciliation error.",
    };
  }
}
