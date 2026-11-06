import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { OwnerOnly, PageHeader } from "@/components/page-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => pageHead("Clientes", "Contactos y datos de clientes de la empresa."),
  component: () => <OwnerOnly><Clientes /></OwnerOnly>,
});

type Client = {
  id: string; name: string; client_type: string; legal_name: string | null; tax_id: string | null;
  contact_name: string | null; email: string | null; phone: string | null; address: string | null;
  notes: string | null; active: boolean;
};

const EMPTY: Omit<Client, "id"> = {
  name: "", client_type: "person", legal_name: "", tax_id: "", contact_name: "", email: "",
  phone: "", address: "", notes: "", active: true,
};

function Clientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  const filtered = clients.filter((c) =>
    `${c.name} ${c.tax_id ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("clients").delete().eq("id", deleting.id);
    if (error) toast.error("No se pudo eliminar. Si tiene obras asociadas, desactívalo.");
    else { toast.success("Cliente eliminado"); qc.invalidateQueries({ queryKey: ["clients"] }); }
    setDeleting(null);
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${clients.length} clientes`}
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus className="size-4" /> Nuevo cliente</Button>}
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre, NIF, correo o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {clients.length ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay clientes. Crea el primero."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.client_type === "company" ? "Empresa" : "Particular"}{c.tax_id ? ` · ${c.tax_id}` : ""}</p>
                </div>
                {!c.active && <Badge variant="secondary">Inactivo</Badge>}
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {c.phone && <p>{c.phone}</p>}
                {c.email && <p className="truncate">{c.email}</p>}
                {c.address && <p className="truncate">{c.address}</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}><Pencil className="size-4" /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(c)} aria-label="Eliminar"><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <ClientDialog client={editing} onClose={() => setEditing(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {deleting?.name}?</AlertDialogTitle>
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

function ClientDialog({ client, onClose }: { client: Partial<Client>; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [f, setF] = useState<Partial<Client>>(client);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Client, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const clean = (v: unknown) => (typeof v === "string" ? v.trim() || null : v);

  async function save() {
    if (!f.name?.trim()) { toast.error("El nombre es obligatorio."); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      name: f.name.trim(), client_type: f.client_type ?? "person",
      legal_name: clean(f.legal_name) as string | null, tax_id: clean(f.tax_id) as string | null,
      contact_name: clean(f.contact_name) as string | null, email: clean(f.email) as string | null,
      phone: clean(f.phone) as string | null, address: clean(f.address) as string | null,
      notes: clean(f.notes) as string | null, active: f.active ?? true,
    };
    const { error } = client.id
      ? await supabase.from("clients").update(payload).eq("id", client.id)
      : await supabase.from("clients").insert({ ...payload, company_id: user.companyId, created_by: user.id });
    setSaving(false);
    if (error) { toast.error("No se pudo guardar el cliente."); return; }
    toast.success(client.id ? "Cliente actualizado" : "Cliente creado");
    qc.invalidateQueries({ queryKey: ["clients"] });
    onClose();
  }

  const field = (k: keyof Client, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={(f[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{client.id ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("name", "Nombre *")}</div>
          <div className="space-y-1.5">
            <Label htmlFor="client_type">Tipo</Label>
            <select id="client_type" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.client_type} onChange={(e) => set("client_type", e.target.value)}>
              <option value="person">Particular</option>
              <option value="company">Empresa</option>
            </select>
          </div>
          {field("tax_id", "NIF/CIF")}
          {f.client_type === "company" && field("legal_name", "Razón social")}
          {f.client_type === "company" && field("contact_name", "Persona de contacto")}
          {field("phone", "Teléfono", "tel")}
          {field("email", "Correo", "email")}
          <div className="sm:col-span-2">{field("address", "Dirección")}</div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.active ?? true} onCheckedChange={(v) => set("active", v)} /> Activo</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
