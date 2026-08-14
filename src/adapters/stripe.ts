import Stripe from "stripe";
import type {
  CheckoutSessionDetails,
  CheckoutSessionResult,
  CreateCheckoutInput,
  PaymentAdapter,
} from "./interfaces";

/** Live Stripe adapter (FR-3). Requires STRIPE_SECRET_KEY. */
export class StripePaymentAdapter implements PaymentAdapter {
  readonly mode = "stripe" as const;
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: input.patientEmail ?? undefined,
      line_items: input.lineItems.map((li) => ({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: li.amountCents,
          product_data: { name: li.description },
        },
      })),
      metadata: input.metadata,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    return { id: session.id, url: session.url };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionDetails> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

    let status: CheckoutSessionDetails["status"];
    switch (session.status) {
      case "complete":
        status = "complete";
        break;
      case "expired":
        status = "expired";
        break;
      case "open":
        status = "open";
        break;
      default:
        status = "failed";
    }

    return {
      id: session.id,
      paymentIntentId: paymentIntent,
      amountCents: session.amount_total,
      status,
      metadata: session.metadata ?? {},
    };
  }
}

// --- Stateless mock ----------------------------------------------------------
// The mock is *stateless* (NFR-4): the entire session payload is encoded into
// the session id, so reconcile works across requests and server restarts. Every
// mock payment "succeeds".

function encodeMockSession(input: CreateCheckoutInput): string {
  const payload = {
    amountCents: input.lineItems.reduce((a, li) => a + li.amountCents, 0),
    metadata: input.metadata,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeMockSession(id: string): { amountCents: number; metadata: Record<string, string> } {
  const raw = id.replace(/^cs_mock_/, "");
  return JSON.parse(Buffer.from(raw, "base64url").toString());
}

export class MockPaymentAdapter implements PaymentAdapter {
  readonly mode = "mock" as const;

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult> {
    const id = `cs_mock_${encodeMockSession(input)}`;
    // Mirror Stripe's `{CHECKOUT_SESSION_ID}` substitution behavior.
    const url = input.successUrl
      .replace("{CHECKOUT_SESSION_ID}", encodeURIComponent(id))
      .concat(`&mock=1`);
    return { id, url };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionDetails> {
    const data = decodeMockSession(sessionId);
    return {
      id: sessionId,
      paymentIntentId: `pi_mock_${sessionId.replace(/^cs_mock_/, "").slice(0, 24)}`,
      amountCents: data.amountCents,
      status: "complete",
      metadata: data.metadata,
    };
  }
}
