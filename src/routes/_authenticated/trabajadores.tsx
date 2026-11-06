import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, KeyRound, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OwnerOnly, PageHeader } from "@/components/page-helpers";
import { createWorker, deleteWorker, resetWorkerPassword, setWorkerActive } from "@/lib/workers.functions";
import { MAX_WORKERS, validateWorkerInput } from "@/lib/workers-rules";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/trabajadores")({
  head: () => pageHead("Trabajadores", "Cuentas y permisos del equipo de la empresa."),
  component: () => (
    <OwnerOnly>
      <Trabajadores />
    </OwnerOnly>
  ),
});

type Worker = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  can_register_expenses: boolean;
  can_register_materials: boolean;
  created_at: string;
};

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Ha ocurrido un error.";
}

function Trabajadores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [resetting, setResetting] = useState<Worker | null>(null);
  const [deleting, setDeleting] = useState<Worker | null>(null);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async (): Promise<Worker[]> => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "worker");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("profiles").select("*").in("id", ids).order("full_name");
      if (error) throw error;
      return data as Worker[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["workers"] });
    qc.invalidateQueries({ queryKey: ["workers-count"] });
  };
  const setActive = useServerFn(setWorkerActive);
  const remove = useServerFn(deleteWorker);

  const filtered = workers.filter((w) =>
    `${w.full_name} ${w.email ?? ""} ${w.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const full = workers.length >= MAX_WORKERS;

  return (
    <div>
      <PageHeader
        title="Trabajadores"
        description={`${workers.length} de ${MAX_WORKERS} cuentas utilizadas`}
        actions={
          <Button onClick={() => setCreating(true)} disabled={full}>
            <Plus /> Nuevo trabajador
          </Button>
        }
      />
      {full && <p className="mb-4 text-sm text-destructive">Has alcanzado el límite de {MAX_WORKERS} trabajadores.</p>}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, correo o teléfono" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {workers.length === 0 ? "Aún no hay trabajadores. Crea la primera cuenta." : "Sin resultados."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{w.full_name || "Sin nombre"}</p>
                  {w.active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="destructive">Desactivado</Badge>}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {w.email} {w.phone && `· ${w.phone}`} · Alta {formatDate(w.created_at)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {w.can_register_expenses && <Badge variant="outline">Puede registrar gastos</Badge>}
                  {w.can_register_materials && <Badge variant="outline">Puede registrar materiales</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={w.active}
                    onCheckedChange={async (v) => {
                      try {
                        await setActive({ data: { workerId: w.id, active: v } });
                        toast.success(v ? "Cuenta activada" : "Cuenta desactivada");
                        refresh();
                      } catch (e) {
                        toast.error(errMsg(e));
                      }
                    }}
                  />
                  Activo
                </label>
                <Button variant="outline" size="sm" onClick={() => setEditing(w)}>Editar</Button>
                <Button variant="outline" size="icon" onClick={() => setResetting(w)} aria-label="Cambiar contraseña"><KeyRound /></Button>
                <Button variant="outline" size="icon" onClick={() => setDeleting(w)} aria-label="Eliminar"><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateWorkerDialog open={creating} onOpenChange={setCreating} onDone={refresh} />
      {editing && <EditWorkerDialog worker={editing} onClose={() => setEditing(null)} onDone={refresh} />}
      {resetting && <ResetPasswordDialog worker={resetting} onClose={() => setResetting(null)} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {deleting?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará la cuenta de forma permanente. Si solo quieres impedir el acceso, desactívala.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await remove({ data: { workerId: deleting!.id } });
                  toast.success("Trabajador eliminado");
                  refresh();
                } catch (e) {
                  toast.error(errMsg(e));
                }
                setDeleting(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateWorkerDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const create = useServerFn(createWorker);
  const empty = { fullName: "", email: "", phone: "", password: "", canRegisterExpenses: false, canRegisterMaterials: false };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateWorkerInput(f);
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      await create({ data: f });
      toast.success("Cuenta creada. Comparte el correo y la contraseña con el trabajador.");
      setF(empty);
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo trabajador</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div><Label>Nombre y apellidos</Label><Input className="mt-1.5" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
          <div><Label>Correo electrónico</Label><Input type="email" className="mt-1.5" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><Label>Teléfono (opcional)</Label><Input className="mt-1.5" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>Contraseña inicial (mín. 8 caracteres)</Label><Input type="text" className="mt-1.5" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          <label className="flex items-center justify-between text-sm">Puede registrar gastos<Switch checked={f.canRegisterExpenses} onCheckedChange={(v) => setF({ ...f, canRegisterExpenses: v })} /></label>
          <label className="flex items-center justify-between text-sm">Puede registrar materiales<Switch checked={f.canRegisterMaterials} onCheckedChange={(v) => setF({ ...f, canRegisterMaterials: v })} /></label>
          <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Creando…" : "Crear cuenta"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditWorkerDialog({ worker, onClose, onDone }: { worker: Worker; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    full_name: worker.full_name,
    phone: worker.phone ?? "",
    can_register_expenses: worker.can_register_expenses,
    can_register_materials: worker.can_register_materials,
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.full_name.trim()) { toast.error("Indica un nombre válido."); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ ...f, phone: f.phone || null }).eq("id", worker.id);
    setBusy(false);
    if (error) { toast.error("No se pudieron guardar los cambios."); return; }
    toast.success("Cambios guardados");
    onDone();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar trabajador</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div><Label>Nombre y apellidos</Label><Input className="mt-1.5" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div><Label>Teléfono</Label><Input className="mt-1.5" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <label className="flex items-center justify-between text-sm">Puede registrar gastos<Switch checked={f.can_register_expenses} onCheckedChange={(v) => setF({ ...f, can_register_expenses: v })} /></label>
          <label className="flex items-center justify-between text-sm">Puede registrar materiales<Switch checked={f.can_register_materials} onCheckedChange={(v) => setF({ ...f, can_register_materials: v })} /></label>
          <DialogFooter><Button type="submit" disabled={busy}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const reset = useServerFn(resetWorkerPassword);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva contraseña para {worker.full_name}</DialogTitle></DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres."); return; }
            setBusy(true);
            try {
              await reset({ data: { workerId: worker.id, password: pw } });
              toast.success("Contraseña actualizada");
              onClose();
            } catch (err) {
              toast.error(errMsg(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Mínimo 8 caracteres" />
          <DialogFooter><Button type="submit" disabled={busy}>Cambiar contraseña</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
