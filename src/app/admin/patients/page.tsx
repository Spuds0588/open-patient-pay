import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CopyLink } from "@/components/copy-link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPatientsWithBalances } from "@/lib/queries";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const patients = await getPatientsWithBalances();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground">
          Share a patient&apos;s portal link to let them view and pay their balance.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No patients yet. Import a CSV to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Plans</TableHead>
                  <TableHead className="text-right">Portal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.externalId ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatCents(p.billedCents)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(p.outstandingCents)}
                    </TableCell>
                    <TableCell>
                      {p.planCount > 0 ? (
                        <Badge variant="secondary">{p.planCount} plan{p.planCount > 1 ? "s" : ""}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
