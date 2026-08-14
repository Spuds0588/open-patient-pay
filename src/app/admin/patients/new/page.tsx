"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatCents } from "@/lib/money";

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    externalId: "",
    invoiceNumber: "",
    description: "",
    amount: "",
    dueAt: "",
  });
  const [withInvoice, setWithInvoice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ payToken: string } | null>(null);

  const amountCents = Math.round(parseFloat(form.amount || "0") * 100);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          externalId: form.externalId,
          invoice: withInvoice
            ? {
                invoiceNumber: form.invoiceNumber,
                description: form.description,
                amountCents,
                dueAt: form.dueAt || undefined,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add patient.");
      setResult(data.patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/patients" className="text-sm text-primary hover:underline">
          ← Patients
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Add a patient</h1>
        <p className="text-muted-foreground">
          Add someone by hand — perfect when a patient isn&apos;t in your export yet.
        </p>
      </div>

      {result ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Badge variant="success">Patient added ✓</Badge>
            <p className="text-sm">
              A portal link was generated automatically. Share it to let them pay online:
            </p>
            <div className="rounded-md border p-3 font-mono text-sm break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/pay/${result.payToken}` : result.payToken}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setForm({ name: "", email: "", phone: "", externalId: "", invoiceNumber: "", description: "", amount: "", dueAt: "" });
                }}
              >
                Add another
              </Button>
              <Button onClick={() => router.push("/admin/patients")}>Done</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="name">Full name *</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="externalId">External / MRN ID</Label>
                  <Input
                    id="externalId"
                    value={form.externalId}
                    onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                    placeholder="MRN-xxxx"
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={withInvoice}
                    onChange={(e) => setWithInvoice(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Add an invoice too
                </label>
                {withInvoice && (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="invoiceNumber">Invoice number *</Label>
                      <Input
                        id="invoiceNumber"
                        required={withInvoice}
                        value={form.invoiceNumber}
                        onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                        placeholder="INV-2001"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="amount">Amount ($) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        required={withInvoice}
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        placeholder="250.00"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="description">Description *</Label>
                      <Input
                        id="description"
                        required={withInvoice}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Physical therapy (4 sessions)"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="dueAt">Due date (optional)</Label>
                      <Input
                        id="dueAt"
                        type="date"
                        value={form.dueAt}
                        onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                {amountCents > 0 && withInvoice && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Will bill {formatCents(amountCents)}.
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding…" : "Add patient"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
