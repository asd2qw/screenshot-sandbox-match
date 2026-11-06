const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function sumPaid(payments: { amount: number | string }[]): number {
  return r2(payments.reduce((s, p) => s + Number(p.amount), 0));
}

/** Pending = total − paid; never below zero. Overpaid amount reported separately. */
export function balance(total: number, paid: number) {
  const diff = r2(total - paid);
  return { paid: r2(paid), pending: Math.max(0, diff), overpaid: Math.max(0, -diff) };
}

export type PaymentFilters = { clientId: string; workId: string; from: string; to: string };
export const EMPTY_PAYMENT_FILTERS: PaymentFilters = { clientId: "", workId: "", from: "", to: "" };

type Linked = { client_id: string | null; work_id: string | null };

/** Client/work match; empty filter matches everything. */
function matchesLinks(row: Linked, f: PaymentFilters) {
  return (!f.clientId || row.client_id === f.clientId) && (!f.workId || row.work_id === f.workId);
}

/** Payments matching client, work and the inclusive date range (YYYY-MM-DD). */
export function filterPayments<T extends Linked & { payment_date: string }>(payments: T[], f: PaymentFilters): T[] {
  return payments.filter((p) => matchesLinks(p, f) && (!f.from || p.payment_date >= f.from) && (!f.to || p.payment_date <= f.to));
}

/** Quotes matching client and work (dates do not hide a quote). */
export function filterQuotes<T extends Linked>(quotes: T[], f: PaymentFilters): T[] {
  return quotes.filter((q) => matchesLinks(q, f));
}

/** Payments counted for a quote's pending balance: all of them up to the range end date. */
export function paymentsForBalance<T extends { quote_id: string | null; payment_date: string }>(payments: T[], quoteId: string, f: PaymentFilters): T[] {
  return payments.filter((p) => p.quote_id === quoteId && (!f.to || p.payment_date <= f.to));
}
