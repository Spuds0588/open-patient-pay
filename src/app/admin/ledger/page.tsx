import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLedger } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function typeVariant(type: string): "success" | "destructive" | "secondary" {
  if (type === "PAYMENT") return "success";
  if (type === "REFUND") return "destructive";
  return "secondary";
}

export default async function LedgerPage() {
  const ledger = await getLedger(250);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ledger</h1>
        <p className="text-muted-foreground">
          Append-only record of every payment, refund, and adjustment. Entries are never edited
          or deleted.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {ledger.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(t.occurredAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeVariant(t.type)}>{t.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{t.patientName}</TableCell>
                    <TableCell className="text-muted-foreground">{t.description}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        t.amountCents >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {t.amountDisplay}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.externalRef ?? "—"}
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
