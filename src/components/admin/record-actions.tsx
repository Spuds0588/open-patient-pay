"use client";

import { useState } from "react";
import {
  Banknote,
  BadgeDollarSign,
  CalendarPlus,
  HandCoins,
  FileText,
  Send,
  Phone,
  StickyNote,
  ShieldAlert,
  RefreshCcw,
  UserRound,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface RecordActionsProps {
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  arStatus: "ACTIVE" | "IN_COLLECTIONS";
  insuranceCarrier: string | null;
  invoices: Array<{ id: string; label: string }>;
}

type ActionKey =
  | "payment"
  | "adjustment"
  | "invoice"
  | "portal-link"
  | "statement"
  | "call"
  | "note"
  | "collections"
  | "insurance"
  | "contact";

/** One action button in the gallery. */
function ActionButton({
  icon,
  label,
  onClick,
  variant = "outline",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "outline" | "default" | "destructive";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        variant === "default"
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : variant === "destructive"
            ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
            : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <span className={variant === "default" ? "" : "text-primary"}>{icon}</span>
      {label}
    </button>
  );
}

export function RecordActions(props: RecordActionsProps) {
  const [open, setOpen] = useState<ActionKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Form state
  const [pay, setPay] = useState({ amount: "", invoiceId: "", description: "Manual payment received" });
  const [adj, setAdj] = useState({ amount: "", description: "Adjustment / write-off" });
  const [inv, setInv] = useState({ invoiceNumber: "", description: "", amount: "", dueAt: "" });
  const [note, setNote] = useState({ kind: "NOTE", body: "" });
  const [ins, setIns] = useState({ carrier: props.insuranceCarrier ?? "", note: "" });
  const [contact, setContact] = useState({
    name: props.patientName,
    email: props.patientEmail ?? "",
    phone: props.patientPhone ?? "",
  });

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
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice(successMsg);
      setOpen(null);
      // Refresh server-rendered data so the record reflects the change.
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      setNotice(null);
      setBusy(false);
      window.alert(e instanceof Error ? e.message : "Request failed.");
    }
  }

  const modalProps = {
    open: open !== null,
    onClose: () => setOpen(null),
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <ActionButton icon={<Banknote className="h-4 w-4" />} label="Record payment" onClick={() => setOpen("payment")} />
        <ActionButton icon={<BadgeDollarSign className="h-4 w-4" />} label="Write-off" onClick={() => setOpen("adjustment")} />
        <ActionButton icon={<CalendarPlus className="h-4 w-4" />} label="Add invoice" onClick={() => setOpen("invoice")} />
        <ActionButton icon={<Send className="h-4 w-4" />} label="Email portal link" onClick={() => setOpen("portal-link")} />
        <ActionButton icon={<FileText className="h-4 w-4" />} label="Email statement" onClick={() => setOpen("statement")} />
        <ActionButton icon={<Phone className="h-4 w-4" />} label="Log a call" onClick={() => setOpen("call")} />
        <ActionButton icon={<StickyNote className="h-4 w-4" />} label="Add note" onClick={() => setOpen("note")} />
        <ActionButton
          icon={<ShieldAlert className="h-4 w-4" />}
          label={props.arStatus === "IN_COLLECTIONS" ? "Pull from collections" : "Send to collections"}
          variant={props.arStatus === "IN_COLLECTIONS" ? "outline" : "destructive"}
          onClick={() => setOpen("collections")}
        />
        <ActionButton icon={<RefreshCcw className="h-4 w-4" />} label="Re-submit insurance" onClick={() => setOpen("insurance")} />
        <ActionButton icon={<UserRound className="h-4 w-4" />} label="Edit contact" onClick={() => setOpen("contact")} />
      </div>

      {notice && (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </p>
      )}

      {/* Record payment */}
      <Modal {...modalProps} title="Record a payment" description="Appends to the ledger — nothing is edited.">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" min="0" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} placeholder="100.00" />
            </div>
            <div className="space-y-1">
              <Label>Apply to</Label>
              <select value={pay.invoiceId} onChange={(e) => setPay({ ...pay, invoiceId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Unallocated</option>
                {props.invoices.map((i) => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={pay.description} onChange={(e) => setPay({ ...pay, description: e.target.value })} />
          </div>
          <Button
            disabled={busy || !pay.amount || parseFloat(pay.amount) <= 0}
            onClick={() =>
              run(
                () =>
                  post(`/api/admin/patients/${props.patientId}/payment`, {
                    amountCents: Math.round(parseFloat(pay.amount) * 100),
                    invoiceId: pay.invoiceId || undefined,
                    description: pay.description,
                  }),
                "Payment recorded."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />} Record payment
          </Button>
        </div>
      </Modal>

      {/* Adjustment / write-off */}
      <Modal {...modalProps} title="Adjustment / write-off" description="Use a negative amount to reduce the balance.">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Amount ($, negative reduces balance)</Label>
            <Input type="number" step="0.01" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} placeholder="-25.00" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={adj.description} onChange={(e) => setAdj({ ...adj, description: e.target.value })} />
          </div>
          <Button
            variant="outline"
            disabled={busy || !adj.amount || parseFloat(adj.amount) === 0}
            onClick={() =>
              run(
                () =>
                  post("/api/admin/adjustment", {
                    patientId: props.patientId,
                    amountCents: Math.round(parseFloat(adj.amount) * 100),
                    description: adj.description,
                  }),
                "Adjustment recorded."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeDollarSign className="h-4 w-4" />} Record adjustment
          </Button>
        </div>
      </Modal>

      {/* Add invoice */}
      <Modal {...modalProps} title="Add an invoice" description="Bill the patient for a service not in the import.">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Invoice number</Label>
              <Input value={inv.invoiceNumber} onChange={(e) => setInv({ ...inv, invoiceNumber: e.target.value })} placeholder="INV-2001" />
            </div>
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" min="0" value={inv.amount} onChange={(e) => setInv({ ...inv, amount: e.target.value })} placeholder="250.00" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={inv.description} onChange={(e) => setInv({ ...inv, description: e.target.value })} placeholder="Physical therapy (4 sessions)" />
          </div>
          <div className="space-y-1">
            <Label>Due date (optional)</Label>
            <Input type="date" value={inv.dueAt} onChange={(e) => setInv({ ...inv, dueAt: e.target.value })} />
          </div>
          <Button
            variant="outline"
            disabled={busy || !inv.invoiceNumber || !inv.description || !inv.amount}
            onClick={() =>
              run(
                () =>
                  post(`/api/admin/patients/${props.patientId}/invoice`, {
                    invoiceNumber: inv.invoiceNumber,
                    description: inv.description,
                    amountCents: Math.round(parseFloat(inv.amount) * 100),
                    dueAt: inv.dueAt || undefined,
                  }),
                "Invoice added."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Add invoice
          </Button>
        </div>
      </Modal>

      {/* Email portal link */}
      <Modal {...modalProps} title="Email the portal link" description={`A magic link to ${props.patientEmail ?? "their portal"}.`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sends a secure, expiring link. In mock-mail mode (no SMTP) the link is previewed instead.
          </p>
          <Button
            disabled={busy || !props.patientEmail}
            onClick={() =>
              run(
                () => post(`/api/admin/patients/${props.patientId}/magic-link`, {}),
                "Portal link sent."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send link
          </Button>
        </div>
      </Modal>

      {/* Email statement */}
      <Modal {...modalProps} title="Email a statement" description={`Statement goes to ${props.patientEmail ?? "no email on file"}.`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Sends the full invoice &amp; payment summary for this patient.</p>
          <Button
            disabled={busy || !props.patientEmail}
            onClick={() =>
              run(
                () => post(`/api/admin/patients/${props.patientId}/emails`, { kind: "statement" }),
                "Statement sent."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Send statement
          </Button>
        </div>
      </Modal>

      {/* Log a call */}
      <Modal {...modalProps} title="Log a phone call" description="Records the call on the patient's timeline.">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Call summary</Label>
            <Textarea rows={3} value={note.kind === "CALL" ? note.body : ""} onChange={(e) => setNote({ kind: "CALL", body: e.target.value })} placeholder="Spoke with patient about overdue payment — they'll pay Friday." />
          </div>
          <Button
            disabled={busy || !note.body.trim()}
            onClick={() =>
              run(
                () =>
                  post(`/api/admin/patients/${props.patientId}/notes`, {
                    kind: "CALL",
                    body: note.body.trim(),
                    author: "Billing team",
                  }),
                "Call logged."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Save call log
          </Button>
        </div>
      </Modal>

      {/* Add note */}
      <Modal {...modalProps} title="Add a note" description="Internal note on this account.">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Note</Label>
            <Textarea rows={3} value={note.kind === "NOTE" ? note.body : ""} onChange={(e) => setNote({ kind: "NOTE", body: e.target.value })} placeholder="Insurance pending — follow up next week." />
          </div>
          <Button
            disabled={busy || !note.body.trim()}
            onClick={() =>
              run(
                () =>
                  post(`/api/admin/patients/${props.patientId}/notes`, {
                    kind: "NOTE",
                    body: note.body.trim(),
                    author: "Billing team",
                  }),
                "Note saved."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />} Save note
          </Button>
        </div>
      </Modal>

      {/* Collections */}
      <Modal
        {...modalProps}
        title={props.arStatus === "IN_COLLECTIONS" ? "Pull out of collections" : "Send to collections"}
        description="Updates the account status and logs it on the record."
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {props.arStatus === "IN_COLLECTIONS"
              ? "The account will be returned to active status."
              : "The account will be flagged for collections and appear in the Collections view."}
          </p>
          <Button
            variant={props.arStatus === "IN_COLLECTIONS" ? "outline" : "destructive"}
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  post(`/api/admin/patients/${props.patientId}/workflow`, {
                    action: props.arStatus === "IN_COLLECTIONS" ? "RELEASE_COLLECTIONS" : "COLLECTIONS",
                    author: "Billing team",
                  }),
                props.arStatus === "IN_COLLECTIONS" ? "Account returned to active." : "Sent to collections."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            {props.arStatus === "IN_COLLECTIONS" ? "Return to active" : "Send to collections"}
          </Button>
        </div>
      </Modal>

      {/* Insurance re-submission */}
      <Modal {...modalProps} title="Re-submit to insurance" description="File the claim again with a new carrier or note.">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Carrier (optional)</Label>
            <Input value={ins.carrier} onChange={(e) => setIns({ ...ins, carrier: e.target.value })} placeholder="Blue Cross 555" />
          </div>
          <div className="space-y-1">
            <Label>Note (optional)</Label>
            <Textarea rows={2} value={ins.note} onChange={(e) => setIns({ ...ins, note: e.target.value })} placeholder="Why re-submitting?" />
          </div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  post(`/api/admin/patients/${props.patientId}/workflow`, {
                    action: "RESUBMIT_INSURANCE",
                    carrier: ins.carrier.trim() || undefined,
                    note: ins.note.trim() || undefined,
                    author: "Billing team",
                  }),
                "Insurance re-submission logged."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Re-submit
          </Button>
        </div>
      </Modal>

      {/* Edit contact */}
      <Modal {...modalProps} title="Edit contact details" description="Name, email, and phone on file.">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </div>
          </div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  post(`/api/admin/patients/${props.patientId}`, {
                    name: contact.name,
                    email: contact.email || null,
                    phone: contact.phone || null,
                  }),
                "Contact updated."
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />} Save contact
          </Button>
        </div>
      </Modal>
    </div>
  );
}
