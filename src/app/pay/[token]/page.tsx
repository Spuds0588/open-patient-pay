import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanSelector, PayInstallmentButton } from "@/components/pay/actions";
import { getPatientPortalData } from "@/lib/queries";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PatientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPatientPortalData(token);

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">This link isn&apos;t valid</h1>
        <p className="max-w-md text-muted-foreground">
          The portal link may have expired or been regenerated. Please contact your provider&apos;s
          billing office for a new link.
        </p>
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Back to Open Patient Pay
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              OP
            </span>
            <span className="font-semibold">Open Patient Pay</span>
          </div>
          <span className="text-sm text-muted-foreground">{data.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div>
          <p className="text-sm text-muted-foreground">Hello, {data.name.split(" ")[0]} 👋</p>
          <h1 className="text-3xl font-bold">Your medical bill</h1>
          <p className="mt-2 text-muted-foreground">
            Review your charges below and choose a plan that works for you. No hidden convenience
            fees — ever.
          </p>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex items-end justify-between p-6">
            <div>
              <p className="text-sm opacity-80">Total balance</p>
              <p className="text-4xl font-bold">{formatCents(data.totalOutstandingCents)}</p>
              {data.totalOutstandingCents < data.totalBilledCents && (
                <p className="mt-1 text-sm opacity-80">
                  {formatCents(data.totalBilledCents - data.totalOutstandingCents)} already paid
                </p>
              )}
            </div>
            <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground">
              {data.invoices.length} invoice{data.invoices.length !== 1 ? "s" : ""}
            </Badge>
          </CardContent>
        </Card>

        {data.invoices.map((inv) => {
          const plan = inv.plan;
          return (
            <Card key={inv.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{inv.description}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Invoice {inv.invoiceNumber} · issued {formatDate(inv.issuedAt)}
                      {inv.dueAt ? ` · due ${formatDate(inv.dueAt)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCents(inv.outstandingCents)}</p>
                    <p className="text-xs text-muted-foreground">
                      of {formatCents(inv.totalCents)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {plan ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Payment plan: {plan.count}{" "}
                      {plan.count === 1 ? "payment" : "payments"}, every{" "}
                      {plan.periodValue}{" "}
                      {plan.periodUnit.toLowerCase()}
                      {plan.periodValue > 1 ? "s" : ""}{" "}
                      · first payment {formatDate(plan.firstPaymentAt)}
                    </p>
                    <ul className="divide-y rounded-lg border">
                      {plan.installments.map((inst) => {
                        const overdue =
                          inst.status === "SCHEDULED" && new Date(inst.dueDate) < new Date();
                        return (
                          <li
                            key={inst.id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {inst.index === 0 ? "First payment" : `Payment #${inst.index + 1}`}
                              </span>
                              <span className="ml-2 text-muted-foreground">
                                {formatDate(inst.dueDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatCents(inst.amountCents)}</span>
                              {inst.status === "PAID" ? (
                                <Badge variant="success">Paid</Badge>
                              ) : overdue ? (
                                <Badge variant="destructive">Overdue</Badge>
                              ) : (
                                <PayInstallmentButton
                                  patientToken={token}
                                  planId={plan.id}
                                  installmentIndex={inst.index}
                                  amountCents={inst.amountCents}
                                />
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <PlanSelector
                    patientToken={token}
                    invoiceId={inv.id}
                    totalCents={inv.outstandingCents}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}

        <footer className="pb-8 text-center text-xs text-muted-foreground">
          Questions about this bill? Contact your provider&apos;s billing office directly. Open
          Patient Pay never stores your card number.
        </footer>
      </main>
    </div>
  );
}
