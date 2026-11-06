import { describe, expect, it } from "vitest";
import { EMPTY_PAYMENT_FILTERS as E, filterPayments, filterQuotes, paymentsForBalance, sumPaid } from "@/lib/payment-rules";

const pays = [
  { id: "1", client_id: "c1", work_id: "w1", quote_id: "q1", payment_date: "2026-01-10", amount: 100 },
  { id: "2", client_id: "c1", work_id: "w2", quote_id: "q2", payment_date: "2026-02-15", amount: 200 },
  { id: "3", client_id: "c2", work_id: "w3", quote_id: null, payment_date: "2026-03-01", amount: 50 },
];

describe("payment filters", () => {
  it("filters by client", () => expect(filterPayments(pays, { ...E, clientId: "c1" }).map((p) => p.id)).toEqual(["1", "2"]));
  it("filters by work", () => expect(filterPayments(pays, { ...E, workId: "w2" }).map((p) => p.id)).toEqual(["2"]));
  it("date range is inclusive on both ends", () =>
    expect(filterPayments(pays, { ...E, from: "2026-01-10", to: "2026-02-15" }).map((p) => p.id)).toEqual(["1", "2"]));
  it("paid total follows filters", () => expect(sumPaid(filterPayments(pays, { ...E, clientId: "c1", from: "2026-02-01" }))).toBe(200));
  it("quotes filter by client and work only", () =>
    expect(filterQuotes([{ client_id: "c1", work_id: "w1" }, { client_id: "c2", work_id: "w1" }], { ...E, clientId: "c1", from: "2030-01-01" })).toHaveLength(1));
  it("pending balance counts payments up to range end", () => {
    const extra = [...pays, { id: "4", client_id: "c1", work_id: "w1", quote_id: "q1", payment_date: "2026-05-01", amount: 30 }];
    expect(sumPaid(paymentsForBalance(extra, "q1", { ...E, to: "2026-04-30" }))).toBe(100);
    expect(sumPaid(paymentsForBalance(extra, "q1", E))).toBe(130);
  });
});
