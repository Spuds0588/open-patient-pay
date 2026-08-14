import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics, getLedger } from "@/lib/queries";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();
  const ledger = await getLedger(6);

  const cards = [
    { label: "Outstanding", value: formatCents(metrics.outstandingCents), accent: true },
    { label: "Collected", value: formatCents(metrics.collectedCents) },
    { label: "Billed", value: formatCents(metrics.billedCents) },
    { label: "Collection rate", value: `${metrics.collectionRate}%` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your practice at a glance.</p>
        </div>
        <Button asChild>
          <Link href="/admin/import">Import billing CSV</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${c.accent ? "text-primary" : ""}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.patientCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.activePlanCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue installments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{metrics.overdueInstallmentCount}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent ledger activity</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/ledger">View full ledger →</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {ledger.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No transactions yet. Import invoices and collect a payment to see activity here.
              </p>
            ) : (
              <ul className="divide-y">
                {ledger.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant={t.type === "PAYMENT" ? "success" : t.type === "REFUND" ? "destructive" : "secondary"}>
                        {t.type}
                      </Badge>
                      <span className="text-muted-foreground">{t.patientName}</span>
                      <span className="hidden text-muted-foreground sm:inline">{t.description}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={t.amountCents >= 0 ? "font-medium text-emerald-700" : "font-medium text-red-700"}>
                        {t.amountDisplay}
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatDate(t.occurredAt)}
                      </span>
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
