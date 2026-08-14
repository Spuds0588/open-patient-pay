import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { createInstallmentPlan, PlanValidationError } from "@/core/services";

const schema = z.object({
  patientToken: z.string().min(1),
  invoiceId: z.string().min(1),
  count: z.number().int().min(1).max(120),
  periodUnit: z.enum(["DAY", "WEEK", "MONTH"]),
  periodValue: z.number().int().min(1).max(120),
  firstPaymentAt: z.string().optional(),
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

    const patient = await prisma.patient.findUnique({
      where: { payToken: parsed.data.patientToken },
    });
    if (!patient) {
      return NextResponse.json({ error: "Portal link is invalid." }, { status: 404 });
    }

    const plan = await createInstallmentPlan({
      patientId: patient.id,
      invoiceId: parsed.data.invoiceId,
      count: parsed.data.count,
      periodUnit: parsed.data.periodUnit,
      periodValue: parsed.data.periodValue,
      firstPaymentAt: parsed.data.firstPaymentAt
        ? new Date(parsed.data.firstPaymentAt)
        : undefined,
    });

    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof PlanValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create plan." },
      { status: 400 }
    );
  }
}
