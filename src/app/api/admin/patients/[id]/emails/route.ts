import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { config } from "@/lib/config";
import { reminderEmail, statementBodyRows, statementEmail } from "@/lib/emails";
import { sendMail } from "@/lib/mailer";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  kind: z.enum(["reminder", "statement"]),
  planId: z.string().optional(),
  installmentIndex: z.number().int().min(0).optional(),
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
    if (!patient.email) {
      return NextResponse.json({ error: "Patient has no email on file." }, { status: 400 });
    }

    const portalUrl = `${config.baseUrl}/pay/${patient.payToken}`;
    let subject = "";
    let html = "";

    if (parsed.data.kind === "statement") {
      const invoices = await prisma.invoice.findMany({
        where: { patientId: patient.id },
        include: { transactions: { where: { status: "SUCCEEDED" }, select: { amountCents: true } } },
      });
      const mapped = invoices.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        description: i.description,
        outstandingCents: Math.max(
          0,
          i.totalCents - i.transactions.reduce((a, t) => a + t.amountCents, 0)
        ),
      }));
      subject = `Your statement — ${config.appName}`;
      html = statementEmail({
        patientName: patient.name,
        portalUrl,
        bodyRows: statementBodyRows(mapped),
        totalOutstandingCents: mapped.reduce((a, i) => a + i.outstandingCents, 0),
      });
    } else {
      if (!parsed.data.planId || parsed.data.installmentIndex == null) {
        return NextResponse.json(
          { error: "A plan and installment are required for a reminder." },
          { status: 400 }
        );
      }
      const inst = await prisma.installment.findUnique({
        where: { planId_index: { planId: parsed.data.planId, index: parsed.data.installmentIndex } },
      });
      if (!inst) return NextResponse.json({ error: "Installment not found." }, { status: 400 });
      subject = `Payment reminder — ${config.appName}`;
      html = reminderEmail({
        patientName: patient.name,
        installmentNumber: inst.index + 1,
        amountCents: inst.amountCents,
        dueDate: inst.dueDate,
        portalUrl,
      });
    }

    const result = await sendMail({ to: patient.email, subject, html });
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      preview: result.preview ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email." },
      { status: 400 }
    );
  }
}
