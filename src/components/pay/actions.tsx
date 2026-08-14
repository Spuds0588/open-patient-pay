"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { dueDateForIndex, splitEvenly, termMonths, type PeriodUnit } from "@/core/engine";
import { formatCents } from "@/lib/money";

interface PlanLimits {
  allowCustomPeriods: boolean;
  allowCustomDate: boolean;
  minPaymentCents: number;
  maxPayments: number;
  maxMonths: number;
  firstPaymentWindowDays: number;
  allowedUnits: PeriodUnit[];
  minPaymentDollars: string;
}

interface ConfigResponse {
  planLimits: PlanLimits;
  mockPayments: boolean;
}

interface Preset {
  label: string;
  hint: string;
  count: number;
  unit: PeriodUnit;
  value: number;
}

const PRESETS: Preset[] = [
  { label: "Pay in full", hint: "1 payment", count: 1, unit: "MONTH", value: 1 },
  { label: "3 monthly", hint: "every month", count: 3, unit: "MONTH", value: 1 },
  { label: "6 monthly", hint: "every month", count: 6, unit: "MONTH", value: 1 },
  { label: "12 monthly", hint: "every month", count: 12, unit: "MONTH", value: 1 },
  { label: "Weekly", hint: "every week", count: 12, unit: "WEEK", value: 1 },
  { label: "Every 2 weeks", hint: "bi-weekly", count: 12, unit: "WEEK", value: 2 },
];

const UNIT_LABELS: Record<PeriodUnit, string> = {
  DAY: "days",
  WEEK: "weeks",
  MONTH: "months",
};

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PlanSelector({
  patientToken,
  invoiceId,
  totalCents,
}: {
  patientToken: string;
  invoiceId: string;
  totalCents: number;
}) {
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [count, setCount] = useState(3);
  const [unit, setUnit] = useState<PeriodUnit>("MONTH");
  const [periodValue, setPeriodValue] = useState(1);
  const [custom, setCustom] = useState(false);
  const [firstPaymentDate, setFirstPaymentDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pay/config")
      .then((r) => r.json())
      .then((data: ConfigResponse) => setLimits(data.planLimits))
      .catch(() => setLimits(null));
  }, []);

  const amounts = useMemo(() => splitEvenly(totalCents, count), [totalCents, count]);
  const perPayment = amounts[0];
  const months = termMonths(unit, periodValue, count);

  const validation = useMemo(() => {
    if (!limits) return null;
    if (count > limits.maxPayments) {
      return `Maximum ${limits.maxPayments} payments.`;
    }
    if (months > limits.maxMonths) {
      return `Plan is longer than the ${limits.maxMonths}-month maximum.`;
    }
    if (count > 1 && perPayment < limits.minPaymentCents) {
      return `Each payment must be at least ${formatCents(limits.minPaymentCents)}.`;
    }
    if (!limits.allowedUnits.includes(unit)) {
      return `"${UNIT_LABELS[unit]}" periods aren't offered by this practice.`;
    }
    return null;
  }, [limits, count, months, perPayment, unit]);

  function choosePreset(p: Preset) {
    setCustom(false);
    setCount(p.count);
    setUnit(p.unit);
    setPeriodValue(p.value);
  }

  function beginCustom() {
    setCustom(true);
    if (count === 1) setCount(3);
  }

  async function begin() {
    setLoading(true);
    setError(null);
    try {
      const planRes = await fetch("/api/pay/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientToken,
          invoiceId,
          count,
          periodUnit: unit,
          periodValue,
          firstPaymentAt: limits?.allowCustomDate ? new Date(firstPaymentDate).toISOString() : undefined,
        }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error ?? "Could not create plan.");

      const checkoutRes = await fetch("/api/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientToken,
          planId: planData.plan.id,
          installmentIndex: 0,
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error ?? "Could not start checkout.");

      window.location.href = checkoutData.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  const allowedPresets = limits
    ? PRESETS.filter((p) => limits.allowedUnits.includes(p.unit))
    : PRESETS;

  const previewDate = dueDateForIndex(
    unit,
    periodValue,
    new Date(firstPaymentDate + "T00:00:00Z"),
    count - 1
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {allowedPresets.map((opt) => {
          const isSel = !custom && count === opt.count && unit === opt.unit && periodValue === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => choosePreset(opt)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                isSel ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs text-muted-foreground">
                {opt.count === 1
                  ? opt.hint
                  : `${opt.hint} · ~${formatCents(splitEvenly(totalCents, opt.count)[0])} each`}
              </div>
            </button>
          );
        })}
        {limits?.allowCustomPeriods && (
          <button
            type="button"
            onClick={beginCustom}
            className={`rounded-lg border p-3 text-left transition-colors ${
              custom ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
            }`}
          >
            <div className="font-medium">Custom schedule</div>
            <div className="text-xs text-muted-foreground">choose your own period &amp; count</div>
          </button>
        )}
      </div>

      {custom && (
        <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Pay every</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={periodValue}
                onChange={(e) => setPeriodValue(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1">
              <Label>Period</Label>
              <div className="flex rounded-md border border-input bg-background">
                {(["DAY", "WEEK", "MONTH"] as PeriodUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    disabled={limits ? !limits.allowedUnits.includes(u) : false}
                    onClick={() => setUnit(u)}
                    className={`flex-1 px-2 py-2 text-sm ${
                      unit === u ? "bg-primary text-primary-foreground" : "hover:bg-accent disabled:opacity-40"
                    }`}
                  >
                    {u === "DAY" ? "Days" : u === "WEEK" ? "Weeks" : "Months"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Number of payments</Label>
            <Input
              type="number"
              min={1}
              max={limits?.maxPayments ?? 48}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>
      )}

      {limits?.allowCustomDate && (
        <div className="space-y-1">
          <Label>First payment date</Label>
          <Input
            type="date"
            value={firstPaymentDate}
            min={todayISO()}
            max={todayISO(limits.firstPaymentWindowDays)}
            onChange={(e) => setFirstPaymentDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your first payment is processed on this date; later payments follow every{" "}
            {periodValue} {UNIT_LABELS[unit]}.
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {count} payment{count > 1 ? "s" : ""} of{" "}
        <span className="font-medium">{formatCents(perPayment)}</span>
        {count > 1 ? " each" : ""}
        {months > 0 ? ` · about ${Math.round(months)} month${Math.round(months) === 1 ? "" : "s"} total` : ""}
        {custom || count > 1 ? ` · last payment ${previewDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
      </p>

      {validation && <p className="text-sm text-destructive">{validation}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={begin}
        disabled={loading || Boolean(validation) || !limits}
        className="w-full"
        size="lg"
      >
        {loading ? "Starting secure checkout…" : `Set up plan & pay ${formatCents(perPayment)}`}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Secured by Stripe. Your card details never touch this server.
      </p>
    </div>
  );
}

export function PayInstallmentButton({
  patientToken,
  planId,
  installmentIndex,
  amountCents,
}: {
  patientToken: string;
  planId: string;
  installmentIndex: number;
  amountCents: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientToken, planId, installmentIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={pay} disabled={loading} size="sm">
        {loading ? "Starting…" : `Pay ${formatCents(amountCents)}`}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
