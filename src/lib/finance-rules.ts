import { sumPaid } from './payment-rules';
import { sumExpenses } from './expense-rules';
export type FinanceFilters = { clientId: string; workId: string; from: string; to: string };
export function inPeriod(date: string, f: FinanceFilters) { return (!f.from || date >= f.from) && (!f.to || date <= f.to); }
export function cashSummary<P extends { amount: number | string; payment_date: string; client_id: string | null; work_id: string | null }, E extends { amount: number | string; expense_date: string; work_id: string | null }>(payments: P[], expenses: E[], works: { id: string; client_id: string | null }[], f: FinanceFilters) {
 const receipts = payments.filter(p => inPeriod(p.payment_date,f) && (!f.clientId || p.client_id===f.clientId) && (!f.workId || p.work_id===f.workId));
 const costs = expenses.filter(e => inPeriod(e.expense_date,f) && (!f.workId || e.work_id===f.workId) && (!f.clientId || works.some(w => w.id===e.work_id && w.client_id===f.clientId)));
 const paid=sumPaid(receipts), spent=sumExpenses(costs);
 return { paid, spent, net: Math.round((paid-spent)*100)/100, receipts, costs };
}
