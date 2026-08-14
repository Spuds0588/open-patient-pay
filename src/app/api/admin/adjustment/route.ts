import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdjustment } from "@/core/services";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  patientId: z.string().min(1),
  invoiceId: z.string().min(1).optional(),
  // Signed integer cents. Negative = write-off/refund, positive = added charge.
  amountCents: z.number().int().refine((v) => v !== 0, "amountCents must be non-zero"),
  description: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const tx = await recordAdjustment(parsed.data);
    return NextResponse.json({ transaction: tx });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Adjustment failed." },
      { status: 400 }
    );
  }
}
