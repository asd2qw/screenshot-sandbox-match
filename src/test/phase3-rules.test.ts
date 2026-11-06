import { describe, it, expect } from "vitest";
import { stockFrom, validateMovement, isLowStock } from "@/lib/stock-rules";
import { balance, sumPaid } from "@/lib/payment-rules";
import { parseReceiptExtraction } from "@/lib/receipt-rules";

describe("stock", () => {
  it("stock = entradas − salidas", () => {
    expect(stockFrom([{ kind: "in", quantity: 10 }, { kind: "out", quantity: "3.5" }])).toBe(6.5);
  });
  it("cannot take out more than available", () => {
    expect(validateMovement("out", 7, 6.5)).not.toBeNull();
    expect(validateMovement("out", 6.5, 6.5)).toBeNull();
  });
  it("low stock when at or below minimum", () => {
    expect(isLowStock(5, 5)).toBe(true);
    expect(isLowStock(5, 0)).toBe(false);
  });
});

describe("payments", () => {
  it("pending = quote total − paid", () => {
    expect(balance(302.5, sumPaid([{ amount: 100 }, { amount: "50.25" }]))).toEqual({ paid: 150.25, pending: 152.25, overpaid: 0 });
  });
  it("overpayment is reported, pending stays 0", () => {
    expect(balance(100, 120)).toEqual({ paid: 120, pending: 0, overpaid: 20 });
  });
});

describe("receipt extraction", () => {
  it("keeps valid values", () => {
    expect(parseReceiptExtraction('{"supplier":"Leroy Merlin","date":"2026-11-05","total":121,"vat":21}'))
      .toEqual({ supplier: "Leroy Merlin", date: "2026-11-05", total: 121, vat: 21 });
  });
  it("drops VAT not smaller than total and bad dates", () => {
    expect(parseReceiptExtraction('{"supplier":null,"date":"05/11/2026","total":10,"vat":10}'))
      .toEqual({ supplier: null, date: null, total: 10, vat: null });
  });
  it("returns null for non-JSON", () => {
    expect(parseReceiptExtraction("no")).toBeNull();
  });
});
