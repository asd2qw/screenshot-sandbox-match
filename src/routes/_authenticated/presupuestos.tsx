import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { OwnerOnly, PageHeader } from "@/components/page-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, formatEUR } from "@/lib/format";
import { lineTotal, quoteTotals, nextQuoteNumber } from "@/lib/quote-rules";
import { StatusSelect } from "@/components/phase2-shared";

export const Route = createFileRoute("/_authenticated/presupuestos")({
  head: () => pageHead("Presupuestos", "Presupuestos para clientes con partidas e IVA."),
  component: () => <OwnerOnly><Presupuestos /></OwnerOnly>,
});

const QUOTE_STATUS: Record<string, string> = { draft: "Borrador", sent: "Enviado", accepted: "Aceptado", rejected: "Rechazado" };

type Item = { id?: string; description: string; unit: string; quantity: number; unit_price: number };
type Quote = {
  id: string; number: string; title: string; status: string; client_id: string | null; work_id: string | null;
  issue_date: string; valid_until: string | null; vat_rate: number; notes: string | null; quote_items: Item[];
};

function Presupuestos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Quote> | null>(null);
  const [deleting, setDeleting] = useState<Quote | null>(null);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async (): Promise<Quote[]> => {
      const { data, error } = await supabase.from("quotes").select("*, quote_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Quote[]).map((q) => ({ ...q, quote_items: [...q.quote_items].sort((a, b) => ((a as { position?: number }).position ?? 0) - ((b as { position?: number }).position ?? 0)) }));
    },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-min"], queryFn: async () => (await supabase.from("clients").select("id, name, active").order("name")).data ?? [] });
  const { data: works = [] } = useQuery({ queryKey: ["works-min"], queryFn: async () => (await supabase.from("works").select("id, name").order("name")).data ?? [] });
  const { data: user } = useCurrentUser();
  const { data: company } = useQuery({
    queryKey: ["company-vat"], enabled: !!user,
    queryFn: async () => (await supabase.from("companies").select("default_vat").eq("id", user!.companyId).maybeSingle()).data,
  });
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name;

  const filtered = quotes.filter((q) => `${q.number} ${q.title} ${clientName(q.client_id) ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  function startNew() {
    setEditing({
      number: nextQuoteNumber(quotes.map((q) => q.number), new Date().getFullYear()),
      title: "", status: "draft", issue_date: new Date().toISOString().slice(0, 10), valid_until: null,
      vat_rate: Number(company?.default_vat ?? 21), client_id: null, work_id: null, notes: "",
      quote_items: [{ description: "", unit: "ud", quantity: 1, unit_price: 0 }],
    });
  }

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("quotes").delete().eq("id", deleting.id);
    if (error) toast.error("No se pudo eliminar el presupuesto.");
    else { toast.success("Presupuesto eliminado"); qc.invalidateQueries({ queryKey: ["quotes"] }); }
    setDeleting(null);
  }

  return (
    <div>
      <PageHeader title="Presupuestos" description={`${quotes.length} presupuestos`}
        actions={<Button onClick={startNew}><Plus className="size-4" /> Nuevo presupuesto</Button>} />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por número, título o cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {quotes.length ? "Ningún presupuesto coincide con la búsqueda." : "Todavía no hay presupuestos. Crea el primero."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const t = quoteTotals(q.quote_items, q.vat_rate);
            return (
              <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 shadow-card">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">{q.number}</p>
                  <p className="truncate font-semibold">{q.title}</p>
                  <p className="text-xs text-muted-foreground">{clientName(q.client_id) ?? "Sin cliente"} · {formatDate(q.issue_date)}</p>
                </div>
                <Badge variant={q.status === "accepted" ? "default" : "secondary"}>{QUOTE_STATUS[q.status]}</Badge>
                <p className="w-28 text-right font-display text-lg font-bold">{formatEUR(t.total)}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(q)}><Pencil className="size-4" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(q)} aria-label="Eliminar"><Trash2 className="size-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && <QuoteDialog quote={editing} clients={clients} works={works} onClose={() => setEditing(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el presupuesto {deleting?.number}?</AlertDialogTitle>
            <AlertDialogDescription>Se borrarán también sus partidas. Esta acción no se puede deshacer.</AlertDialogDescription>
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

function QuoteDialog({ quote, clients, works, onClose }: {
  quote: Partial<Quote>; clients: { id: string; name: string; active: boolean }[]; works: { id: string; name: string }[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [f, setF] = useState<Partial<Quote>>(quote);
  const [items, setItems] = useState<Item[]>(quote.quote_items ?? []);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Quote>(k: K, v: Quote[K]) => setF((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<Item>) => setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const totals = quoteTotals(items, Number(f.vat_rate ?? 0));

  async function save() {
    if (!f.title?.trim()) { toast.error("El título es obligatorio."); return; }
    if (!f.number?.trim()) { toast.error("El número es obligatorio."); return; }
    const clean = items.filter((it) => it.description.trim());
    if (!clean.length) { toast.error("Añade al menos una partida."); return; }
    if (clean.some((it) => !(Number(it.quantity) > 0) || Number(it.unit_price) < 0)) { toast.error("Revisa cantidades y precios."); return; }
    if (f.valid_until && f.issue_date && f.valid_until < f.issue_date) { toast.error("La validez no puede ser anterior a la fecha."); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      number: f.number.trim(), title: f.title.trim(), status: f.status ?? "draft",
      client_id: f.client_id || null, work_id: f.work_id || null, issue_date: f.issue_date!,
      valid_until: f.valid_until || null, vat_rate: Number(f.vat_rate ?? 21), notes: f.notes?.trim() || null,
    };
    try {
      let id = quote.id;
      if (id) {
        const { error } = await supabase.from("quotes").update(payload).eq("id", id);
        if (error) throw error;
        const { error: de } = await supabase.from("quote_items").delete().eq("quote_id", id);
        if (de) throw de;
      } else {
        const { data, error } = await supabase.from("quotes").insert({ ...payload, company_id: user.companyId, created_by: user.id }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const { error: ie } = await supabase.from("quote_items").insert(clean.map((it, i) => ({
        company_id: user.companyId, quote_id: id!, position: i, description: it.description.trim(),
        unit: it.unit.trim() || "ud", quantity: Number(it.quantity), unit_price: Number(it.unit_price),
      })));
      if (ie) throw ie;
      toast.success(quote.id ? "Presupuesto actualizado" : "Presupuesto creado");
      onClose();
    } catch (e) {
      const dup = (e as { code?: string })?.code === "23505";
      toast.error(dup ? "Ya existe un presupuesto con ese número." : "No se pudo guardar el presupuesto.");
    } finally {
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["quotes"] });
    }
  }

  const sel = "h-9 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{quote.id ? `Editar presupuesto ${quote.number}` : "Nuevo presupuesto"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="number">Número *</Label><Input id="number" value={f.number ?? ""} onChange={(e) => set("number", e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="title">Título *</Label><Input id="title" value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="client">Cliente</Label>
            <select id="client" className={sel} value={f.client_id ?? ""} onChange={(e) => set("client_id", e.target.value || null)}>
              <option value="">Sin cliente</option>
              {clients.filter((c) => c.active || c.id === f.client_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work">Obra</Label>
            <select id="work" className={sel} value={f.work_id ?? ""} onChange={(e) => set("work_id", e.target.value || null)}>
              <option value="">Sin obra</option>
              {works.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="status">Estado</Label><StatusSelect id="status" value={f.status ?? "draft"} options={QUOTE_STATUS} onChange={(v) => set("status", v)} /></div>
          <div className="space-y-1.5"><Label htmlFor="issue">Fecha</Label><Input id="issue" type="date" value={f.issue_date ?? ""} onChange={(e) => set("issue_date", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="valid">Válido hasta</Label><Input id="valid" type="date" value={f.valid_until ?? ""} onChange={(e) => set("valid_until", e.target.value || null)} /></div>
          <div className="space-y-1.5"><Label htmlFor="vat">IVA %</Label><Input id="vat" type="number" min={0} max={100} step="0.01" value={f.vat_rate ?? 0} onChange={(e) => set("vat_rate", Number(e.target.value))} /></div>
        </div>

        <div className="mt-2">
          <Label>Partidas</Label>
          <div className="mt-2 space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-md border p-2">
                <Input className="col-span-12 sm:col-span-5" placeholder="Descripción" aria-label="Descripción" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                <Input className="col-span-3 sm:col-span-1" aria-label="Unidad" value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} />
                <Input className="col-span-3 sm:col-span-2" type="number" min={0} step="0.001" aria-label="Cantidad" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} />
                <Input className="col-span-3 sm:col-span-2" type="number" min={0} step="0.01" aria-label="Precio unitario" value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} />
                <p className="col-span-2 text-right text-sm font-semibold sm:col-span-1">{formatEUR(lineTotal(it))}</p>
                <Button className="col-span-1" size="icon" variant="ghost" aria-label="Quitar partida" onClick={() => setItems(items.filter((_, j) => j !== i))}><X className="size-4" /></Button>
              </div>
            ))}
          </div>
          <Button className="mt-2" size="sm" variant="outline" onClick={() => setItems([...items, { description: "", unit: "ud", quantity: 1, unit_price: 0 }])}><Plus className="size-4" /> Añadir partida</Button>
        </div>

        <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Base imponible</span><span>{formatEUR(totals.base)}</span></div>
          <div className="flex justify-between"><span>IVA ({f.vat_rate ?? 0}%)</span><span>{formatEUR(totals.vat)}</span></div>
          <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{formatEUR(totals.total)}</span></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="notes">Notas y condiciones</Label><Textarea id="notes" value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
