import { describe, expect, it } from "vitest";
import { collectionRate, isOverdue, netAppliedCents, outstandingCents } from "./ledger";

describe("netAppliedCents", () => {
  it("only counts succeeded entries", () => {
    const entries = [
      { amountCents: 1000, status: "SUCCEEDED" as const },
      { amountCents: -200, status: "SUCCEEDED" as const },
      { amountCents: 500, status: "PENDING" as const },
      { amountCents: 900, status: "FAILED" as const },
    ];
    expect(netAppliedCents(entries)).toBe(800);
  });
});

describe("outstandingCents", () => {
  it("subtracts applied and clamps at zero", () => {
    expect(outstandingCents(1000, [{ amountCents: 300, status: "SUCCEEDED" }])).toBe(700);
    expect(outstandingCents(1000, [{ amountCents: 1500, status: "SUCCEEDED" }])).toBe(0);
  });
});

describe("collectionRate", () => {
  it("computes a percentage", () => {
    expect(collectionRate(1000, [{ amountCents: 250, status: "SUCCEEDED" }])).toBe(25);
    expect(collectionRate(0, [])).toBe(0);
  });
});

describe("isOverdue", () => {
  it("flags past-due unpaid installments", () => {
    const past = new Date(Date.now() - 86400000);
    const future = new Date(Date.now() + 86400000);
    expect(isOverdue(past, "SCHEDULED")).toBe(true);
    expect(isOverdue(future, "SCHEDULED")).toBe(false);
    expect(isOverdue(past, "PAID")).toBe(false);
  });
});
