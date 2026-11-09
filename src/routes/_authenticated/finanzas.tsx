import { pageHead } from '@/lib/page-head';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { OwnerOnly, PageHeader } from '@/components/page-helpers';
import { Button } from '@/components/ui/button';
import { FinanceFiltersBar, emptyFinanceFilters } from '@/components/finance-filters';
import { financeDataQuery } from '@/lib/finance-data';
import { cashSummary } from '@/lib/finance-rules';
import { invoiceBalance } from '@/lib/invoice-rules';
import { quoteTotals } from '@/lib/quote-rules';
import { balance, sumPaid } from '@/lib/payment-rules';
import { formatDate, formatEUR } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/expense-rules';
export const Route=createFileRoute('/_authenticated/finanzas')({head:()=>pageHead('Finanzas','Cobros, gastos, saldo de caja y pendientes por cliente y obra.'),component:()=> <OwnerOnly><Finanzas/></OwnerOnly>});
function Finanzas(){const {data}=useSuspenseQuery(financeDataQuery);const [f,setF]=useState(emptyFinanceFilters);const s=cashSummary(data.payments,data.expenses,data.works,f);
 const matches=(r:{client_id:string|null;work_id:string|null})=>(!f.clientId||r.client_id===f.clientId)&&(!f.workId||r.work_id===f.workId);
 const issued=data.invoices.filter(i=>i.status==='issued'&&matches(i)&&(!f.to||i.issue_date<=f.to));
 const activeQuoteIds=new Set(data.invoices.filter(i=>i.status==='issued').map(i=>i.quote_id));
 const quotePending=data.quotes.filter(q=>q.status==='accepted'&&matches(q)&&!activeQuoteIds.has(q.id)&&(!f.to||q.issue_date<=f.to)).map(q=>({id:q.id,title:`${q.number} · ${q.title}`,client:q.client_id,total:quoteTotals(q.quote_items,Number(q.vat_rate)).total,...balance(quoteTotals(q.quote_items,Number(q.vat_rate)).total,sumPaid(data.payments.filter(p=>p.quote_id===q.id&&(!f.to||p.payment_date<=f.to))))}));
 const outstanding=[...issued.map(i=>({id:i.id,title:`${i.number} · ${i.title}`,client:i.client_id,total:quoteTotals(i.items,i.vat_rate).total,...invoiceBalance(i,data.payments,f.to)})),...quotePending];
 const pending=outstanding.reduce((n,r)=>n+r.pending,0);
 const months=[...new Set([...s.receipts.map(p=>p.payment_date.slice(0,7)),...s.costs.map(e=>e.expense_date.slice(0,7))])].sort().reverse();
 return <div><PageHeader title="Finanzas" description="Cobros, gastos y saldo de caja" actions={<Button variant="outline" asChild><Link to="/facturas">Facturas</Link></Button>}/><FinanceFiltersBar filters={f} onChange={setF} clients={data.clients} works={data.works}/>
 <div className="mb-8 grid gap-4 border-y py-5 sm:grid-cols-2 xl:grid-cols-4">{[['Cobrado',s.paid],['Gastos',s.spent],['Saldo de caja',s.net],['Pendiente acumulado',pending]].map(([label,value])=><div key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${Number(value)<0?'text-destructive':label==='Saldo de caja'?'text-success':'text-foreground'}`}>{formatEUR(Number(value))}</p></div>)}</div>
 <h2 className="mb-3 text-lg font-semibold">Evolución mensual</h2>{!months.length?<p className="mb-8 text-sm text-muted-foreground">No hay cobros ni gastos en este periodo.</p>:<div className="mb-8 overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-muted-foreground"><tr>{['Mes','Cobrado','Gastos','Saldo de caja'].map(l=><th key={l} className="px-3 py-3 text-right first:text-left">{l}</th>)}</tr></thead><tbody>{months.map(m=>{const paid=sumPaid(s.receipts.filter(p=>p.payment_date.startsWith(m))),spent=sumPaid(s.costs.filter(e=>e.expense_date.startsWith(m)));return <tr key={m} className="border-b"><td className="px-3 py-3">{m.slice(5)}/{m.slice(0,4)}</td><td className="px-3 py-3 text-right">{formatEUR(paid)}</td><td className="px-3 py-3 text-right">{formatEUR(spent)}</td><td className="px-3 py-3 text-right font-semibold">{formatEUR(paid-spent)}</td></tr>;})}</tbody></table></div>}
 <div className="grid gap-8 lg:grid-cols-2"><section><h2 className="mb-3 text-lg font-semibold">Pendientes {f.to?`a ${formatDate(f.to)}`:''}</h2>{!outstanding.some(r=>r.pending>0)?<p className="text-sm text-muted-foreground">No hay importes pendientes.</p>:outstanding.filter(r=>r.pending>0).map(r=><div key={r.id} className="flex items-start justify-between gap-3 border-b py-3"><div className="min-w-0"><p className="break-words font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{data.clients.find(c=>c.id===r.client)?.name??'Sin cliente'}</p></div><p className="shrink-0 font-semibold">{formatEUR(r.pending)}</p></div>)}</section><section><h2 className="mb-3 text-lg font-semibold">Gastos por categoría</h2>{!s.costs.length?<p className="text-sm text-muted-foreground">No hay gastos en este periodo.</p>:Object.entries(EXPENSE_CATEGORIES).map(([key,label])=>{const rows=s.costs.filter(e=>e.category===key);return rows.length?<div key={key} className="flex justify-between gap-3 border-b py-3"><span>{label}</span><strong>{formatEUR(sumPaid(rows))}</strong></div>:null;})}</section></div>
 </div>;
}
