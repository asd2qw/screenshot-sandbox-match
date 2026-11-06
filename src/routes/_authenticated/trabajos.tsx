import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Clock } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import {
  TASK_STATUS, PRIORITY, StatusSelect, WorkerPicker, useActiveWorkers, useProfileNames, syncAssignments, toLocalInput, fromLocalInput,
} from "@/components/phase2-shared";

export const Route = createFileRoute("/_authenticated/trabajos")({
  head: () => pageHead("Trabajos", "Tareas y trabajos asignados al equipo."),
  component: Trabajos,
});

type Task = {
  id: string; work_id: string; title: string; description: string | null; status: string; priority: number;
  planned_start_at: string | null; planned_end_at: string | null; completed_at: string | null;
  task_assignments: { worker_id: string }[];
};

function Trabajos() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isOwner = !!user?.isOwner;
  const [filter, setFilter] = useState("open");
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const { data: names = {} } = useProfileNames();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase.from("work_tasks").select("*, task_assignments(worker_id)").order("priority").order("planned_start_at", { nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });
  const { data: works = [] } = useQuery({
    queryKey: ["works-min"],
    queryFn: async () => (await supabase.from("works").select("id, name").order("name")).data ?? [],
  });
  const workName = (id: string) => works.find((w) => w.id === id)?.name ?? "—";
  const filtered = tasks.filter((t) => filter === "all" || (filter === "open" ? !["completed", "cancelled"].includes(t.status) : t.status === filter));

  async function changeStatus(t: Task, status: string) {
    const { error } = await supabase.from("work_tasks").update({ status }).eq("id", t.id);
    if (error) toast.error("No se pudo cambiar el estado.");
    else toast.success("Estado actualizado");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("work_tasks").delete().eq("id", deleting.id);
    if (error) toast.error("No se pudo eliminar. Si tiene eventos en el calendario, cancélalo.");
    else { toast.success("Trabajo eliminado"); qc.invalidateQueries({ queryKey: ["tasks"] }); }
    setDeleting(null);
  }

  return (
    <div>
      <PageHeader title="Trabajos" description={isOwner ? `${tasks.length} trabajos` : "Trabajos asignados a ti"}
        actions={isOwner && (
          <Button disabled={!works.length} onClick={() => setEditing({ status: "pending", priority: 2, task_assignments: [] })}><Plus className="size-4" /> Nuevo trabajo</Button>
        )} />
      {isOwner && !works.length && <p className="mb-4 text-sm text-muted-foreground">Crea primero una obra para poder añadir trabajos.</p>}
      <div className="mb-4 max-w-xs">
        <select aria-label="Filtrar" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="open">Abiertos</option>
          <option value="all">Todos</option>
          {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {tasks.length ? "No hay trabajos con este filtro." : isOwner ? "Todavía no hay trabajos." : "No tienes trabajos asignados."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-lg border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{workName(t.work_id)} · Prioridad {(PRIORITY[t.priority] ?? "").toLowerCase()}</p>
                </div>
                {t.priority === 1 && <Badge>Alta</Badge>}
              </div>
              {t.description && <p className="mt-2 text-sm">{t.description}</p>}
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {(t.planned_start_at || t.planned_end_at) && <p className="flex items-center gap-1"><Clock className="size-3.5" />{formatDateTime(t.planned_start_at)} → {formatDateTime(t.planned_end_at)}</p>}
                {t.task_assignments.length > 0 && <p className="flex items-center gap-1"><Users className="size-3.5" />{t.task_assignments.map((a) => names[a.worker_id] ?? "—").join(", ")}</p>}
                {t.completed_at && <p>Terminado el {formatDateTime(t.completed_at)}</p>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="w-40"><StatusSelect id={`st-${t.id}`} value={t.status} options={TASK_STATUS} onChange={(v) => changeStatus(t, v)} /></div>
                {isOwner && <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}><Pencil className="size-4" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(t)} aria-label="Eliminar"><Trash2 className="size-4" /></Button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <TaskDialog task={editing} works={works} onClose={() => setEditing(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{deleting?.title}»?</AlertDialogTitle>
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

function TaskDialog({ task, works, onClose }: { task: Partial<Task>; works: { id: string; name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: workers = [] } = useActiveWorkers(true);
  const before = (task.task_assignments ?? []).map((a) => a.worker_id);
  const [f, setF] = useState({
    title: task.title ?? "", description: task.description ?? "", work_id: task.work_id ?? works[0]?.id ?? "",
    status: task.status ?? "pending", priority: task.priority ?? 2,
    start: toLocalInput(task.planned_start_at), end: toLocalInput(task.planned_end_at),
  });
  const [assigned, setAssigned] = useState(before);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!f.title.trim()) { toast.error("El título es obligatorio."); return; }
    if (!f.work_id) { toast.error("Elige una obra."); return; }
    if (f.start && f.end && f.end < f.start) { toast.error("El fin no puede ser anterior al inicio."); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      title: f.title.trim(), description: f.description.trim() || null, work_id: f.work_id, status: f.status,
      priority: f.priority, planned_start_at: fromLocalInput(f.start), planned_end_at: fromLocalInput(f.end),
    };
    try {
      let id = task.id;
      if (id) {
        const { error } = await supabase.from("work_tasks").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("work_tasks").insert({ ...payload, company_id: user.companyId, created_by: user.id }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      await syncAssignments("task_assignments", user.companyId, id!, before, assigned);
      toast.success(task.id ? "Trabajo actualizado" : "Trabajo creado");
      onClose();
    } catch {
      toast.error("No se pudo guardar el trabajo o sus asignaciones.");
    } finally {
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{task.id ? "Editar trabajo" : "Nuevo trabajo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="title">Título *</Label><Input id="title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="work">Obra *</Label>
            <select id="work" disabled={!!task.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.work_id} onChange={(e) => setF({ ...f, work_id: e.target.value })}>
              {works.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="status">Estado</Label><StatusSelect id="status" value={f.status} options={TASK_STATUS} onChange={(v) => setF({ ...f, status: v })} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Prioridad</Label>
            <select id="priority" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) })}>
              {[1, 2, 3].map((p) => <option key={p} value={p}>{PRIORITY[p]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="start">Inicio previsto</Label><Input id="start" type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="end">Fin previsto</Label><Input id="end" type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="desc">Descripción</Label><Textarea id="desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
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
