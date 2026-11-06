export type QuoteLine = { quantity: number; unit_price: number };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(l: QuoteLine): number {
  return round2((Number(l.quantity) || 0) * (Number(l.unit_price) || 0));
}

/** Base = sum of rounded lines; VAT on base, rounded to cents. */
export function quoteTotals(lines: QuoteLine[], vatRate: number) {
  const base = round2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const vat = round2((base * (Number(vatRate) || 0)) / 100);
  return { base, vat, total: round2(base + vat) };
}

/** Next number like P-2026-003 given existing numbers of the company. */
export function nextQuoteNumber(existing: string[], year: number): string {
  const prefix = `P-${year}-`;
  const max = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
