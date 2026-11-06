import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/page-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, TIMEZONE } from "@/lib/format";
import {
  EVENT_STATUS, StatusSelect, WorkerPicker, useActiveWorkers, useProfileNames, syncAssignments, toLocalInput, fromLocalInput,
} from "@/components/phase2-shared";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => pageHead("Calendario", "Agenda de trabajos y eventos de la empresa."),
  component: Calendario,
});

type Event = {
  id: string; title: string; description: string | null; starts_at: string; ends_at: string; all_day: boolean;
  status: string; work_id: string | null; work_task_id: string | null; event_assignments: { worker_id: string }[];
};

const time = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(iso));
const monthLabel = (d: Date) => { const s = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(d); return s.charAt(0).toUpperCase() + s.slice(1); };

function Calendario() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isOwner = !!user?.isOwner;
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const [deleting, setDeleting] = useState<Event | null>(null);
  const { data: names = {} } = useProfileNames();
  const from = month.toISOString();
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", from],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase.from("calendar_events").select("*, event_assignments(worker_id)")
        .lt("starts_at", to).gt("ends_at", from).order("starts_at");
      if (error) throw error;
      return data as Event[];
    },
  });
  const { data: works = [] } = useQuery({
    queryKey: ["works-min"],
    queryFn: async () => (await supabase.from("works").select("id, name").order("name")).data ?? [],
  });
  const workName = (id: string | null) => works.find((w) => w.id === id)?.name;

  const groups = new Map<string, Event[]>();
  for (const e of events) { const k = dayKey(e.starts_at); groups.set(k, [...(groups.get(k) ?? []), e]); }

  async function changeStatus(e: Event, status: string) {
    const { error } = await supabase.from("calendar_events").update({ status }).eq("id", e.id);
    if (error) toast.error("No se pudo cambiar el estado.");
    else toast.success("Estado actualizado");
    qc.invalidateQueries({ queryKey: ["events"] });
  }
  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", deleting.id);
    if (error) toast.error("No se pudo eliminar el evento.");
    else { toast.success("Evento eliminado"); qc.invalidateQueries({ queryKey: ["events"] }); }
    setDeleting(null);
  }
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div>
      <PageHeader title="Calendario" description={isOwner ? "Eventos de la empresa" : "Tus eventos asignados"}
        actions={isOwner && <Button onClick={() => setEditing({ status: "scheduled", all_day: false, event_assignments: [] })}><Plus className="size-4" /> Nuevo evento</Button>} />
      <div className="mb-4 flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => shift(-1)} aria-label="Mes anterior"><ChevronLeft className="size-4" /></Button>
        <p className="min-w-40 text-center font-semibold">{monthLabel(month)}</p>
        <Button size="icon" variant="outline" onClick={() => shift(1)} aria-label="Mes siguiente"><ChevronRight className="size-4" /></Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : events.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">No hay eventos este mes.</div>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{formatDate(list[0]?.starts_at)}</h2>
              <div className="space-y-2">
                {list.map((e) => (
                  <div key={e.id} className="flex flex-wrap gap-3 rounded-lg border bg-card p-3 shadow-card">
                    <div className="w-20 shrink-0 text-sm font-semibold text-primary">{e.all_day ? "Todo el día" : `${time(e.starts_at)}–${time(e.ends_at)}`}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{e.title}</p>
                      {workName(e.work_id) && <p className="text-xs text-muted-foreground">{workName(e.work_id)}</p>}
                      {e.description && <p className="mt-1 text-sm">{e.description}</p>}
                      {e.event_assignments.length > 0 && <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-3.5" />{e.event_assignments.map((a) => names[a.worker_id] ?? "—").join(", ")}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="w-40"><StatusSelect id={`ev-${e.id}`} value={e.status} options={EVENT_STATUS} onChange={(v) => changeStatus(e, v)} /></div>
                        {isOwner && <>
                          <Button size="sm" variant="outline" onClick={() => setEditing(e)}><Pencil className="size-4" /> Editar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(e)} aria-label="Eliminar"><Trash2 className="size-4" /></Button>
                        </>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {editing && <EventDialog event={editing} works={works} onClose={() => setEditing(null)} />}
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

function EventDialog({ event, works, onClose }: { event: Partial<Event>; works: { id: string; name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: workers = [] } = useActiveWorkers(true);
  const before = (event.event_assignments ?? []).map((a) => a.worker_id);
  const [f, setF] = useState({
    title: event.title ?? "", description: event.description ?? "", work_id: event.work_id ?? "",
    work_task_id: event.work_task_id ?? "", status: event.status ?? "scheduled", all_day: event.all_day ?? false,
    start: toLocalInput(event.starts_at), end: toLocalInput(event.ends_at),
  });
  const [assigned, setAssigned] = useState(before);
  const [saving, setSaving] = useState(false);
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-of", f.work_id], enabled: !!f.work_id,
    queryFn: async () => (await supabase.from("work_tasks").select("id, title").eq("work_id", f.work_id).order("title")).data ?? [],
  });

  async function save() {
    if (!f.title.trim()) { toast.error("El título es obligatorio."); return; }
    if (!f.start || !f.end) { toast.error("Indica inicio y fin."); return; }
    if (f.end <= f.start) { toast.error("El fin debe ser posterior al inicio."); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      title: f.title.trim(), description: f.description.trim() || null, status: f.status, all_day: f.all_day,
      work_id: f.work_id || null, work_task_id: (f.work_id && f.work_task_id) || null,
      starts_at: fromLocalInput(f.start)!, ends_at: fromLocalInput(f.end)!,
    };
    try {
      let id = event.id;
      if (id) {
        const { error } = await supabase.from("calendar_events").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("calendar_events").insert({ ...payload, company_id: user.companyId, created_by: user.id }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      await syncAssignments("event_assignments", user.companyId, id!, before, assigned);
      toast.success(event.id ? "Evento actualizado" : "Evento creado");
      onClose();
    } catch {
      toast.error("No se pudo guardar el evento o sus asignaciones.");
    } finally {
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["events"] });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{event.id ? "Editar evento" : "Nuevo evento"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="title">Título *</Label><Input id="title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="start">Inicio *</Label><Input id="start" type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="end">Fin *</Label><Input id="end" type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={f.all_day} onCheckedChange={(v) => setF({ ...f, all_day: v })} /> Todo el día</label>
          <div className="space-y-1.5">
            <Label htmlFor="work">Obra</Label>
            <select id="work" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.work_id} onChange={(e) => setF({ ...f, work_id: e.target.value, work_task_id: "" })}>
              <option value="">Sin obra</option>
              {works.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task">Trabajo</Label>
            <select id="task" disabled={!f.work_id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.work_task_id} onChange={(e) => setF({ ...f, work_task_id: e.target.value })}>
              <option value="">Sin trabajo</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="status">Estado</Label><StatusSelect id="status" value={f.status} options={EVENT_STATUS} onChange={(v) => setF({ ...f, status: v })} /></div>
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
