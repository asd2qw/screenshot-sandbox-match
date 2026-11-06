import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HardHat, Settings, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/page-helpers";
import { formatDate } from "@/lib/format";
import { MAX_WORKERS } from "@/lib/workers-rules";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => pageHead("Inicio", "Resumen diario de la empresa y del equipo."),
  component: Inicio,
});

function Inicio() {
  const { data: user } = useCurrentUser();
  const { data: workers } = useQuery({
    queryKey: ["workers-count"],
    enabled: !!user?.isOwner,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "worker");
      return data?.length ?? 0;
    },
  });

  return (
    <div>
      <PageHeader
        title={`Hola${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`}
        description={`Hoy es ${formatDate(new Date())}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {user?.isOwner && (
          <Link to="/trabajadores" className="rounded-lg border bg-card p-5 shadow-card transition hover:border-primary">
            <HardHat className="mb-3 size-6 text-primary" />
            <p className="text-3xl font-bold font-display">{workers ?? "—"}<span className="text-base text-muted-foreground"> / {MAX_WORKERS}</span></p>
            <p className="text-sm text-muted-foreground">Trabajadores</p>
          </Link>
        )}
        {user?.isOwner && (
          <Link to="/configuracion" className="rounded-lg border bg-card p-5 shadow-card transition hover:border-primary">
            <Settings className="mb-3 size-6 text-primary" />
            <p className="font-semibold">Datos de la empresa</p>
            <p className="text-sm text-muted-foreground">Completa nombre, NIF/CIF y dirección para presupuestos y facturas.</p>
          </Link>
        )}
        <Link to="/calendario" className="rounded-lg border bg-card p-5 shadow-card transition hover:border-primary">
          <CalendarDays className="mb-3 size-6 text-primary" />
          <p className="font-semibold">Mis trabajos</p>
          <p className="text-sm text-muted-foreground">Consulta tu calendario y los trabajos asignados.</p>
        </Link>
      </div>
    </div>
  );
}
