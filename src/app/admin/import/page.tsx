"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { SAMPLE_CSV } from "@/lib/sample-csv";

interface Summary {
  summary: {
    patientsCreated: number;
    patientsUpdated: number;
    invoicesCreated: number;
    invoicesSkipped: number;
  };
  patients: number;
  invoices: number;
}

export default function ImportPage() {
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import billing CSV</h1>
        <p className="text-muted-foreground">
          Paste a patient/invoice export, or drop in a file. Amounts are in dollars; parsing is
          done in memory and nothing is written to disk.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>CSV data</CardTitle>
            <CardDescription>
              Expected columns: <code>externalId</code>, <code>name</code>,{" "}
              <code>invoiceNumber</code>, <code>description</code>, <code>amount</code>,{" "}
              <code>issuedAt</code>, <code>dueAt</code> (email/phone optional).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={"externalId,name,invoiceNumber,description,amount,issuedAt,dueAt\nMRN-1001,Marcus Chen,INV-1001,ER visit,1240.00,2026-07-01,2026-07-30"}
              className="min-h-[260px] font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <Button onClick={submit} disabled={loading || !csv.trim()}>
                {loading ? "Importing…" : "Import"}
              </Button>
              <Button variant="outline" onClick={() => setCsv(SAMPLE_CSV)} type="button">
                Load sample
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {result && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{result.summary.patientsCreated} patients created</Badge>
                <Badge variant="secondary">{result.summary.patientsUpdated} patients updated</Badge>
                <Badge variant="success">{result.summary.invoicesCreated} invoices created</Badge>
                {result.summary.invoicesSkipped > 0 && (
                  <Badge variant="warning">{result.summary.invoicesSkipped} skipped</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              1. Export a billing report from your practice management system as CSV.
            </p>
            <p>
              2. Paste it here. Patients are matched by <code>externalId</code>; new ones get a
              unique, unguessable portal link automatically.
            </p>
            <p>
              3. Share each patient&apos;s portal link from the Patients page. They choose a plan
              and pay through Stripe — card data never touches your server.
            </p>
            <p className="text-xs">
              Tip: to re-run imports safely, invoices are deduplicated by{" "}
              <code>invoiceNumber</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
