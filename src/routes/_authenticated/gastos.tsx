import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/page-helpers";
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
import { useProfileNames } from "@/components/phase2-shared";
import { EXPENSE_CATEGORIES, validateExpense, sumExpenses } from "@/lib/expense-rules";

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => pageHead("Gastos", "Gastos relacionados con la empresa y las obras."),
  component: Gastos,
});

type Expense = {
  id: string; work_id: string | null; expense_date: string; category: string; description: string;
  amount: number; supplier: string | null; notes: string | null; created_by: string;
};

function Gastos() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isOwner = !!user?.isOwner;
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [workFilter, setWorkFilter] = useState("");
  const [editing, setEditing] = useState<Partial<Expense> | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const { data: names = {} } = useProfileNames();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", month],
    enabled: !!user?.canRegisterExpenses,
    queryFn: async (): Promise<Expense[]> => {
      const [y, m] = month.split("-").map(Number);
      const end = new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 10);
      const { data, error } = await supabase.from("expenses").select("*").gte("expense_date", `${month}-01`).lt("expense_date", end).order("expense_date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });
  const { data: works = [] } = useQuery({
    queryKey: ["works-min"],
    queryFn: async () => (await supabase.from("works").select("id, name").order("name")).data ?? [],
  });
  const workName = (id: string | null) => (id ? works.find((w) => w.id === id)?.name ?? "—" : "Sin obra");

  if (user && !user.canRegisterExpenses) {
    return (
      <div>
        <PageHeader title="Gastos" />
        <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-14 text-center shadow-card">
          <Lock className="mb-4 size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tienes permiso para registrar gastos. Pídeselo al propietario.</p>
        </div>
      </div>
    );
  }

  const filtered = expenses.filter((e) => !workFilter || (workFilter === "none" ? !e.work_id : e.work_id === workFilter));

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("expenses").delete().eq("id", deleting.id);
    if (error) toast.error("No se pudo eliminar el gasto.");
    else { toast.success("Gasto eliminado"); qc.invalidateQueries({ queryKey: ["expenses"] }); }
    setDeleting(null);
  }

  return (
    <div>
      <PageHeader title="Gastos" description={isOwner ? "Gastos de toda la empresa" : "Tus gastos registrados"}
        actions={<Button onClick={() => setEditing({ expense_date: new Date().toISOString().slice(0, 10), category: "materials", work_id: null })}><Plus className="size-4" /> Nuevo gasto</Button>} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5"><Label htmlFor="month">Mes</Label><Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="wf">Obra</Label>
          <select id="wf" className="h-9 rounded-md border bg-background px-3 text-sm" value={workFilter} onChange={(e) => setWorkFilter(e.target.value)}>
            <option value="">Todas</option><option value="none">Sin obra</option>
            {works.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="ml-auto rounded-lg border bg-card px-4 py-2 text-right shadow-card">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-display text-xl font-bold">{formatEUR(sumExpenses(filtered))}</p>
        </div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">No hay gastos en este periodo.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(e.expense_date)} · {EXPENSE_CATEGORIES[e.category]} · {workName(e.work_id)}
                  {e.supplier ? ` · ${e.supplier}` : ""}{isOwner ? ` · ${names[e.created_by] ?? "—"}` : ""}
                </p>
              </div>
              <p className="font-display text-lg font-bold">{formatEUR(Number(e.amount))}</p>
              {isOwner && <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(e)}><Pencil className="size-4" /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(e)} aria-label="Eliminar"><Trash2 className="size-4" /></Button>
              </div>}
            </div>
          ))}
        </div>
      )}
      {editing && <ExpenseDialog expense={editing} works={works} onClose={() => setEditing(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este gasto?</AlertDialogTitle>
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

function ExpenseDialog({ expense, works, onClose }: { expense: Partial<Expense>; works: { id: string; name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [f, setF] = useState({
    expense_date: expense.expense_date ?? "", category: expense.category ?? "materials", description: expense.description ?? "",
    amount: expense.amount != null ? String(expense.amount) : "", supplier: expense.supplier ?? "", notes: expense.notes ?? "",
    work_id: expense.work_id ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    const err = validateExpense({ description: f.description, amount: Number(f.amount.replace(",", ".")), date: f.expense_date });
    if (err) { toast.error(err); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      expense_date: f.expense_date, category: f.category, description: f.description.trim(),
      amount: Number(f.amount.replace(",", ".")), supplier: f.supplier.trim() || null, notes: f.notes.trim() || null,
      work_id: f.work_id || null,
    };
    const { error } = expense.id
      ? await supabase.from("expenses").update(payload).eq("id", expense.id)
      : await supabase.from("expenses").insert({ ...payload, company_id: user.companyId, created_by: user.id });
    setSaving(false);
    if (error) { toast.error("No se pudo guardar el gasto."); return; }
    toast.success(expense.id ? "Gasto actualizado" : "Gasto registrado");
    qc.invalidateQueries({ queryKey: ["expenses"] });
    onClose();
  }

  const sel = "h-9 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{expense.id ? "Editar gasto" : "Nuevo gasto"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="desc">Concepto *</Label><Input id="desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="amount">Importe (€, IVA incl.) *</Label><Input id="amount" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="date">Fecha *</Label><Input id="date" type="date" value={f.expense_date} onChange={(e) => setF({ ...f, expense_date: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="cat">Categoría</Label>
            <select id="cat" className={sel} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work">Obra</Label>
            <select id="work" className={sel} value={f.work_id} onChange={(e) => setF({ ...f, work_id: e.target.value })}>
              <option value="">Sin obra</option>
              {works.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sup">Proveedor</Label><Input id="sup" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
