"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ArPanelProps {
  patientId: string;
  patientName: string;
  arStatus: "ACTIVE" | "IN_COLLECTIONS";
  insuranceCarrier: string | null;
  emails: {
    id: string;
    kind: string;
    to: string;
    subject: string;
    status: string;
    createdAt: string;
  }[];
  notes: {
    id: string;
    kind: string;
    body: string;
    author: string;
    createdAt: string;
  }[];
}

const KIND_LABEL: Record<string, string> = {
  NOTE: "Note",
  CALL: "📞 Call",
  COLLECTIONS: "Collections",
  INSURANCE: "Insurance",
  MAGIC_LINK: "Magic link",
  PORTAL_LINK: "Portal link",
  RECEIPT: "Receipt",
  STATEMENT: "Statement",
  REMINDER: "Reminder",
  BULK_STATEMENT: "Bulk statement",
  BULK_REMINDER: "Bulk reminder",
};

export function ArPanel({ patientId, arStatus, insuranceCarrier, emails, notes }: ArPanelProps) {
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState<"NOTE" | "CALL">("NOTE");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [carrier, setCarrier] = useState(insuranceCarrier ?? "");
  const [workflowNote, setWorkflowNote] = useState("");

  const inCollections = arStatus === "IN_COLLECTIONS";

  async function run(path: string, body: object, okMsg: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setNotice(okMsg);
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  function saveNote() {
    if (!noteBody.trim()) return;
    run(
      `/api/admin/patients/${patientId}/notes`,
      { kind: noteKind, body: noteBody.trim(), author: "Billing team" },
      noteKind === "CALL" ? "Call logged ✓" : "Note saved ✓"
    );
    setNoteBody("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AR status & workflows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Account status:</span>
            {inCollections ? (
              <Badge variant="destructive">In collections</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
            {insuranceCarrier && (
              <Badge variant="secondary">Ins: {insuranceCarrier}</Badge>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Send to collections</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Marks the account for collections and logs it on the record. Pull it back anytime.
            </p>
            <div className="flex gap-2">
              {inCollections ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    run(
                      `/api/admin/patients/${patientId}/workflow`,
                      { action: "RELEASE_COLLECTIONS", author: "Billing team" },
                      "Account returned to active ✓"
                    )
                  }
                >
                  ↩ Pull out of collections
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    run(
                      `/api/admin/patients/${patientId}/workflow`,
                      { action: "COLLECTIONS", author: "Billing team" },
                      "Sent to collections ✓"
                    )
                  }
                >
                  ⚠️ Send to collections
                </Button>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="mb-1 text-sm font-medium">Re-submit to insurance</p>
            <p className="mb-2 text-xs text-muted-foreground">
              File the claim again with a new carrier or policy. Logged on the record.
            </p>
            <div className="space-y-2">
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Carrier (e.g. Blue Cross 555-…)"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Optional note (why re-submitting?)"
                value={workflowNote}
                onChange={(e) => setWorkflowNote(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    `/api/admin/patients/${patientId}/workflow`,
                    {
                      action: "RESUBMIT_INSURANCE",
                      carrier: carrier.trim() || undefined,
                      note: workflowNote.trim() || undefined,
                      author: "Billing team",
                    },
                    "Insurance re-submission logged ✓"
                  )
                }
              >
                🔁 Re-submit to insurance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log a call or note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={noteKind === "CALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setNoteKind("CALL")}
            >
              📞 Log a call
            </Button>
            <Button
              variant={noteKind === "NOTE" ? "default" : "outline"}
              size="sm"
              onClick={() => setNoteKind("NOTE")}
            >
              ✍️ Add note
            </Button>
          </div>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={3}
            placeholder={
              noteKind === "CALL"
                ? "Spoke with patient about overdue payment — they'll pay Friday."
                : "Internal note about this account…"
            }
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <Button size="sm" disabled={busy || !noteBody.trim()} onClick={saveNote}>
            {busy ? "Saving…" : noteKind === "CALL" ? "Save call log" : "Save note"}
          </Button>
          {notice && <p className="text-xs text-emerald-700">{notice}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity & notes</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes or calls logged yet.</p>
          ) : (
            <ul className="divide-y">
              {notes.map((n) => (
                <li key={n.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        n.kind === "CALL"
                          ? "warning"
                          : n.kind === "COLLECTIONS"
                            ? "destructive"
                            : n.kind === "INSURANCE"
                              ? "secondary"
                              : "outline"
                      }
                    >
                      {KIND_LABEL[n.kind] ?? n.kind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {n.author} · {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Email history</CardTitle>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No emails sent yet. Magic links, receipts, statements, and reminders all show up here.
            </p>
          ) : (
            <ul className="divide-y">
              {emails.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant={e.status === "SENT" ? "success" : "warning"}>
                      {KIND_LABEL[e.kind] ?? e.kind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {e.status === "SENT" ? "sent" : "preview (no SMTP)"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-medium">{e.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    to {e.to} · {new Date(e.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
