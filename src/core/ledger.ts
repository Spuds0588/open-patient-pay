// Stateless ledger math. The ledger (Transaction rows) is append-only; these
// helpers derive balances by summing succeeded entries. All values are integer
// cents.

export type SettledStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export interface LedgerEntryLike {
  amountCents: number;
  status: SettledStatus;
}

/**
 * Net amount applied to a balance from a set of ledger entries.
 * Payment entries are positive; refunds/adjustments are negative.
 * Only SUCCEEDED entries count toward a balance.
 */
export function netAppliedCents(entries: LedgerEntryLike[]): number {
  return entries
    .filter((e) => e.status === "SUCCEEDED")
    .reduce((acc, e) => acc + e.amountCents, 0);
}

/** Outstanding balance = billed total minus net applied. Clamped at zero. */
export function outstandingCents(billedCents: number, entries: LedgerEntryLike[]): number {
  return Math.max(0, billedCents - netAppliedCents(entries));
}

/** Collection rate as a percentage (0–100), rounded to one decimal. */
export function collectionRate(billedCents: number, entries: LedgerEntryLike[]): number {
  if (billedCents <= 0) return 0;
  const rate = (netAppliedCents(entries) / billedCents) * 100;
  return Math.round(rate * 10) / 10;
}

/** True when the next unpaid installment is now overdue. */
export function isOverdue(dueDate: Date, status: string, now: Date = new Date()): boolean {
  return status !== "PAID" && status !== "CANCELLED" && dueDate.getTime() < now.getTime();
}
