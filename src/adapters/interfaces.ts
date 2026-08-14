// FR-3: strict adapter interfaces isolate every external dependency behind a
// TypeScript contract. Swapping Stripe for another processor, or the CSV
// import for a FHIR feed, is a new adapter implementing the same interface.

export interface CheckoutLineItem {
  description: string;
  amountCents: number;
}

export interface CreateCheckoutInput {
  patientName: string;
  patientEmail?: string | null;
  lineItems: CheckoutLineItem[];
  /** Arbitrary metadata persisted on the session for webhook reconciliation. */
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string | null;
}

export interface CheckoutSessionDetails {
  id: string;
  paymentIntentId: string | null;
  amountCents: number | null;
  status: "complete" | "open" | "expired" | "failed";
  metadata: Record<string, string>;
}

/** Abstraction over a payment processor (Stripe today, others later). */
export interface PaymentAdapter {
  readonly mode: "stripe" | "mock";
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult>;
  /** Resolve a checkout session for reconciliation after the user returns. */
  retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionDetails>;
}

/** Abstraction over a bulk data ingestion source. */
export interface DataIngestionAdapter<TRow> {
  parse(input: string): TRow;
}

/** Normalized patient row produced by an ingestion adapter. */
export interface PatientRow {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
}

/** Normalized invoice row produced by an ingestion adapter. */
export interface InvoiceRow {
  patientExternalId: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  issuedAt: Date;
  dueAt?: Date;
}
