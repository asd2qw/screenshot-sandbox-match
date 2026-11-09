import { z } from 'zod';
import { quoteTotals } from './quote-rules';
import { balance, sumPaid } from './payment-rules';
export const invoiceLineSchema = z.object({ description: z.string().trim().min(1).max(500), unit: z.string().trim().min(1).max(30), quantity: z.number().finite().min(0.001).max(1000000), unit_price: z.number().finite().min(0).max(10000000) });
export const invoiceSchema = z.object({ title: z.string().trim().min(1).max(200), client_id: z.string().uuid(), work_id: z.string().uuid().nullable(), quote_id: z.string().uuid().nullable(), issue_date: z.string().date(), due_date: z.string().date().nullable(), vat_rate: z.number().finite().min(0).max(100), notes: z.string().max(5000).nullable(), items: z.array(invoiceLineSchema).min(1).max(100) }).refine(d => !d.due_date || d.due_date >= d.issue_date, { message: 'El vencimiento no puede ser anterior a la fecha.' });
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;
export type InvoiceDraft = z.infer<typeof invoiceSchema>;
export type Party = { name: string; tax_id: string | null; address: string | null; email?: string | null; phone?: string | null };
export type Invoice = InvoiceDraft & { id: string; number: string | null; status: 'draft' | 'issued' | 'cancelled'; issuer: Party | null; recipient: Party | null };
export type InvoicePayment = { invoice_id: string | null; quote_id: string | null; amount: number | string; payment_date: string };
export function invoiceBalance(invoice: Invoice, payments: InvoicePayment[], until = '') {
 const linked = payments.filter(p => (!until || p.payment_date <= until) && (p.invoice_id === invoice.id || (!p.invoice_id && !!invoice.quote_id && p.quote_id === invoice.quote_id)));
 return balance(quoteTotals(invoice.items, invoice.vat_rate).total, sumPaid(linked));
}
export function madridToday() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date()); }
