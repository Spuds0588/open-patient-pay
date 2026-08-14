// Stateless installment engine. Pure functions only — no DB, no I/O, no side
// effects — so the logic is trivially unit-testable and horizontally scalable.

export type PeriodUnit = "DAY" | "WEEK" | "MONTH";

export interface ScheduleLine {
  index: number;
  amountCents: number;
  dueDate: Date;
}

export interface Schedule {
  /** The first payment (installment #1) and everything that follows. */
  lines: ScheduleLine[];
  /** Total financed, in cents. */
  totalCents: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Add whole days to a date (always a clean UTC date, no DST surprises). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Add whole months, clamping the day to the target month's last day. */
export function addMonthsClamped(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

/**
 * Due date for installment `index`. `periodValue` is the interval multiplier:
 * DAY → `periodValue` days, WEEK → `periodValue` weeks, MONTH → `periodValue`
 * months. Installment #0 is due on `firstPaymentAt`.
 */
export function dueDateForIndex(
  periodUnit: PeriodUnit,
  periodValue: number,
  firstPaymentAt: Date,
  index: number
): Date {
  const steps = index * periodValue;
  switch (periodUnit) {
    case "DAY":
      return addDays(firstPaymentAt, steps);
    case "WEEK":
      return addDays(firstPaymentAt, steps * 7);
    case "MONTH":
      return addMonthsClamped(firstPaymentAt, steps);
  }
}

/**
 * Build a schedule that splits `totalCents` into `count` payments, the first
 * due on `firstPaymentAt` and the rest spaced by `periodValue` `periodUnit`s.
 * The remainder is front-loaded so the total is always exact (never a
 * floating-point penny off).
 */
export function buildSchedule(params: {
  totalCents: number;
  count: number;
  periodUnit: PeriodUnit;
  periodValue: number;
  firstPaymentAt: Date;
}): Schedule {
  const { totalCents, count, periodUnit, periodValue, firstPaymentAt } = params;

  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("totalCents must be a non-negative integer");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("count must be a positive integer");
  }
  if (!Number.isInteger(periodValue) || periodValue < 1) {
    throw new Error("periodValue must be a positive integer");
  }

  const amounts = splitEvenly(totalCents, count);

  const lines: ScheduleLine[] = amounts.map((amountCents, i) => ({
    index: i,
    amountCents,
    dueDate: dueDateForIndex(periodUnit, periodValue, firstPaymentAt, i),
  }));

  return { lines, totalCents };
}

/** Split an integer into `parts` roughly-equal integers, front-loading the remainder. */
export function splitEvenly(totalCents: number, parts: number): number[] {
  if (!Number.isInteger(parts) || parts < 1) throw new Error("parts must be a positive integer");
  const base = Math.floor(totalCents / parts);
  const remainder = totalCents - base * parts;
  const out: number[] = [];
  for (let i = 0; i < parts; i++) {
    out.push(base + (i < remainder ? 1 : 0));
  }
  return out;
}

/**
 * Recalculation hook (FR-2). When the plan's primary balance is adjusted
 * mid-plan, keep already-paid installments untouched and redistribute the new
 * remaining balance across the unpaid installments.
 *
 * `paidFlags[i]` is true when installment i has already been satisfied.
 */
export function recalculateRemaining(
  amounts: number[],
  paidFlags: boolean[],
  newTotalCents: number
): number[] {
  if (amounts.length !== paidFlags.length) {
    throw new Error("amounts and paidFlags must have the same length");
  }
  const paidCents = amounts.reduce((acc, a, i) => (paidFlags[i] ? acc + a : acc), 0);
  const unpaidCount = paidFlags.filter((p) => !p).length;
  const remaining = newTotalCents - paidCents;

  if (remaining < 0) {
    // Balance dropped below what was already paid: outstanding is fully covered.
    return amounts.map((a, i) => (paidFlags[i] ? a : 0));
  }

  const newUnpaid = unpaidCount === 0 ? [] : splitEvenly(remaining, unpaidCount);
  let cursor = 0;
  return amounts.map((a, i) => (paidFlags[i] ? a : newUnpaid[cursor++]));
}

/** Approximate the full term of a plan in months (for validation against PLAN_MAX_MONTHS). */
export function termMonths(
  periodUnit: PeriodUnit,
  periodValue: number,
  count: number
): number {
  const perPeriod = periodUnit === "MONTH" ? 1 : periodUnit === "WEEK" ? 7 / 30.4375 : 1 / 30.4375;
  return count * periodValue * perPeriod;
}
