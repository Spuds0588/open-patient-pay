// Money is always stored and computed as integer cents. These helpers are the
// only places allowed to cross the cents <-> display string boundary, and they
// use string math (never floats) so we cannot drift by a penny.

/** Parse a human-entered dollar string ("1,234.56", "$12.30", "5") into cents. */
export function dollarsToCents(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Amount must be a finite number");
    return Math.round(input * 100);
  }
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (cleaned === "") throw new Error("Amount is empty");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  const [whole, fraction = ""] = cleaned.split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const absWhole = whole.replace("-", "") || "0";
  const centsPart = (fraction + "00").slice(0, 2);
  return sign * (Number(absWhole) * 100 + Number(centsPart));
}

/** Format integer cents as a display string, e.g. 123456 -> "$1,234.56". */
export function formatCents(cents: number, opts: { sign?: boolean } = {}): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = dollars.toLocaleString("en-US");
  const sign = opts.sign && negative ? "-" : "";
  return `${sign}$${grouped}.${String(remainder).padStart(2, "0")}`;
}


