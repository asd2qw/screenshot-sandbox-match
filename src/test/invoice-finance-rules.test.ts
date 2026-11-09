import { describe,it,expect } from 'vitest';
import { invoiceSchema,invoiceBalance,type Invoice } from '@/lib/invoice-rules';
import { cashSummary } from '@/lib/finance-rules';
const invoice:Invoice={id:'i',title:'Obra',client_id:'00000000-0000-0000-0000-000000000001',work_id:null,quote_id:null,issue_date:'2026-11-09',due_date:null,vat_rate:21,notes:null,items:[{description:'Trabajo',unit:'ud',quantity:1,unit_price:100}],number:'F-2026-001',status:'issued',issuer:null,recipient:null};
describe('invoices',()=>{
 it('validates invoice lines and due dates',()=>{expect(invoiceSchema.safeParse(invoice).success).toBe(true);expect(invoiceSchema.safeParse({...invoice,due_date:'2026-11-08'}).success).toBe(false);expect(invoiceSchema.safeParse({...invoice,items:[]}).success).toBe(false);expect(invoiceSchema.safeParse({...invoice,items:[{...invoice.items[0],quantity:0}]}).success).toBe(false);});
 it('counts linked quote receipts once and excludes other invoice receipts',()=>{expect(invoiceBalance({...invoice,quote_id:'q'},[{invoice_id:'i',quote_id:'q',amount:40,payment_date:'2026-11-09'},{invoice_id:null,quote_id:'q',amount:20,payment_date:'2026-11-08'},{invoice_id:'other',quote_id:'q',amount:999,payment_date:'2026-11-08'}])).toEqual({paid:60,pending:61,overpaid:0});});
 it('uses an inclusive cutoff and reports overpayment',()=>{expect(invoiceBalance(invoice,[{invoice_id:'i',quote_id:'q',amount:130,payment_date:'2026-11-10'}],'2026-11-09').pending).toBe(121);expect(invoiceBalance(invoice,[{invoice_id:'i',quote_id:'q',amount:130,payment_date:'2026-11-09'}],'2026-11-09').overpaid).toBe(9);});
});
describe('finance',()=>{
 it('filters receipts and work costs by client and inclusive dates',()=>{const summary=cashSummary([{amount:100,payment_date:'2026-11-09',client_id:'a',work_id:'w'},{amount:50,payment_date:'2026-11-10',client_id:'a',work_id:'w'}],[{amount:30,expense_date:'2026-11-09',work_id:'w'},{amount:20,expense_date:'2026-11-09',work_id:null}],[{id:'w',client_id:'a'}],{clientId:'a',workId:'',from:'2026-11-09',to:'2026-11-09'});expect(summary.paid).toBe(100);expect(summary.spent).toBe(30);expect(summary.net).toBe(70);});
});
