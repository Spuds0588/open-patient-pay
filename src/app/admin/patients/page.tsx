import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyLink } from "@/components/copy-link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BulkEmailBar } from "@/components/admin/bulk-email";
import { getPatientsWithBalances, type PatientListFilter } from "@/lib/queries";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

const FILTERS: { key: PatientListFilter; label: string }[] = [
  { key: "all", label: "All patients" },
  { key: "outstanding", label: "Balance due" },
  { key: "overdue", label: "Overdue" },
  { key: "no-plan", label: "No plan" },
  { key: "in-collections", label: "In collections" },
];

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = (FILTERS.some((f) => f.key === params.view) ? params.view : "all") as PatientListFilter;
  const patients = await getPatientsWithBalances(view);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-muted-foreground">
            Drill into any patient&apos;s history, add one by hand, or email a group.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/patients/new">＋ Add patient manually</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            asChild
            variant={f.key === view ? "default" : "outline"}
            size="sm"
          >
            <Link href={`/admin/patients?view=${f.key}`}>{f.label}</Link>
          </Button>
        ))}
      </div>

      <BulkEmailBar patients={patients} />

      <Card>
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No patients match this view. Import a CSV or add a patient by hand.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Portal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/patients/${p.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.overdueCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {p.overdueCount} overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.externalId ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(p.outstandingCents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.arStatus === "IN_COLLECTIONS" ? (
                          <Badge variant="destructive">Collections</Badge>
                        ) : p.outstandingCents === 0 ? (
                          <Badge variant="secondary">Paid</Badge>
                        ) : p.hasPlan ? (
                          <Badge variant="success">On plan</Badge>
                        ) : (
                          <Badge variant="warning">No plan</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/pay/${p.payToken}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Open
                        </Link>
                        <CopyLink token={p.payToken} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
