import { NextResponse } from "next/server";
import { config } from "@/lib/config";

// Read-only, non-sensitive configuration the patient portal needs to render
// plan options and enforce limits client-side. The server re-validates every
// plan creation regardless of what this returns.
export async function GET() {
  return NextResponse.json({
    planLimits: {
      ...config.planLimits,
      minPaymentDollars: (config.planLimits.minPaymentCents / 100).toFixed(2),
    },
    mockPayments: config.mockPayments || !config.stripeSecretKey,
    enablePatientPortal: config.enablePatientPortal,
  });
}
