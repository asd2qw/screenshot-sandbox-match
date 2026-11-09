import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { invoiceSchema, type InvoiceDraft, type Invoice } from '@/lib/invoice-rules';
import { quoteTotals } from '@/lib/quote-rules';
import { formatEUR } from '@/lib/format';
import { financeDataQuery } from '@/lib/finance-data';
type Data = Awaited<ReturnType<NonNullable<typeof financeDataQuery.queryFn>>>;
export function InvoiceEditor({ draft, data, onClose }: { draft: InvoiceDraft & { id?: string }; data: Data; onClose: () => void }) {
 const [f,setF]=useState(draft); const [saving,setSaving]=useState(false); const {data:user}=useCurrentUser(); const qc=useQueryClient();
 const set=(patch:Partial<InvoiceDraft>)=>setF({...f,...patch});
 async function save(){ const parsed=invoiceSchema.safeParse(f); if(!parsed.success){toast.error('Revisa cliente, título, fechas y partidas.');return;} if(!user)return; setSaving(true);
 try { const payload=parsed.data; const result=f.id?await supabase.from('invoices').update(payload).eq('id',f.id).eq('status','draft').select('id').single():await supabase.from('invoices').insert({...payload,company_id:user.companyId,created_by:user.id}).select('id').single(); if(result.error)throw result.error; await qc.invalidateQueries({queryKey:['finance-data']});toast.success('Borrador guardado');onClose(); }catch{toast.error('No se pudo guardar. Revisa los datos; el presupuesto puede estar ya facturado.');}finally{setSaving(false);} }
 const sel='h-9 w-full rounded-md border bg-background px-3 text-sm'; const t=quoteTotals(f.items,f.vat_rate);
 return <Dialog open onOpenChange={o=>!o&&!saving&&onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{f.id?'Editar borrador':'Nueva factura'}</DialogTitle></DialogHeader>
 <div className="grid gap-3 sm:grid-cols-2">
 <div className="sm:col-span-2"><Label htmlFor="source-quote">Desde presupuesto</Label><select id="source-quote" className={sel} value={f.quote_id??''} onChange={e=>{const q=data.quotes.find(q=>q.id===e.target.value);if(!q){set({quote_id:null});return;}set({quote_id:q.id,client_id:q.client_id??'',work_id:q.work_id,title:q.title,vat_rate:Number(q.vat_rate),notes:q.notes,items:[...q.quote_items].sort((a,b)=>a.position-b.position).map(i=>({description:i.description,unit:i.unit,quantity:Number(i.quantity),unit_price:Number(i.unit_price)}))});}}><option value="">Sin presupuesto</option>{data.quotes.filter(q=>q.client_id).map(q=><option key={q.id} value={q.id}>{q.number} · {q.title}</option>)}</select></div>
 <div className="sm:col-span-2"><Label htmlFor="invoice-title">Título *</Label><Input id="invoice-title" maxLength={200} value={f.title} onChange={e=>set({title:e.target.value})}/></div>
 <div><Label htmlFor="invoice-client">Cliente *</Label><select id="invoice-client" className={sel} value={f.client_id} disabled={!!f.quote_id} onChange={e=>set({client_id:e.target.value,work_id:null})}><option value="">Selecciona un cliente</option>{data.clients.filter(c=>c.active||c.id===f.client_id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
 <div><Label htmlFor="invoice-work">Obra</Label><select id="invoice-work" className={sel} disabled={!!f.quote_id} value={f.work_id??''} onChange={e=>set({work_id:e.target.value||null})}><option value="">Sin obra</option>{data.works.filter(w=>!w.client_id||w.client_id===f.client_id).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
 <div><Label htmlFor="invoice-date">Fecha *</Label><Input id="invoice-date" type="date" value={f.issue_date} onChange={e=>set({issue_date:e.target.value})}/></div>
 <div><Label htmlFor="invoice-due">Vencimiento</Label><Input id="invoice-due" type="date" value={f.due_date??''} onChange={e=>set({due_date:e.target.value||null})}/></div>
 <div><Label htmlFor="invoice-vat">IVA (%)</Label><Input id="invoice-vat" type="number" min={0} max={100} step="0.01" value={f.vat_rate} onChange={e=>set({vat_rate:Number(e.target.value)})}/></div></div>
 <div className="space-y-3">{f.items.map((it,index)=><div key={index} className="grid grid-cols-12 gap-2 border-b pb-3"><Input aria-label="Descripción" className="col-span-12" maxLength={500} value={it.description} onChange={e=>set({items:f.items.map((v,i)=>i===index?{...v,description:e.target.value}:v)})}/>{(['unit','quantity','unit_price'] as const).map(k=><Input key={k} className="col-span-3" aria-label={k==='unit'?'Unidad':k==='quantity'?'Cantidad':'Precio unitario'} type={k==='unit'?'text':'number'} step={k==='quantity'?'0.001':'0.01'} value={it[k]} onChange={e=>set({items:f.items.map((v,i)=>i===index?{...v,[k]:k==='unit'?e.target.value:Number(e.target.value)}:v)})}/>)}<Button className="col-span-3" variant="ghost" size="icon" aria-label="Quitar partida" disabled={f.items.length===1} onClick={()=>set({items:f.items.filter((_,i)=>i!==index)})}><X className="size-4"/></Button></div>)}</div>
 <Button variant="outline" className="w-fit" disabled={f.items.length>=100} onClick={()=>set({items:[...f.items,{description:'',unit:'ud',quantity:1,unit_price:0}]})}><Plus className="size-4"/>Añadir partida</Button>
 <div className="space-y-1 text-right text-sm"><p>Base imponible: {formatEUR(t.base)}</p><p>IVA: {formatEUR(t.vat)}</p><p className="text-lg font-bold">Total: {formatEUR(t.total)}</p></div>
 <div><Label htmlFor="invoice-notes">Notas y condiciones</Label><Textarea id="invoice-notes" maxLength={5000} value={f.notes??''} onChange={e=>set({notes:e.target.value})}/></div><DialogFooter><Button variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving} onClick={save}>{saving?'Guardando…':'Guardar borrador'}</Button></DialogFooter></DialogContent></Dialog>;
}
