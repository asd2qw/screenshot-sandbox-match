import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";

export const WORK_STATUS: Record<string, string> = {
  planned: "Planificada", in_progress: "En curso", on_hold: "En pausa", completed: "Terminada", cancelled: "Cancelada",
};
export const TASK_STATUS: Record<string, string> = {
  pending: "Pendiente", planned: "Planificado", in_progress: "En curso", blocked: "Bloqueado", completed: "Terminado", cancelled: "Cancelado",
};
export const EVENT_STATUS: Record<string, string> = {
  scheduled: "Programado", in_progress: "En curso", completed: "Terminado", cancelled: "Cancelado",
};
export const PRIORITY: Record<number, string> = { 1: "Alta", 2: "Normal", 3: "Baja" };

export type Worker = { id: string; full_name: string };

/** Active workers of the company (owner only; RLS hides others). */
export function useActiveWorkers(enabled: boolean) {
  return useQuery({
    queryKey: ["active-workers"],
    enabled,
    queryFn: async (): Promise<Worker[]> => {
      const { data: roles, error: e1 } = await supabase.from("user_roles").select("user_id").eq("role", "worker");
      if (e1) throw e1;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids).eq("active", true).order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfileNames() {
  return useQuery({
    queryKey: ["profile-names"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name])) as Record<string, string>;
    },
  });
}

export function StatusSelect({ id, value, options, onChange, disabled }: {
  id: string; value: string; options: Record<string, string>; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <select id={id} disabled={disabled} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

export function WorkerPicker({ workers, selected, onChange }: { workers: Worker[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label>Trabajadores asignados</Label>
      {workers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay trabajadores activos.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {workers.map((w) => {
            const on = selected.includes(w.id);
            return (
              <button key={w.id} type="button" aria-pressed={on}
                onClick={() => onChange(on ? selected.filter((x) => x !== w.id) : [...selected, w.id])}
                className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary"}`}>
                {w.full_name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type AssignTable = "work_assignments" | "task_assignments" | "event_assignments";
const KEY: Record<AssignTable, "work_id" | "task_id" | "event_id"> = {
  work_assignments: "work_id", task_assignments: "task_id", event_assignments: "event_id",
};

/** Replace assignment set: remove deselected, add new. Throws on any failure. */
export async function syncAssignments(table: AssignTable, companyId: string, parentId: string, before: string[], after: string[]) {
  const key = KEY[table];
  const removed = before.filter((x) => !after.includes(x));
  const added = after.filter((x) => !before.includes(x));
  if (removed.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table) as any).delete().eq("company_id", companyId).eq(key, parentId).in("worker_id", removed);
    if (error) throw error;
  }
  if (added.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table) as any).insert(added.map((w) => ({ company_id: companyId, [key]: parentId, worker_id: w })));
    if (error) throw error;
  }
}

/** ISO timestamp -> value for <input type="datetime-local"> in browser time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
