import { NextResponse } from "next/server";
import { z } from "zod";
import { createPatientManually, getOrCreateOrganization } from "@/core/services";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  externalId: z.string().optional().or(z.literal("")),
  invoice: z
    .object({
      invoiceNumber: z.string().min(1),
      description: z.string().min(1),
      amountCents: z.number().int().min(1),
      dueAt: z.string().optional(),
    })
    .optional(),
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
    const org = await getOrCreateOrganization();
    const { patient, invoice } = await createPatientManually(org.id, {
      patient: {
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
        externalId: parsed.data.externalId || undefined,
      },
      invoice: parsed.data.invoice
        ? {
            invoiceNumber: parsed.data.invoice.invoiceNumber,
            description: parsed.data.invoice.description,
            amountCents: parsed.data.invoice.amountCents,
            dueAt: parsed.data.invoice.dueAt ? new Date(parsed.data.invoice.dueAt) : undefined,
          }
        : undefined,
    });
    return NextResponse.json({
      patient: { id: patient.id, name: patient.name, payToken: patient.payToken },
      invoiceCreated: Boolean(invoice),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not add patient." },
      { status: 400 }
    );
  }
}
