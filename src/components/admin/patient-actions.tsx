"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function PatientActions({
  patientId,
  patientName,
  patientEmail,
  patientPhone,
  invoices,
}: {
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  invoices: Array<{ id: string; label: string }>;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: unknown): Promise<any> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function run(fn: () => Promise<void>, successMsg: string) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(successMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    }
  }

  const [pay, setPay] = useState({ amount: "", invoiceId: "", description: "Manual payment received" });
  const [adj, setAdj] = useState({ amount: "", description: "Adjustment" });
  const [inv, setInv] = useState({ invoiceNumber: "", description: "", amount: "", dueAt: "" });
  const [contact, setContact] = useState({ name: patientName, email: patientEmail ?? "", phone: patientPhone ?? "" });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="✉️ Email the patient">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() =>
              run(
                () => post(`/api/admin/patients/${patientId}/magic-link`, {}),
                patientEmail ? "Portal link email sent (or previewed if no SMTP)." : "No email on file."
              )
            }
          >
            Email portal link
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                () => post(`/api/admin/patients/${patientId}/emails`, { kind: "statement" }),
                "Statement email sent (or previewed if no SMTP)."
              )
            }
          >
            Email statement
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          If the clinic hasn't connected SMTP yet, these are previewed instead of delivered.
        </p>
      </Section>

      <Section title="Record a manual payment">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={pay.amount}
                onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                placeholder="100.00"
              />
            </div>
            <div className="space-y-1">
              <Label>Apply to</Label>
              <select
                value={pay.invoiceId}
                onChange={(e) => setPay({ ...pay, invoiceId: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Unallocated</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={pay.description}
              onChange={(e) => setPay({ ...pay, description: e.target.value })}
            />
          </div>
          <Button
            size="sm"
            onClick={() =>
              run(
                async () =>
                  post(`/api/admin/patients/${patientId}/payment`, {
                    amountCents: Math.round(parseFloat(pay.amount || "0") * 100),
                    invoiceId: pay.invoiceId || undefined,
                    description: pay.description,
                  }),
                "Payment recorded in the append-only ledger."
              )
            }
            disabled={!pay.amount || parseFloat(pay.amount) <= 0}
          >
            Record payment
          </Button>
        </div>
      </Section>

      <Section title="Add an adjustment / write-off">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount ($, negative to reduce)</Label>
              <Input
                type="number"
                step="0.01"
                value={adj.amount}
                onChange={(e) => setAdj({ ...adj, amount: e.target.value })}
                placeholder="-25.00"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={adj.description}
                onChange={(e) => setAdj({ ...adj, description: e.target.value })}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                async () =>
                  post("/api/admin/adjustment", {
                    patientId,
                    amountCents: Math.round(parseFloat(adj.amount || "0") * 100),
                    description: adj.description,
                  }),
                "Adjustment recorded (append-only)."
              )
            }
            disabled={!adj.amount || parseFloat(adj.amount) === 0}
          >
            Record adjustment
          </Button>
        </div>
      </Section>

      <Section title="Add an invoice">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Invoice number</Label>
              <Input
                value={inv.invoiceNumber}
                onChange={(e) => setInv({ ...inv, invoiceNumber: e.target.value })}
                placeholder="INV-2001"
              />
            </div>
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={inv.amount}
                onChange={(e) => setInv({ ...inv, amount: e.target.value })}
                placeholder="250.00"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={inv.description}
              onChange={(e) => setInv({ ...inv, description: e.target.value })}
              placeholder="Physical therapy (4 sessions)"
            />
          </div>
          <div className="space-y-1">
            <Label>Due date (optional)</Label>
            <Input
              type="date"
              value={inv.dueAt}
              onChange={(e) => setInv({ ...inv, dueAt: e.target.value })}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                async () =>
                  post(`/api/admin/patients/${patientId}/invoice`, {
                    invoiceNumber: inv.invoiceNumber,
                    description: inv.description,
                    amountCents: Math.round(parseFloat(inv.amount || "0") * 100),
                    dueAt: inv.dueAt || undefined,
                  }),
                "Invoice added."
              )
            }
            disabled={!inv.invoiceNumber || !inv.description || !inv.amount}
          >
            Add invoice
          </Button>
        </div>
      </Section>

      <Section title="Edit contact details">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                () =>
                  post(`/api/admin/patients/${patientId}`, {
                    name: contact.name,
                    email: contact.email || null,
                    phone: contact.phone || null,
                  }),
                "Contact details updated."
              )
            }
          >
            Save contact
          </Button>
        </div>
      </Section>

      {notice && <p className="text-sm text-emerald-700 lg:col-span-2">{notice}</p>}
      {error && <p className="text-sm text-destructive lg:col-span-2">{error}</p>}
    </div>
  );
}
