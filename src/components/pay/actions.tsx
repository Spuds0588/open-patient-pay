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
}

interface ConfigResponse {
  planLimits: PlanLimits;
}

const UNIT_LABELS: Record<PeriodUnit, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
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
  const [payInFull, setPayInFull] = useState(false);
  const [unit, setUnit] = useState<PeriodUnit>("MONTH");
  const [periodValue, setPeriodValue] = useState(1);
  const [count, setCount] = useState(6);
  const [firstPaymentDate, setFirstPaymentDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pay/config")
      .then((r) => r.json())
      .then((data: ConfigResponse) => setLimits(data.planLimits))
      .catch(() => setLimits(null));
  }, []);

  const effectiveCount = payInFull ? 1 : count;
  const amounts = useMemo(
    () => splitEvenly(totalCents, effectiveCount),
    [totalCents, effectiveCount]
  );
  const perPayment = amounts[0];
  const months = payInFull ? 0 : termMonths(unit, periodValue, count);

  const validation = useMemo(() => {
    if (!limits) return null;
    if (payInFull) return null;
    if (count > limits.maxPayments) return `Maximum ${limits.maxPayments} payments.`;
    if (months > limits.maxMonths) return `Plan is longer than the ${limits.maxMonths}-month maximum.`;
    if (perPayment < limits.minPaymentCents) {
      return `Each payment must be at least ${formatCents(limits.minPaymentCents)}.`;
    }
    if (!limits.allowedUnits.includes(unit)) {
      return `"${unit.toLowerCase()}" periods aren't offered by this practice.`;
    }
    return null;
  }, [limits, payInFull, count, months, perPayment, unit]);

  const unitDisabled = (u: PeriodUnit) => limits ? !limits.allowedUnits.includes(u) : false;

  const lastDate = useMemo(
    () =>
      payInFull
        ? null
        : dueDateForIndex(unit, periodValue, new Date(firstPaymentDate + "T00:00:00Z"), count - 1),
    [payInFull, unit, periodValue, firstPaymentDate, count]
  );

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
          count: effectiveCount,
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

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setPayInFull(!payInFull)}
        className={`w-full rounded-lg border p-3 text-left transition-colors ${
          payInFull ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
        }`}
      >
        <div className="font-medium">Pay the full balance now</div>
        <div className="text-xs text-muted-foreground">
          {payInFull ? "You're paying " : "One payment of "}
          <span className="font-medium">{formatCents(totalCents)}</span>
          {payInFull ? " today." : " today instead of installments."}
        </div>
      </button>

      {!payInFull && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Payment period</Label>
            <div className="flex rounded-md border border-input bg-background">
              {(["MONTH", "WEEK", "DAY"] as PeriodUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  disabled={unitDisabled(u)}
                  onClick={() => setUnit(u)}
                  className={`flex-1 px-2 py-2 text-sm ${
                    unit === u ? "bg-primary text-primary-foreground" : "hover:bg-accent disabled:opacity-40"
                  }`}
                >
                  {u === "MONTH" ? "Months" : u === "WEEK" ? "Weeks" : "Days"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Pay every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={periodValue}
                  onChange={(e) => setPeriodValue(Math.max(1, Number(e.target.value) || 1))}
                />
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                  {UNIT_LABELS[unit]}
                  {periodValue > 1 ? "s" : ""}
                </span>
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
        </div>
      )}

      {limits?.allowCustomDate && !payInFull && (
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
            Your first payment is processed on this date; the rest follow every {periodValue}{" "}
            {UNIT_LABELS[unit]}
            {periodValue > 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {!payInFull && (
        <p className="text-sm text-muted-foreground">
          {count} payment{count > 1 ? "s" : ""} of{" "}
          <span className="font-medium">{formatCents(perPayment)}</span>
          {count > 1 ? " each" : ""}
          {months > 0 ? ` · about ${Math.round(months)} month${Math.round(months) === 1 ? "" : "s"} total` : ""}
          {lastDate
            ? ` · last ${lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
            : ""}
        </p>
      )}

      {validation && <p className="text-sm text-destructive">{validation}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={begin}
        disabled={loading || Boolean(validation) || !limits}
        className="w-full"
        size="lg"
      >
        {loading
          ? "Starting secure checkout…"
          : `Set up plan & pay ${formatCents(perPayment)}`}
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
