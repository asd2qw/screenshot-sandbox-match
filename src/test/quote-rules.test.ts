import { describe, it, expect } from "vitest";
import { lineTotal, quoteTotals, nextQuoteNumber } from "@/lib/quote-rules";

describe("quote rules", () => {
  it("line total = quantity × price, rounded to cents", () => {
    expect(lineTotal({ quantity: 2.5, unit_price: 10.333 })).toBe(25.83);
  });
  it("applies 21% VAT on the base", () => {
    expect(quoteTotals([{ quantity: 2, unit_price: 100 }, { quantity: 1, unit_price: 50 }], 21))
      .toEqual({ base: 250, vat: 52.5, total: 302.5 });
  });
  it("numbers continue per year and restart in a new year", () => {
    expect(nextQuoteNumber(["P-2026-001", "P-2026-007", "P-2025-020"], 2026)).toBe("P-2026-008");
    expect(nextQuoteNumber(["P-2026-007"], 2027)).toBe("P-2027-001");
  });
});
