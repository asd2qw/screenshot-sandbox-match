import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña · Gestión de Obras" },
      { name: "description", content: "Establece una nueva contraseña para tu cuenta." },
      { property: "og:title", content: "Nueva contraseña · Gestión de Obras" },
      { property: "og:description", content: "Establece una nueva contraseña para tu cuenta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error("El enlace ha caducado o no es válido. Solicita uno nuevo."); return; }
    toast.success("Contraseña actualizada");
    navigate({ to: "/inicio", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-card p-6 shadow-card">
        <h1 className="mb-4 text-xl font-bold">Nueva contraseña</h1>
        <Label htmlFor="pw">Contraseña (mín. 8 caracteres)</Label>
        <Input id="pw" type="password" className="mt-1.5" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button type="submit" className="mt-4 w-full" disabled={busy}>Guardar contraseña</Button>
      </form>
    </div>
  );
}
