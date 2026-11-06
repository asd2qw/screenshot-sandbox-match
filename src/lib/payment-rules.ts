const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function sumPaid(payments: { amount: number | string }[]): number {
  return r2(payments.reduce((s, p) => s + Number(p.amount), 0));
}

/** Pending = total − paid; never below zero. Overpaid amount reported separately. */
export function balance(total: number, paid: number) {
  const diff = r2(total - paid);
  return { paid: r2(paid), pending: Math.max(0, diff), overpaid: Math.max(0, -diff) };
}
