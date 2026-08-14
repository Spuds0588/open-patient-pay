import type { PeriodUnit } from "@/core/engine";

// Centralized runtime configuration. Every high-level feature is gated by an
// environment variable so the same codebase serves self-hosted V1 and the
// future multi-tenant SaaS (see "Open Core" rules in the master document).

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function units(name: string, fallback: PeriodUnit[]): PeriodUnit[] {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is PeriodUnit => s === "DAY" || s === "WEEK" || s === "MONTH");
}

export const config = {
  appName: process.env.APP_NAME ?? "Open Patient Pay",

  // Open-core feature toggles.
  enableClinicRegistration: bool("ENABLE_CLINIC_REGISTRATION", false),
  enablePatientPortal: bool("ENABLE_PATIENT_PORTAL", true),
  enableAutoDebit: bool("ENABLE_AUTO_DEBIT", true),

  // Payments. When a Stripe secret key is absent, the app runs in "mock mode"
  // so the full flow can be exercised without live credentials.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  mockPayments: bool("MOCK_PAYMENTS", false),

  baseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",

  // --- Email (magic links, receipts, reminders) ---
  // Without SMTP the app runs in mock-mail mode: nothing is sent, and callers
  // surface a preview (great for local dev and the demo).
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: int("SMTP_PORT", 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  smtpSecure: bool("SMTP_SECURE", false),

  // --- Billing contact shown to patients (call/email buttons) ---
  billingEmail: process.env.BILLING_EMAIL ?? "billing@example.com",
  billingPhone: process.env.BILLING_PHONE ?? "",

  // --- Auth ---
  magicLinkTtlMinutes: int("MAGIC_LINK_TTL_MINUTES", 15),

  // --- Installment plan limits (the provider controls what patients may do) ---
  planLimits: {
    /** Patients may define their own period (unit + interval + count) beyond the presets. */
    allowCustomPeriods: bool("PLAN_ALLOW_CUSTOM_PERIODS", true),
    /** Patients may pick the date their first payment is processed. */
    allowCustomDate: bool("PLAN_ALLOW_CUSTOM_DATE", true),
    /** Minimum amount per payment (cents). Applies to multi-payment plans. */
    minPaymentCents: int("PLAN_MIN_PAYMENT_CENTS", 1000),
    /** Maximum number of payments in a plan. */
    maxPayments: int("PLAN_MAX_PAYMENTS", 48),
    /** Maximum total plan length, in months. */
    maxMonths: int("PLAN_MAX_MONTHS", 60),
    /** How far in the future the first payment may be scheduled (days). */
    firstPaymentWindowDays: int("PLAN_FIRST_PAYMENT_WINDOW_DAYS", 60),
    /** Which period units patients may choose. */
    allowedUnits: units("PLAN_ALLOWED_PERIOD_UNITS", ["DAY", "WEEK", "MONTH"]),
  },
} as const;

export function isStripeConfigured(): boolean {
  return config.stripeSecretKey.length > 0 && !config.mockPayments;
}

export function paymentsUseMock(): boolean {
  return config.mockPayments || !isStripeConfigured();
}
