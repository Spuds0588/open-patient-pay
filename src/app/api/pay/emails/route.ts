import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { config } from "@/lib/config";
import { reminderEmail, receiptEmail, statementBodyRows, statementEmail } from "@/lib/emails";
import { sendPatientEmail } from "@/lib/mailer";
import { formatCents } from "@/lib/money";

const schema = z.object({
  patientToken: z.string().min(1),
  kind: z.enum(["receipt", "statement", "reminder"]),
  planId: z.string().optional(),
  installmentIndex: z.number().int().min(0).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { payToken: parsed.data.patientToken },
    });
    if (!patient) return NextResponse.json({ error: "Portal link is invalid." }, { status: 404 });
    if (!patient.email) {
      return NextResponse.json(
        { error: "No email address on file. Contact the billing team to add one." },
        { status: 400 }
      );
    }

    const portalUrl = `${config.baseUrl}/pay/${patient.payToken}`;
    let subject = "";
    let html = "";

    if (parsed.data.kind === "receipt") {
      const tx = await prisma.transaction.findFirst({
        where: { patientId: patient.id, status: "SUCCEEDED", type: "PAYMENT" },
        include: { invoice: true },
        orderBy: { occurredAt: "desc" },
      });
      if (!tx) return NextResponse.json({ error: "No payment found to receipt." }, { status: 400 });
      subject = `Payment receipt — ${formatCents(tx.amountCents)}`;
      html = receiptEmail({
        patientName: patient.name,
        invoiceNumber: tx.invoice?.invoiceNumber ?? "—",
        description: tx.description,
        amountCents: tx.amountCents,
        paidAt: tx.occurredAt,
      });
    } else if (parsed.data.kind === "statement") {
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
      // reminder
      if (!parsed.data.planId || parsed.data.installmentIndex == null) {
        return NextResponse.json(
          { error: "A plan and installment are required for a reminder." },
          { status: 400 }
        );
      }
      const inst = await prisma.installment.findUnique({
        where: { planId_index: { planId: parsed.data.planId, index: parsed.data.installmentIndex } },
        include: { plan: true },
      });
      if (!inst) return NextResponse.json({ error: "Installment not found." }, { status: 400 });
      subject = `Payment reminder — ${formatCents(inst.amountCents)}`;
      html = reminderEmail({
        patientName: patient.name,
        installmentNumber: inst.index + 1,
        amountCents: inst.amountCents,
        dueDate: inst.dueDate,
        portalUrl,
      });
    }

    const kind = (() => {
      switch (parsed.data.kind) {
        case "receipt":
          return "RECEIPT" as const;
        case "statement":
          return "STATEMENT" as const;
        default:
          return "REMINDER" as const;
      }
    })();
    const result = await sendPatientEmail({
      patientId: patient.id,
      kind,
      to: patient.email,
      subject,
      html,
    });
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
