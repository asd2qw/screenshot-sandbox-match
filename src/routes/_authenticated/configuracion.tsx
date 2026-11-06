import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { OwnerOnly, PageHeader } from "@/components/page-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => pageHead("Configuración", "Datos comerciales y configuracion de la empresa."),
  component: () => (
    <OwnerOnly>
      <Configuracion />
    </OwnerOnly>
  ),
});

const FIELDS = [
  { key: "name", label: "Nombre comercial" },
  { key: "legal_name", label: "Razón social" },
  { key: "tax_id", label: "NIF / CIF" },
  { key: "address", label: "Dirección fiscal" },
  { key: "phone", label: "Teléfono" },
  { key: "email", label: "Correo electrónico" },
  { key: "invoice_prefix", label: "Prefijo de facturas" },
  { key: "default_vat", label: "IVA por defecto (%)" },
] as const;

function Configuracion() {
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();
  const { data: company } = useQuery({
    queryKey: ["company", user?.companyId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", user!.companyId).single();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<Partial<Record<(typeof FIELDS)[number]["key"], string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) setForm(Object.fromEntries(FIELDS.map((f) => [f.key, String(company[f.key] ?? "")])) as typeof form);
  }, [company]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const vat = Number(form.default_vat);
    if (!form.name?.trim()) { toast.error("El nombre comercial es obligatorio."); return; }
    if (Number.isNaN(vat) || vat < 0 || vat > 100) { toast.error("IVA no válido."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name: form.name!.trim(),
        legal_name: form.legal_name || null,
        tax_id: form.tax_id || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        invoice_prefix: form.invoice_prefix || "F",
        default_vat: vat,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user!.companyId);
    setSaving(false);
    if (error) { toast.error("No se pudieron guardar los datos."); return; }
    toast.success("Datos guardados");
    qc.invalidateQueries({ queryKey: ["company"] });
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Datos de la empresa que aparecerán en presupuestos y facturas." />
      <form onSubmit={save} className="max-w-2xl rounded-lg border bg-card p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                className="mt-1.5"
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          La aplicación ayuda a gestionar documentos, pero no garantiza el cumplimiento fiscal automático. Consulta con tu asesor.
        </p>
        <Button type="submit" className="mt-6" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}
