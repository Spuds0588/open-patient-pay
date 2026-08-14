"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";

interface PatientLite {
  id: string;
  name: string;
  email: string | null;
  outstandingCents: number;
}

export function BulkEmailBar({ patients }: { patients: PatientLite[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailable = useMemo(
    () => patients.filter((p) => p.email && p.outstandingCents > 0),
    [patients]
  );

  const allSelected =
    emailable.length > 0 && emailable.every((p) => selected.has(p.id));

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) {
      emailable.forEach((p) => next.delete(p.id));
    } else {
      emailable.forEach((p) => next.add(p.id));
    }
    setSelected(next);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function send(kind: "statement" | "reminder") {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/bulk-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientIds: [...selected], kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setResult(
        `${data.attempted ?? 0} email(s) ${data.sent > 0 ? "sent" : "queued as previews"} (mock mode — see server log).`
      );
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-input"
            />
            Select all with a balance
          </label>
          <span className="text-xs text-muted-foreground">
            {emailable.length} patient(s) with an email &amp; balance ·{" "}
            {selected.size} selected
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0 || busy}
            onClick={() => send("statement")}
          >
            📄 Email statements
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0 || busy}
            onClick={() => send("reminder")}
          >
            🔔 Email reminders
          </Button>
        </div>
      </div>
      {emailable.length > 0 && (
        <div className="mt-3 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {emailable.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selected.has(p.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {p.name} · {formatCents(p.outstandingCents)}
            </button>
          ))}
        </div>
      )}
      {result && <p className="mt-3 text-xs text-emerald-700">{result}</p>}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
