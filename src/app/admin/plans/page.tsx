import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPlans } from "@/lib/queries";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "success" | "warning" | "secondary" {
  if (status === "COMPLETED") return "success";
  if (status === "ACTIVE") return "secondary";
  return "warning";
}

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Installment plans</h1>
        <p className="text-muted-foreground">Active, completed, and cancelled patient plans.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {plans.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No plans yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.patientName}</TableCell>
                    <TableCell className="text-muted-foreground">{p.invoiceNumber}</TableCell>
                    <TableCell className="text-right">{formatCents(p.totalCents)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.count}× every {p.periodValue}{" "}
                      {p.periodUnit.toLowerCase()}
                      {p.periodValue > 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>
                      {p.paidCount}/{p.count} paid
                      {p.overdueCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {p.overdueCount} overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {plans.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.slice(0, 4).map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{p.patientName}</h3>
                  <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {p.installments.map((i) => (
                    <li key={i.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        #{i.index + 1} · {formatDate(i.dueDate)}
                      </span>
                      <span className="flex items-center gap-2">
                        {formatCents(i.amountCents)}
                        {i.status === "PAID" ? (
                          <Badge variant="success">paid</Badge>
                        ) : i.status === "SCHEDULED" && new Date(i.dueDate) < new Date() ? (
                          <Badge variant="destructive">overdue</Badge>
                        ) : (
                          <Badge variant="outline">{i.status.toLowerCase()}</Badge>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
