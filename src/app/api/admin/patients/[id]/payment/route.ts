import { NextResponse } from "next/server";
import { z } from "zod";
import { recordManualPayment } from "@/core/services";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  amountCents: z.number().int().positive("Amount must be positive."),
  invoiceId: z.string().optional(),
  planId: z.string().optional(),
  installmentIndex: z.number().int().min(0).optional(),
  description: z.string().min(1, "Description is required."),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { transaction } = await recordManualPayment({
      patientId: id,
      invoiceId: parsed.data.invoiceId ?? null,
      planId: parsed.data.planId ?? null,
      installmentIndex: parsed.data.installmentIndex ?? null,
      amountCents: parsed.data.amountCents,
      description: parsed.data.description,
    });
    return NextResponse.json({ transaction });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not record payment." },
      { status: 400 }
    );
  }
}
