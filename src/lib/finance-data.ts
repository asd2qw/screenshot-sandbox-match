import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invoiceSchema, type Invoice, type Party } from './invoice-rules';
export async function loadFinanceData() {
 const [invoices, payments, expenses, quotes, clients, works, company] = await Promise.all([
  supabase.from('invoices').select('*').order('created_at',{ascending:false}),
  supabase.from('payments').select('*').order('payment_date',{ascending:false}),
  supabase.from('expenses').select('*').order('expense_date',{ascending:false}),
  supabase.from('quotes').select('*, quote_items(*)'),
  supabase.from('clients').select('*').order('name'),
  supabase.from('works').select('id,name,client_id').order('name'),
  supabase.from('companies').select('*').single(),
 ]);
 for(const r of [invoices,payments,expenses,quotes,clients,works,company]) if(r.error) throw r.error;
 return { invoices: (invoices.data ?? []).map(i => ({ ...invoiceSchema.parse(i), id:i.id, number:i.number, status:i.status as Invoice['status'], issuer:i.issuer as Party|null, recipient:i.recipient as Party|null })), payments:payments.data??[], expenses:expenses.data??[], quotes:quotes.data??[], clients:clients.data??[], works:works.data??[], company:company.data };
}
export type FinanceData = Awaited<ReturnType<typeof loadFinanceData>>;
export const financeDataQuery = queryOptions({ queryKey: ['finance-data'], queryFn: loadFinanceData });
