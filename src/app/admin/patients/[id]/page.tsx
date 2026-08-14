import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyLink } from "@/components/copy-link";
import { PatientActions } from "@/components/admin/patient-actions";
import { getPatientDetail } from "@/lib/queries";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusVariant(s: string): "success" | "warning" | "secondary" | "destructive" {
  if (s === "PAID" || s === "COMPLETED") return "success";
  if (s === "SCHEDULED" || s === "ACTIVE") return "secondary";
  if (s === "OVERDUE" || s === "FAILED") return "destructive";
  return "warning";
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPatientDetail(id);

  if (!p) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Patient not found</h1>
        <Button asChild variant="outline">
          <Link href="/admin/patients">← Back to patients</Link>
        </Button>
      </div>
    );
  }

  const overdue = p.plans.flatMap((pl) =>
    pl.installments.filter((i) => i.status === "SCHEDULED" && new Date(i.dueDate) < new Date())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/patients" className="text-sm text-primary hover:underline">
            ← Patients
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{p.name}</h1>
          <p className="text-sm text-muted-foreground">
            {p.email ?? "no email"} {p.email && p.phone ? " · " : ""} {p.phone ?? "no phone"}
            {p.externalId ? ` · ${p.externalId}` : ""} · patient since{" "}
            {formatDate(p.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyLink token={p.payToken} />
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${p.phone ?? ""}`} className={p.phone ? "" : "pointer-events-none opacity-50"}>
              📞 Call patient
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${p.email ?? ""}`} className={p.email ? "" : "pointer-events-none opacity-50"}>
              ✉️ Email patient
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCents(p.billedCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-700">{formatCents(p.appliedCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCents(p.outstandingCents)}</p>
          </CardContent>
        </Card>
      </div>

      <PatientActions
        patientId={p.id}
        patientName={p.name}
        patientEmail={p.email}
        patientPhone={p.phone}
        invoices={p.invoices.map((i) => ({ id: i.id, label: `${i.invoiceNumber} — ${formatCents(i.outstandingCents)} outstanding` }))}
      />

      {overdue.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive">
              ⚠️ {overdue.length} overdue installment{overdue.length > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {overdue.map((o) => (
                <li key={o.id} className="flex justify-between">
                  <span className="text-muted-foreground">Payment #{o.index + 1}</span>
                  <span>
                    {formatCents(o.amountCents)} · due {formatDate(o.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {p.invoices.length === 0 && (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            )}
            {p.invoices.map((inv) => (
              <div key={inv.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {inv.invoiceNumber} — {inv.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      issued {formatDate(inv.issuedAt)}
                      {inv.dueAt ? ` · due ${formatDate(inv.dueAt)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCents(inv.outstandingCents)}</p>
                    <p className="text-xs text-muted-foreground">of {formatCents(inv.totalCents)}</p>
                  </div>
                </div>
                {inv.plan && (
                  <div className="mt-2 rounded-md bg-muted p-2 text-xs">
                    <p className="mb-1 font-medium">
                      Plan: {inv.plan.count} payments every {inv.plan.periodValue}{" "}
                      {inv.plan.periodUnit.toLowerCase()}
                      {inv.plan.periodValue > 1 ? "s" : ""} · {inv.plan.status}
                    </p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {inv.plan.installments.map((i) => {
                        const isOverdue =
                          i.status === "SCHEDULED" && new Date(i.dueDate) < new Date();
                        return (
                          <li key={i.id} className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              #{i.index + 1} · {formatDate(i.dueDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              {formatCents(i.amountCents)}
                              <Badge variant={isOverdue ? "destructive" : statusVariant(i.status)}>
                                {isOverdue ? "overdue" : i.status.toLowerCase()}
                              </Badge>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            {p.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="divide-y">
                {p.transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          t.type === "PAYMENT"
                            ? "success"
                            : t.type === "REFUND"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {t.type}
                      </Badge>
                      <span className="text-muted-foreground">{t.description}</span>
                      {t.invoiceNumber && (
                        <span className="text-xs text-muted-foreground">({t.invoiceNumber})</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-medium ${t.amountCents >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {formatCents(t.amountCents, { sign: true })}
                      </span>
                      <p className="text-xs text-muted-foreground">{formatDate(t.occurredAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
