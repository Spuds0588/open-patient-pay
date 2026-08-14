import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { config } from "@/lib/config";
import { statementBodyRows, statementEmail, reminderEmail } from "@/lib/emails";
import { sendPatientEmail } from "@/lib/mailer";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  patientIds: z.array(z.string().min(1)).min(1, "Select at least one patient."),
  kind: z.enum(["statement", "reminder"]),
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

    const patients = await prisma.patient.findMany({
      where: { id: { in: parsed.data.patientIds }, email: { not: null } },
      include: {
        invoices: {
          include: { transactions: { where: { status: "SUCCEEDED" }, select: { amountCents: true } } },
        },
      },
    });

    const results: { patientId: string; name: string; sent: boolean; preview?: unknown }[] = [];
    for (const patient of patients) {
      const billed = patient.invoices.reduce((a, i) => a + i.totalCents, 0);
      const applied = patient.invoices.reduce(
        (a, i) => a + i.transactions.reduce((x, t) => x + t.amountCents, 0),
        0
      );
      const outstanding = Math.max(0, billed - applied);
      if (outstanding <= 0) continue; // never email a zero balance

      const portalUrl = `${config.baseUrl}/pay/${patient.payToken}`;
      let subject = "";
      let html = "";
      let kind: "BULK_STATEMENT" | "BULK_REMINDER" = "BULK_STATEMENT";

      if (parsed.data.kind === "statement") {
        const mapped = patient.invoices.map((i) => ({
          invoiceNumber: i.invoiceNumber,
          description: i.description,
          outstandingCents: Math.max(
            0,
            i.totalCents - i.transactions.reduce((x, t) => x + t.amountCents, 0)
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
        kind = "BULK_REMINDER";
        subject = `Friendly reminder — ${config.appName}`;
        html = reminderEmail({
          patientName: patient.name,
          installmentNumber: 1,
          amountCents: outstanding,
          dueDate: new Date(),
          portalUrl,
        });
      }

      const result = await sendPatientEmail({
        patientId: patient.id,
        kind,
        to: patient.email!,
        subject,
        html,
      });
      results.push({
        patientId: patient.id,
        name: patient.name,
        sent: result.sent,
        preview: result.preview ?? undefined,
      });
    }

    return NextResponse.json({
      ok: true,
      attempted: results.length,
      sent: results.filter((r) => r.sent).length,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send bulk emails." },
      { status: 400 }
    );
  }
}
