import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/page-helpers";
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
import { formatDate } from "@/lib/format";
import { WORK_STATUS, StatusSelect, WorkerPicker, useActiveWorkers, useProfileNames, syncAssignments } from "@/components/phase2-shared";

export const Route = createFileRoute("/_authenticated/obras")({
  head: () => pageHead("Obras", "Proyectos, direcciones y estado de las obras."),
  component: Obras,
});

type Work = {
  id: string; name: string; client_id: string | null; description: string | null; address: string | null;
  status: string; planned_start_date: string | null; planned_end_date: string | null;
  work_assignments: { worker_id: string }[];
};

function Obras() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isOwner = !!user?.isOwner;
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Work> | null>(null);
  const [deleting, setDeleting] = useState<Work | null>(null);
  const { data: names = {} } = useProfileNames();

  const { data: works = [], isLoading } = useQuery({
    queryKey: ["works"],
    queryFn: async (): Promise<Work[]> => {
      const { data, error } = await supabase.from("works").select("*, work_assignments(worker_id)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Work[];
    },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"], enabled: isOwner,
    queryFn: async () => (await supabase.from("clients").select("id, name, active").order("name")).data ?? [],
  });
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name;

  const filtered = works.filter((w) => `${w.name} ${w.address ?? ""} ${clientName(w.client_id) ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("works").delete().eq("id", deleting.id);
    if (error) toast.error("No se pudo eliminar. Si tiene trabajos o eventos, cámbiala a Cancelada.");
    else { toast.success("Obra eliminada"); qc.invalidateQueries({ queryKey: ["works"] }); }
    setDeleting(null);
  }

  return (
    <div>
      <PageHeader title="Obras" description={isOwner ? `${works.length} obras` : "Obras en las que participas"}
        actions={isOwner && <Button onClick={() => setEditing({ status: "planned", work_assignments: [] })}><Plus className="size-4" /> Nueva obra</Button>} />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre, dirección o cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {works.length ? "Ninguna obra coincide con la búsqueda." : isOwner ? "Todavía no hay obras. Crea la primera." : "No tienes obras asignadas."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((w) => (
            <div key={w.id} className="rounded-lg border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{w.name}</p>
                  {clientName(w.client_id) && <p className="text-xs text-muted-foreground">{clientName(w.client_id)}</p>}
                </div>
                <Badge variant={w.status === "in_progress" ? "default" : "secondary"}>{WORK_STATUS[w.status]}</Badge>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {w.address && <p className="flex items-center gap-1 truncate"><MapPin className="size-3.5 shrink-0" />{w.address}</p>}
                {(w.planned_start_date || w.planned_end_date) && <p>{formatDate(w.planned_start_date)} → {formatDate(w.planned_end_date)}</p>}
                {w.work_assignments.length > 0 && (
                  <p className="flex items-center gap-1 truncate"><Users className="size-3.5 shrink-0" />{w.work_assignments.map((a) => names[a.worker_id] ?? "—").join(", ")}</p>
                )}
              </div>
              {isOwner && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(w)}><Pencil className="size-4" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(w)} aria-label="Eliminar"><Trash2 className="size-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && <WorkDialog work={editing} clients={clients} onClose={() => setEditing(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la obra {deleting?.name}?</AlertDialogTitle>
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

function WorkDialog({ work, clients, onClose }: { work: Partial<Work>; clients: { id: string; name: string; active: boolean }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: workers = [] } = useActiveWorkers(true);
  const before = (work.work_assignments ?? []).map((a) => a.worker_id);
  const [f, setF] = useState<Partial<Work>>(work);
  const [assigned, setAssigned] = useState<string[]>(before);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Work, v: string | null) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name?.trim()) { toast.error("El nombre es obligatorio."); return; }
    if (f.planned_start_date && f.planned_end_date && f.planned_end_date < f.planned_start_date) { toast.error("La fecha de fin no puede ser anterior al inicio."); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      name: f.name.trim(), client_id: f.client_id || null, description: f.description?.trim() || null,
      address: f.address?.trim() || null, status: f.status ?? "planned",
      planned_start_date: f.planned_start_date || null, planned_end_date: f.planned_end_date || null,
    };
    try {
      let id = work.id;
      if (id) {
        const { error } = await supabase.from("works").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("works").insert({ ...payload, company_id: user.companyId, created_by: user.id }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      await syncAssignments("work_assignments", user.companyId, id!, before, assigned);
      toast.success(work.id ? "Obra actualizada" : "Obra creada");
      onClose();
    } catch {
      toast.error("No se pudo guardar la obra o sus asignaciones.");
    } finally {
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["works"] });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{work.id ? "Editar obra" : "Nueva obra"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="name">Nombre *</Label><Input id="name" value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="client">Cliente</Label>
            <select id="client" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.client_id ?? ""} onChange={(e) => set("client_id", e.target.value || null)}>
              <option value="">Sin cliente</option>
              {clients.filter((c) => c.active || c.id === f.client_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="status">Estado</Label><StatusSelect id="status" value={f.status ?? "planned"} options={WORK_STATUS} onChange={(v) => set("status", v)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="address">Dirección</Label><Input id="address" value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="start">Inicio previsto</Label><Input id="start" type="date" value={f.planned_start_date ?? ""} onChange={(e) => set("planned_start_date", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="end">Fin previsto</Label><Input id="end" type="date" value={f.planned_end_date ?? ""} onChange={(e) => set("planned_end_date", e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="desc">Descripción</Label><Textarea id="desc" value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
          <WorkerPicker workers={workers} selected={assigned} onChange={setAssigned} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
