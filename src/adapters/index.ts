import { config, isStripeConfigured } from "@/lib/config";
import type { PaymentAdapter } from "./interfaces";
import { MockPaymentAdapter, StripePaymentAdapter } from "./stripe";

export function getPaymentAdapter(): PaymentAdapter {
  return isStripeConfigured()
    ? new StripePaymentAdapter(config.stripeSecretKey)
    : new MockPaymentAdapter();
}

export * from "./interfaces";
export { CsvIngestionAdapter } from "./csv";
export { MockPaymentAdapter, StripePaymentAdapter } from "./stripe";
