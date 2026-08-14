import Stripe from "stripe";
import { config } from "@/lib/config";
import { recordSuccessfulPayment } from "@/core/services";

export const dynamic = "force-dynamic";

/**
 * FR-4: securely ingest Stripe webhooks and reconcile payments into the ledger.
 * Reconciliation is idempotent (keyed on the payment intent id), so duplicate
 * deliveries are safe.
 */
export async function POST(request: Request) {
  if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
    return new Response("Webhooks not configured (no Stripe credentials).", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = new Stripe(config.stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};
    const paymentIntent =
      typeof session.payment_intent === "string" ? session.payment_intent : null;

    if (metadata.patientId && paymentIntent && session.amount_total && session.amount_total > 0) {
      await recordSuccessfulPayment({
        patientId: metadata.patientId,
        invoiceId: metadata.invoiceId ?? null,
        planId: metadata.planId ?? null,
        installmentIndex:
          metadata.installmentIndex != null ? Number(metadata.installmentIndex) : null,
        amountCents: session.amount_total,
        externalRef: paymentIntent,
        description: "Payment via Stripe checkout",
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
