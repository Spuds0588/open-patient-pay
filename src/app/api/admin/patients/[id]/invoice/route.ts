import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  description: z.string().min(1, "Description is required."),
  amountCents: z.number().int().positive("Amount must be positive."),
  dueAt: z.string().optional(),
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
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber: parsed.data.invoiceNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An invoice with that number already exists." },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: patient.organizationId,
        patientId: patient.id,
        invoiceNumber: parsed.data.invoiceNumber,
        description: parsed.data.description,
        totalCents: parsed.data.amountCents,
        issuedAt: new Date(),
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      },
    });
    return NextResponse.json({ invoice });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not add invoice." },
      { status: 400 }
    );
  }
}
