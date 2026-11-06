import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Lock, ArrowDownToLine, ArrowUpFromLine, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/page-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatEUR } from "@/lib/format";
import { useProfileNames } from "@/components/phase2-shared";
import { isLowStock, validateMovement } from "@/lib/stock-rules";

export const Route = createFileRoute("/_authenticated/materiales")({
  head: () => pageHead("Materiales y almacén", "Catálogo de materiales, stock, entradas y salidas por obra."),
  component: Materiales,
});

type Material = { id: string; name: string; unit: string; min_stock: number; unit_cost: number | null; active: boolean };
type MovementRow = { id: string; material_id: string; work_id: string | null; kind: string; quantity: number; movement_date: string; notes: string | null; created_by: string };

function Materiales() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isOwner = !!user?.isOwner;
  const [tab, setTab] = useState<"stock" | "movs">("stock");
  const [editing, setEditing] = useState<Partial<Material> | null>(null);
  const [moving, setMoving] = useState<{ kind: "in" | "out"; materialId?: string } | null>(null);
  const { data: names = {} } = useProfileNames();
  const enabled = !!user?.canRegisterMaterials;

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"], enabled,
    queryFn: async (): Promise<Material[]> => {
      const { data, error } = await supabase.from("materials").select("*").order("name");
      if (error) throw error;
      return data as Material[];
    },
  });
  const { data: stock = {} } = useQuery({
    queryKey: ["material-stock"], enabled: enabled && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("material_stock", { _company: user!.companyId });
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.material_id, Number(r.stock)])) as Record<string, number>;
    },
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements"], enabled,
    queryFn: async (): Promise<MovementRow[]> => {
      const { data, error } = await supabase.from("stock_movements").select("*").order("movement_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as MovementRow[];
    },
  });
  const { data: works = [] } = useQuery({ queryKey: ["works-min"], queryFn: async () => (await supabase.from("works").select("id, name").order("name")).data ?? [] });
  const matName = (id: string) => materials.find((m) => m.id === id);
  const workName = (id: string | null) => (id ? works.find((w) => w.id === id)?.name ?? "—" : "Almacén");

  if (user && !enabled) {
    return (
      <div>
        <PageHeader title="Materiales" />
        <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-14 text-center shadow-card">
          <Lock className="mb-4 size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tienes permiso para registrar materiales. Pídeselo al propietario.</p>
        </div>
      </div>
    );
  }

  const refresh = () => ["materials", "material-stock", "stock-movements"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  async function deleteMovement(m: MovementRow) {
    const { error } = await supabase.from("stock_movements").delete().eq("id", m.id);
    if (error) toast.error(error.message.includes("negativo") ? "No se puede borrar: el stock quedaría negativo." : "No se pudo borrar el movimiento.");
    else { toast.success("Movimiento borrado"); refresh(); }
  }

  return (
    <div>
      <PageHeader title="Materiales y almacén" description={`${materials.filter((m) => m.active).length} materiales activos`}
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!materials.length} onClick={() => setMoving({ kind: "in" })}><ArrowDownToLine className="size-4" /> Entrada</Button>
          <Button variant="outline" disabled={!materials.length} onClick={() => setMoving({ kind: "out" })}><ArrowUpFromLine className="size-4" /> Salida</Button>
          {isOwner && <Button onClick={() => setEditing({ unit: "ud", min_stock: 0, active: true })}><Plus className="size-4" /> Nuevo material</Button>}
        </div>} />
      <div className="mb-4 inline-flex rounded-md border bg-card p-1">
        {(["stock", "movs"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded px-3 py-1.5 text-sm ${tab === t ? "bg-primary text-primary-foreground" : ""}`}>
            {t === "stock" ? "Stock" : "Movimientos"}
          </button>
        ))}
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : tab === "stock" ? (
        materials.length === 0 ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">{isOwner ? "Todavía no hay materiales. Crea el primero." : "El propietario todavía no ha creado materiales."}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {materials.map((m) => {
              const s = stock[m.id] ?? 0;
              const low = isLowStock(s, Number(m.min_stock));
              return (
                <div key={m.id} className="rounded-lg border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{m.name}</p>
                      <p className="text-xs text-muted-foreground">Mínimo {Number(m.min_stock)} {m.unit}{m.unit_cost != null ? ` · ${formatEUR(Number(m.unit_cost))}/${m.unit}` : ""}</p>
                    </div>
                    {!m.active ? <Badge variant="secondary">Inactivo</Badge> : low && <Badge variant="destructive"><AlertTriangle className="size-3" /> Stock bajo</Badge>}
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold">{s} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span></p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setMoving({ kind: "in", materialId: m.id })}><ArrowDownToLine className="size-4" /> Entrada</Button>
                    <Button size="sm" variant="outline" disabled={s <= 0} onClick={() => setMoving({ kind: "out", materialId: m.id })}><ArrowUpFromLine className="size-4" /> Salida</Button>
                    {isOwner && <Button size="sm" variant="ghost" onClick={() => setEditing(m)}><Pencil className="size-4" /> Editar</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : movements.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">No hay movimientos.</div>
      ) : (
        <div className="space-y-2">
          {movements.map((mv) => {
            const m = matName(mv.material_id);
            return (
              <div key={mv.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-card">
                <Badge variant={mv.kind === "in" ? "default" : "secondary"}>{mv.kind === "in" ? "Entrada" : "Salida"}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m?.name ?? "—"} · {Number(mv.quantity)} {m?.unit}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(mv.movement_date)} · {workName(mv.work_id)}{isOwner ? ` · ${names[mv.created_by] ?? "—"}` : ""}{mv.notes ? ` · ${mv.notes}` : ""}</p>
                </div>
                {isOwner && <Button size="sm" variant="ghost" aria-label="Borrar movimiento" onClick={() => deleteMovement(mv)}><Trash2 className="size-4" /></Button>}
              </div>
            );
          })}
        </div>
      )}
      {editing && <MaterialDialog material={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {moving && <MovementDialog kind={moving.kind} materialId={moving.materialId} materials={materials.filter((m) => m.active)} stock={stock} works={works} onClose={() => setMoving(null)} onSaved={refresh} />}
    </div>
  );
}

function MaterialDialog({ material, onClose, onSaved }: { material: Partial<Material>; onClose: () => void; onSaved: () => void }) {
  const { data: user } = useCurrentUser();
  const [f, setF] = useState({
    name: material.name ?? "", unit: material.unit ?? "ud", min_stock: String(material.min_stock ?? 0),
    unit_cost: material.unit_cost != null ? String(material.unit_cost) : "", active: material.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.name.trim()) { toast.error("El nombre es obligatorio."); return; }
    const min = Number(f.min_stock.replace(",", ".")); const cost = f.unit_cost ? Number(f.unit_cost.replace(",", ".")) : null;
    if (!(min >= 0) || (cost !== null && !(cost >= 0))) { toast.error("Revisa el mínimo y el coste."); return; }
    if (!user) return;
    setSaving(true);
    const payload = { name: f.name.trim(), unit: f.unit.trim() || "ud", min_stock: min, unit_cost: cost, active: f.active };
    const { error } = material.id
      ? await supabase.from("materials").update(payload).eq("id", material.id)
      : await supabase.from("materials").insert({ ...payload, company_id: user.companyId, created_by: user.id });
    setSaving(false);
    if (error) { toast.error(error.code === "23505" ? "Ya existe un material con ese nombre." : "No se pudo guardar."); return; }
    toast.success(material.id ? "Material actualizado" : "Material creado"); onSaved(); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{material.id ? "Editar material" : "Nuevo material"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="mname">Nombre *</Label><Input id="mname" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="unit">Unidad</Label><Input id="unit" placeholder="ud, m², kg, saco…" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="min">Stock mínimo</Label><Input id="min" inputMode="decimal" value={f.min_stock} onChange={(e) => setF({ ...f, min_stock: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cost">Coste por unidad (€)</Label><Input id="cost" inputMode="decimal" value={f.unit_cost} onChange={(e) => setF({ ...f, unit_cost: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /> Activo</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ kind, materialId, materials, stock, works, onClose, onSaved }: {
  kind: "in" | "out"; materialId?: string; materials: Material[]; stock: Record<string, number>;
  works: { id: string; name: string }[]; onClose: () => void; onSaved: () => void;
}) {
  const { data: user } = useCurrentUser();
  const [f, setF] = useState({ material_id: materialId ?? materials[0]?.id ?? "", quantity: "", work_id: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);
  const mat = materials.find((m) => m.id === f.material_id);
  const available = stock[f.material_id] ?? 0;
  async function save() {
    const q = Number(f.quantity.replace(",", "."));
    const err = !f.material_id ? "Elige un material." : validateMovement(kind, q, available);
    if (err) { toast.error(err); return; }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("stock_movements").insert({
      company_id: user.companyId, created_by: user.id, material_id: f.material_id, kind, quantity: q,
      work_id: f.work_id || null, movement_date: f.date, notes: f.notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message.includes("insuficiente") ? "Stock insuficiente." : "No se pudo registrar el movimiento."); onSaved(); return; }
    toast.success(kind === "in" ? "Entrada registrada" : "Salida registrada"); onSaved(); onClose();
  }
  const sel = "h-9 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{kind === "in" ? "Entrada al almacén" : "Salida / consumo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mat">Material *</Label>
            <select id="mat" className={sel} value={f.material_id} onChange={(e) => setF({ ...f, material_id: e.target.value })}>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({stock[m.id] ?? 0} {m.unit})</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="qty">Cantidad{mat ? ` (${mat.unit})` : ""} *</Label><Input id="qty" inputMode="decimal" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
            {kind === "out" && <p className="text-xs text-muted-foreground">Disponible: {available}</p>}</div>
          <div className="space-y-1.5"><Label htmlFor="mdate">Fecha</Label><Input id="mdate" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mwork">{kind === "out" ? "Obra de destino" : "Obra (opcional)"}</Label>
            <select id="mwork" className={sel} value={f.work_id} onChange={(e) => setF({ ...f, work_id: e.target.value })}>
              <option value="">Almacén / sin obra</option>
              {works.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="mnotes">Notas</Label><Input id="mnotes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
