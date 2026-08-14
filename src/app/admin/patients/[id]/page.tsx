import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Phone,
  Mail,
  CircleDollarSign,
  CheckCircle2,
  TriangleAlert,
  CreditCard,
  FileText,
  History,
  MailCheck,
  StickyNote,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyLink } from "@/components/copy-link";
import { RecordActions } from "@/components/admin/record-actions";
import { getPatientDetail } from "@/lib/queries";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const NOTE_KIND_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
  NOTE: { label: "Note", icon: <StickyNote className="h-3.5 w-3.5" /> },
  CALL: { label: "Call logged", icon: <Phone className="h-3.5 w-3.5" /> },
  COLLECTIONS: { label: "Collections", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  INSURANCE: { label: "Insurance", icon: <MailCheck className="h-3.5 w-3.5" /> },
};

const EMAIL_KIND_LABEL: Record<string, string> = {
  MAGIC_LINK: "Portal link",
  PORTAL_LINK: "Portal link",
  RECEIPT: "Receipt",
  STATEMENT: "Statement",
  REMINDER: "Reminder",
  BULK_STATEMENT: "Bulk statement",
  BULK_REMINDER: "Bulk reminder",
};

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
  const inCollections = p.arStatus === "IN_COLLECTIONS";

  return (
    <div className="space-y-6">
      {/* Record header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/patients" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Patients
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{p.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              {inCollections && <Badge variant="destructive">In collections</Badge>}
              {p.insuranceCarrier && <Badge variant="secondary">Ins: {p.insuranceCarrier}</Badge>}
              {p.outstandingCents === 0 ? (
                <Badge variant="success">Paid in full</Badge>
              ) : p.plans.some((pl) => pl.status === "ACTIVE") ? (
                <Badge variant="secondary">On a plan</Badge>
              ) : (
                <Badge variant="warning">No plan</Badge>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.email ?? "no email"} {p.email && p.phone ? " · " : ""} {p.phone ?? "no phone"}
            {p.externalId ? ` · ${p.externalId}` : ""} · patient since {formatDate(p.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${p.phone ?? ""}`} className={p.phone ? "" : "pointer-events-none opacity-50"}>
              <Phone className="h-4 w-4" /> Call
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${p.email ?? ""}`} className={p.email ? "" : "pointer-events-none opacity-50"}>
              <Mail className="h-4 w-4" /> Email
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/pay/${p.payToken}`} target="_blank" rel="noopener">
              <CreditCard className="h-4 w-4" /> Open portal
            </a>
          </Button>
          <CopyLink token={p.payToken} />
        </div>
      </div>

      {/* Balance strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CircleDollarSign className="h-4 w-4" /> Billed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCents(p.billedCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" /> Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-700">{formatCents(p.appliedCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <TriangleAlert className="h-4 w-4" /> Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCents(p.outstandingCents)}</p>
          </CardContent>
        </Card>
      </div>

      {overdue.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <TriangleAlert className="h-4 w-4" />
              {overdue.length} overdue installment{overdue.length > 1 ? "s" : ""}
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

      {/* Action gallery — Salesforce-style: buttons that open modals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordActions
            patientId={p.id}
            patientName={p.name}
            patientEmail={p.email}
            patientPhone={p.phone}
            arStatus={p.arStatus}
            insuranceCarrier={p.insuranceCarrier}
            invoices={p.invoices.map((i) => ({
              id: i.id,
              label: `${i.invoiceNumber} — ${formatCents(i.outstandingCents)} outstanding`,
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Invoices &amp; plans
            </CardTitle>
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
                        const isOverdue = i.status === "SCHEDULED" && new Date(i.dueDate) < new Date();
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
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Payment history
            </CardTitle>
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
                        variant={t.type === "PAYMENT" ? "success" : t.type === "REFUND" ? "destructive" : "secondary"}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4" /> Activity &amp; notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {p.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes or calls logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {p.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        {NOTE_KIND_LABEL[n.kind]?.icon}
                        {NOTE_KIND_LABEL[n.kind]?.label ?? n.kind}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {n.author} · {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailCheck className="h-4 w-4" /> Email history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {p.emailLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No emails sent yet. Magic links, receipts, statements, and reminders all show up here.
              </p>
            ) : (
              <ul className="divide-y">
                {p.emailLogs.map((e) => (
                  <li key={e.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <Badge variant={e.status === "SENT" ? "success" : "warning"}>
                        {EMAIL_KIND_LABEL[e.kind] ?? e.kind}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {e.status === "SENT" ? "sent" : "preview (no SMTP)"}
                      </span>
                    </div>
                    <p className="mt-0.5 font-medium">{e.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      to {e.to} · {new Date(e.createdAt).toLocaleString()}
                    </p>
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
