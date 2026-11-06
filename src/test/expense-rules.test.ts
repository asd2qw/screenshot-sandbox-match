import { describe, it, expect } from "vitest";
import { validateExpense, sumExpenses } from "@/lib/expense-rules";

describe("expense rules", () => {
  it("rejects zero or negative amounts", () => {
    expect(validateExpense({ description: "x", amount: 0, date: "2026-11-05" })).not.toBeNull();
  });
  it("rejects amounts above 1.000.000 €", () => {
    expect(validateExpense({ description: "x", amount: 1_000_000.01, date: "2026-11-05" })).not.toBeNull();
    expect(validateExpense({ description: "x", amount: 1_000_000, date: "2026-11-05" })).toBeNull();
  });
  it("sums to cents", () => {
    expect(sumExpenses([{ amount: "10.10" }, { amount: 0.2 }])).toBe(10.3);
  });
});
