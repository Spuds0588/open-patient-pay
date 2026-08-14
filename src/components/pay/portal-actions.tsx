"use client";

import { useState } from "react";
import { Phone, Mail, Printer, Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// --- Print / save as PDF ---

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </Button>
  );
}

// --- Billing contact (call / email) ---

export function ContactBilling({
  billingContact,
}: {
  billingContact: { email: string | null; phone: string | null };
}) {
  const hasAny = billingContact.email || billingContact.phone;
  if (!hasAny) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Questions about your bill?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {billingContact.phone && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`tel:${billingContact.phone}`}>
              <Phone className="h-4 w-4" /> Call billing
            </a>
          </Button>
        )}
        {billingContact.email && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`mailto:${billingContact.email}`}>
              <Mail className="h-4 w-4" /> Email billing
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// --- Reminder opt-in ---

export function RemindersToggle({
  patientToken,
  initial,
}: {
  patientToken: string;
  initial: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pay/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientToken, remindersEnabled: !enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update.");
      setEnabled(data.remindersEnabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div>
        <p className="text-sm font-medium">Email me payment reminders</p>
        <p className="text-xs text-muted-foreground">
          {enabled ? "You'll get a heads-up before each payment is due." : "Reminders are off."}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={enabled}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          enabled ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// --- Email receipt / statement (works in mock-mail mode too) ---

export function EmailActions({
  patientToken,
  planId,
}: {
  patientToken: string;
  planId?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(kind: "receipt" | "statement" | "reminder", label: string) {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/pay/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientToken, kind, planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setNotice(
        data.sent
          ? `${label} sent to your email ✓`
          : `${label} ready to send (your clinic hasn't connected email yet — see a preview of what it would look like).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => send("receipt", "Receipt")} disabled={busy !== null}>
        {busy === "receipt" ? (
          "Sending…"
        ) : (
          <>
            <Receipt className="h-4 w-4" /> Email receipt
          </>
        )}
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => send("statement", "Statement")} disabled={busy !== null}>
        {busy === "statement" ? (
          "Sending…"
        ) : (
          <>
            <FileText className="h-4 w-4" /> Email statement
          </>
        )}
      </Button>
      {notice && <p className="w-full text-xs text-muted-foreground">{notice}</p>}
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}
