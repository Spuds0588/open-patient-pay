import Link from "next/link";
import { prisma } from "@/db/client";
import { EmailActions, PrintButton } from "@/components/pay/portal-actions";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StatementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const patient = await prisma.patient.findUnique({
    where: { payToken: token },
    include: {
      organization: true,
      invoices: {
        include: {
          transactions: { where: { status: "SUCCEEDED" }, orderBy: { occurredAt: "asc" } },
        },
        orderBy: { issuedAt: "asc" },
      },
    },
  });

  if (!patient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Statement not found</h1>
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  const allApplied = patient.invoices.flatMap((i) => i.transactions);
  const billed = patient.invoices.reduce((a, i) => a + i.totalCents, 0);
  const paid = allApplied.reduce((a, t) => a + t.amountCents, 0);
  const outstanding = Math.max(0, billed - paid);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/pay/${token}`} className="text-sm text-primary hover:underline">
            ← Back to my bill
          </Link>
          <div className="flex gap-2">
            <PrintButton />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h1 className="text-xl font-bold">{patient.organization.name}</h1>
              <p className="text-sm text-muted-foreground">
                Patient statement · {formatDate(new Date())}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{patient.name}</p>
              {patient.email && <p className="text-muted-foreground">{patient.email}</p>}
              {patient.phone && <p className="text-muted-foreground">{patient.phone}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                Statement prepared by {patient.organization.name}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Invoices &amp; payments
            </h2>
            {patient.invoices.map((inv) => (
              <div key={inv.id} className="mb-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {inv.invoiceNumber} — {inv.description}
                  </p>
                  <p className="font-semibold">{formatCents(inv.totalCents)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Issued {formatDate(inv.issuedAt)}
                  {inv.dueAt ? ` · due ${formatDate(inv.dueAt)}` : ""}
                </p>
                {inv.transactions.length > 0 ? (
                  <table className="mt-2 w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-1">Date</th>
                        <th className="py-1">Description</th>
                        <th className="py-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.transactions.map((t) => (
                        <tr key={t.id} className="border-b">
                          <td className="py-1">{formatDate(t.occurredAt)}</td>
                          <td className="py-1">{t.description}</td>
                          <td className="py-1 text-right font-medium">
                            {formatCents(t.amountCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No payments applied.</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total billed</span>
              <span>{formatCents(billed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total paid</span>
              <span>{formatCents(paid)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Balance outstanding</span>
              <span>{formatCents(outstanding)}</span>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-muted p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Questions about this statement?</p>
            <p>
              Contact {patient.organization.name} billing:{" "}
              {patient.organization.billingEmail ?? "—"}
              {patient.organization.billingPhone
                ? ` or ${patient.organization.billingPhone}`
                : ""}
            </p>
          </div>
        </div>

        <div className="mt-6 print:hidden">
          <EmailActions patientToken={token} />
        </div>
      </div>
    </div>
  );
}
