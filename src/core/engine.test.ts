import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsClamped,
  buildSchedule,
  dueDateForIndex,
  recalculateRemaining,
  splitEvenly,
  termMonths,
} from "./engine";

describe("splitEvenly", () => {
  it("splits exactly with remainder front-loaded", () => {
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]);
    expect(splitEvenly(100, 6)).toEqual([17, 17, 17, 17, 16, 16]);
    expect(splitEvenly(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("rejects bad parts", () => {
    expect(() => splitEvenly(100, 0)).toThrow();
    expect(() => splitEvenly(100, -1)).toThrow();
  });
});

describe("date arithmetic", () => {
  it("adds days without DST drift", () => {
    const start = new Date(Date.UTC(2026, 0, 15));
    expect(addDays(start, 7).toISOString()).toBe("2026-01-22T00:00:00.000Z");
  });

  it("clamps month-end dates", () => {
    const jan31 = new Date(Date.UTC(2026, 0, 31));
    expect(addMonthsClamped(jan31, 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    // Leap year.
    const jan31Leap = new Date(Date.UTC(2024, 0, 31));
    expect(addMonthsClamped(jan31Leap, 1).toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });
});

describe("dueDateForIndex", () => {
  const start = new Date(Date.UTC(2026, 6, 1));

  it("spaces monthly installments", () => {
    expect(dueDateForIndex("MONTH", 1, start, 5).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("spaces weekly installments", () => {
    expect(dueDateForIndex("WEEK", 1, start, 3).toISOString()).toBe("2026-07-22T00:00:00.000Z");
  });

  it("spaces bi-weekly (interval 2) installments", () => {
    expect(dueDateForIndex("WEEK", 2, start, 2).toISOString()).toBe("2026-07-29T00:00:00.000Z");
  });

  it("spaces day-based installments", () => {
    expect(dueDateForIndex("DAY", 30, start, 2).toISOString()).toBe("2026-08-30T00:00:00.000Z");
  });

  it("spaces custom monthly intervals (e.g. every 2 months)", () => {
    // index 2 with interval 2 = 4 months after the first payment.
    expect(dueDateForIndex("MONTH", 2, start, 2).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("buildSchedule", () => {
  const firstPaymentAt = new Date(Date.UTC(2026, 0, 1));

  it("builds a schedule whose parts sum to the total", () => {
    const s = buildSchedule({
      totalCents: 124000,
      count: 6,
      periodUnit: "MONTH",
      periodValue: 1,
      firstPaymentAt,
    });
    expect(s.lines).toHaveLength(6);
    expect(s.lines.reduce((a, l) => a + l.amountCents, 0)).toBe(124000);
    expect(s.lines[0].dueDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("puts the first payment on the first-payment date", () => {
    const s = buildSchedule({
      totalCents: 1000,
      count: 3,
      periodUnit: "DAY",
      periodValue: 30,
      firstPaymentAt,
    });
    expect(s.lines[0].dueDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(s.lines[1].dueDate.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(s.lines[2].dueDate.toISOString()).toBe("2026-03-02T00:00:00.000Z");
  });

  it("rejects invalid inputs", () => {
    expect(() =>
      buildSchedule({ totalCents: 100.5, count: 3, periodUnit: "MONTH", periodValue: 1, firstPaymentAt })
    ).toThrow();
    expect(() =>
      buildSchedule({ totalCents: 100, count: 0, periodUnit: "MONTH", periodValue: 1, firstPaymentAt })
    ).toThrow();
    expect(() =>
      buildSchedule({ totalCents: 100, count: 3, periodUnit: "MONTH", periodValue: 0, firstPaymentAt })
    ).toThrow();
  });
});

describe("termMonths", () => {
  it("approximates plan length", () => {
    expect(termMonths("MONTH", 1, 6)).toBeCloseTo(6);
    expect(termMonths("WEEK", 1, 12)).toBeCloseTo(2.76, 1);
    expect(termMonths("DAY", 30, 3)).toBeCloseTo(2.96, 1);
    expect(termMonths("MONTH", 2, 6)).toBeCloseTo(12);
  });
});

describe("recalculateRemaining", () => {
  it("keeps paid installments and redistributes the rest", () => {
    const amounts = [100, 100, 100, 100];
    const paid = [true, false, false, false];
    expect(recalculateRemaining(amounts, paid, 400)).toEqual([100, 100, 100, 100]);
  });

  it("handles a reduced balance (write-off)", () => {
    const amounts = [100, 100, 100, 100];
    const paid = [true, false, false, false];
    expect(recalculateRemaining(amounts, paid, 250)).toEqual([100, 50, 50, 50]);
  });

  it("zeroes unpaid when the balance drops below what was paid", () => {
    const amounts = [100, 100, 100, 100];
    const paid = [true, true, false, false];
    expect(recalculateRemaining(amounts, paid, 150)).toEqual([100, 100, 0, 0]);
  });

  it("validates matching lengths", () => {
    expect(() => recalculateRemaining([1, 2], [true], 10)).toThrow();
  });
});
