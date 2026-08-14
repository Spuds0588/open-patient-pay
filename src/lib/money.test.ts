import { describe, expect, it } from "vitest";
import { dollarsToCents, formatCents } from "./money";

describe("dollarsToCents", () => {
  it("parses common formats", () => {
    expect(dollarsToCents("1240.00")).toBe(124000);
    expect(dollarsToCents("$1,234.56")).toBe(123456);
    expect(dollarsToCents("5")).toBe(500);
    expect(dollarsToCents("5.5")).toBe(550);
    expect(dollarsToCents("0.01")).toBe(1);
    expect(dollarsToCents("-10.25")).toBe(-1025);
    expect(dollarsToCents(12.3)).toBe(1230);
  });

  it("rejects garbage", () => {
    expect(() => dollarsToCents("abc")).toThrow();
    expect(() => dollarsToCents("12.345")).toThrow();
    expect(() => dollarsToCents("")).toThrow();
  });
});

describe("formatCents", () => {
  it("formats with grouping and two decimals", () => {
    expect(formatCents(124000)).toBe("$1,240.00");
    expect(formatCents(1)).toBe("$0.01");
    expect(formatCents(0)).toBe("$0.00");
  });

  it("handles negatives with sign option", () => {
    expect(formatCents(-1025)).toBe("$10.25");
    expect(formatCents(-1025, { sign: true })).toBe("-$10.25");
  });
});

