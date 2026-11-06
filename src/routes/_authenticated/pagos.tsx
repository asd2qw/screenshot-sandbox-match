import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { OwnerOnly, PageHeader } from "@/components/page-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, formatEUR } from "@/lib/format";
import { quoteTotals } from "@/lib/quote-rules";
import { balance, sumPaid, filterPayments, filterQuotes, paymentsForBalance, EMPTY_PAYMENT_FILTERS, type PaymentFilters } from "@/lib/payment-rules";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => pageHead("Pagos", "Cobros de clientes por presupuesto y obra, con saldo pendiente."),
  component: () => <OwnerOnly><Pagos /></OwnerOnly>,
});

const METHODS: Record<string, string> = { transfer: "Transferencia", cash: "Efectivo", card: "Tarjeta", bizum: "Bizum", check: "Cheque", other: "Otro" };

type Payment = {
  id: string; client_id: string | null; quote_id: string | null; work_id: string | null; amount: number;
  payment_date: string; method: string; reference: string | null; notes: string | null;
};
type QuoteRow = { id: string; number: string; title: string; client_id: string | null; work_id: string | null; vat_rate: number; status: string; quote_items: { quantity: number; unit_price: number }[] };

function Pagos() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Payment> | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const [filters, setFilters] = useState<PaymentFilters>(EMPTY_PAYMENT_FILTERS);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase.from("payments").select("*").order("payment_date", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes-balance"],
    queryFn: async (): Promise<QuoteRow[]> => (await supabase.from("quotes").select("id, number, title, client_id, work_id, vat_rate, status, quote_items(quantity, unit_price)").order("number", { ascending: false })).data as QuoteRow[] ?? [],
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-min"], queryFn: async () => (await supabase.from("clients").select("id, name, active").order("name")).data ?? [] });
  const { data: works = [] } = useQuery({ queryKey: ["works-min"], queryFn: async () => (await supabase.from("works").select("id, name").order("name")).data ?? [] });
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name;
  const workName = (id: string | null) => works.find((w) => w.id === id)?.name;
  const quoteOf = (id: string | null) => quotes.find((q) => q.id === id);

  const shown = filterPayments(payments, filters);
  const tracked = filterQuotes(quotes, filters).filter((q) => q.status === "accepted" || payments.some((p) => p.quote_id === q.id));
  const paidFor = (qid: string) => sumPaid(paymentsForBalance(payments, qid, filters));
  const totalPaid = sumPaid(shown);
  const totalPending = tracked.reduce((s, q) => s + balance(quoteTotals(q.quote_items, q.vat_rate).total, paidFor(q.id)).pending, 0);
  const filtered = filters.clientId || filters.workId || filters.from || filters.to;

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("payments").delete().eq("id", deleting.id);
    if (error) toast.error("No se pudo eliminar el pago.");
    else { toast.success("Pago eliminado"); qc.invalidateQueries({ queryKey: ["payments"] }); }
    setDeleting(null);
  }

  return (
    <div>
      <PageHeader title="Pagos" description="Cobros de clientes"
        actions={<Button onClick={() => setEditing({ payment_date: new Date().toISOString().slice(0, 10), method: "transfer" })}><Plus className="size-4" /> Registrar pago</Button>} />
      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-3 shadow-card sm:grid-cols-2 lg:grid-cols-5">
        <div><Label htmlFor="f-client">Cliente</Label>
          <select id="f-client" className={sel} value={filters.clientId} onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}>
            <option value="">Todos</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><Label htmlFor="f-work">Obra</Label>
          <select id="f-work" className={sel} value={filters.workId} onChange={(e) => setFilters({ ...filters, workId: e.target.value })}>
            <option value="">Todas</option>{works.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select></div>
        <div><Label htmlFor="f-from">Desde</Label><Input id="f-from" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></div>
        <div><Label htmlFor="f-to">Hasta</Label><Input id="f-to" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></div>
        <div className="flex items-end"><Button variant="outline" className="w-full" disabled={!filtered} onClick={() => setFilters(EMPTY_PAYMENT_FILTERS)}>Quitar filtros</Button></div>
        {filters.from && filters.to && filters.from > filters.to && <p className="text-sm text-destructive sm:col-span-2 lg:col-span-5">La fecha «Desde» es posterior a «Hasta».</p>}
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-card"><p className="text-sm text-muted-foreground">Cobrado</p><p className="font-display text-2xl font-bold">{formatEUR(totalPaid)}</p></div>
        <div className="rounded-lg border bg-card p-4 shadow-card"><p className="text-sm text-muted-foreground">Pendiente de presupuestos aceptados{filters.to ? ` (a ${formatDate(filters.to)})` : ""}</p><p className="font-display text-2xl font-bold text-primary">{formatEUR(totalPending)}</p></div>
      </div>

      <h2 className="mb-2 font-semibold">Saldo por presupuesto</h2>
      {tracked.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">No hay presupuestos aceptados ni con pagos.</p>
      ) : (
        <div className="mb-6 space-y-2">
          {tracked.map((q) => {
            const total = quoteTotals(q.quote_items, q.vat_rate).total;
            const b = balance(total, paidFor(q.id));
            const pct = total > 0 ? Math.min(100, (b.paid / total) * 100) : 0;
            return (
              <div key={q.id} className="rounded-lg border bg-card p-3 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold"><span className="text-primary">{q.number}</span> · {q.title}</p>
                    <p className="text-xs text-muted-foreground">{clientName(q.client_id) ?? "Sin cliente"}{workName(q.work_id) ? ` · ${workName(q.work_id)}` : ""}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Total {formatEUR(total)} · Pagado {formatEUR(b.paid)}</p>
                    <p className="font-semibold">{b.overpaid > 0 ? `Pagado de más: ${formatEUR(b.overpaid)}` : `Pendiente: ${formatEUR(b.pending)}`}</p>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-2 font-semibold">Pagos registrados</h2>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : shown.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">{payments.length === 0 ? "Todavía no hay pagos." : "Ningún pago coincide con los filtros."}</div>
      ) : (
        <div className="space-y-2">
          {shown.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{clientName(p.client_id) ?? "Sin cliente"}{quoteOf(p.quote_id) ? ` · ${quoteOf(p.quote_id)!.number}` : ""}</p>
                <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)} · {METHODS[p.method]}{workName(p.work_id) ? ` · ${workName(p.work_id)}` : ""}{p.reference ? ` · ${p.reference}` : ""}</p>
              </div>
              <p className="font-display text-lg font-bold">{formatEUR(Number(p.amount))}</p>
              <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="size-4" /> Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleting(p)} aria-label="Eliminar"><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}
      {editing && <PaymentDialog payment={editing} quotes={quotes} clients={clients} works={works} onClose={() => setEditing(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PaymentDialog({ payment, quotes, clients, works, onClose }: {
  payment: Partial<Payment>; quotes: QuoteRow[]; clients: { id: string; name: string; active: boolean }[];
  works: { id: string; name: string }[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [f, setF] = useState({
    quote_id: payment.quote_id ?? "", client_id: payment.client_id ?? "", work_id: payment.work_id ?? "",
    amount: payment.amount != null ? String(payment.amount) : "", payment_date: payment.payment_date ?? "",
    method: payment.method ?? "transfer", reference: payment.reference ?? "", notes: payment.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  function pickQuote(id: string) {
    const q = quotes.find((x) => x.id === id);
    setF({ ...f, quote_id: id, client_id: q?.client_id ?? f.client_id, work_id: q?.work_id ?? f.work_id });
  }
  async function save() {
    const amount = Number(f.amount.replace(",", "."));
    if (!(amount > 0)) { toast.error("El importe debe ser mayor que 0."); return; }
    if (!f.payment_date) { toast.error("La fecha es obligatoria."); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      quote_id: f.quote_id || null, client_id: f.client_id || null, work_id: f.work_id || null, amount,
      payment_date: f.payment_date, method: f.method, reference: f.reference.trim() || null, notes: f.notes.trim() || null,
    };
    const { error } = payment.id
      ? await supabase.from("payments").update(payload).eq("id", payment.id)
      : await supabase.from("payments").insert({ ...payload, company_id: user.companyId, created_by: user.id });
    setSaving(false);
    if (error) { toast.error("No se pudo guardar el pago."); return; }
    toast.success(payment.id ? "Pago actualizado" : "Pago registrado");
    qc.invalidateQueries({ queryKey: ["payments"] });
    onClose();
  }
  const sel = "h-9 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{payment.id ? "Editar pago" : "Registrar pago"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="quote">Presupuesto</Label>
            <select id="quote" className={sel} value={f.quote_id} onChange={(e) => pickQuote(e.target.value)}>
              <option value="">Sin presupuesto</option>
              {quotes.map((q) => <option key={q.id} value={q.id}>{q.number} · {q.title}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pclient">Cliente</Label>
            <select id="pclient" className={sel} value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })}>
              <option value="">Sin cliente</option>
              {clients.filter((c) => c.active || c.id === f.client_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwork">Obra</Label>
            <select id="pwork" className={sel} value={f.work_id} onChange={(e) => setF({ ...f, work_id: e.target.value })}>
              <option value="">Sin obra</option>
              {works.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="pamount">Importe (€) *</Label><Input id="pamount" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="pdate">Fecha *</Label><Input id="pdate" type="date" value={f.payment_date} onChange={(e) => setF({ ...f, payment_date: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="method">Forma de pago</Label>
            <select id="method" className={sel} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
              {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="ref">Referencia</Label><Input id="ref" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pnotes">Notas</Label><Textarea id="pnotes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
