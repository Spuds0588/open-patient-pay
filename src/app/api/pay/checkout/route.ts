import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutForInstallment } from "@/lib/payments";

const schema = z.object({
  patientToken: z.string().min(1),
  planId: z.string().min(1),
  installmentIndex: z.number().int().min(0),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const { url } = await createCheckoutForInstallment(parsed.data);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start checkout." },
      { status: 400 }
    );
  }
}
