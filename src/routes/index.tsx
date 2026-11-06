import { createFileRoute, Link } from "@tanstack/react-router";
import { HardHat, CalendarDays, Users, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestión de Obras · Planificación y finanzas para tu constructora" },
      { name: "description", content: "Organiza obras, clientes, trabajadores, gastos y facturas de tu empresa de construcción desde el móvil o el ordenador." },
      { property: "og:title", content: "Gestión de Obras" },
      { property: "og:description", content: "Planificación, equipo y finanzas para empresas de construcción." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-sidebar text-sidebar-foreground">
      <div className="hazard-stripe h-2" />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><HardHat className="size-5" /></div>
          <span className="font-display text-lg font-bold text-sidebar-accent-foreground">Gestión de Obras</span>
        </div>
        <Button asChild variant="outline" className="border-sidebar-border bg-transparent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-sidebar-accent-foreground sm:text-6xl">
          Tus obras, tu equipo y tus cuentas, <span className="text-sidebar-primary">en un solo sitio.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-sidebar-foreground/80">
          Planifica trabajos, asigna a tu equipo y controla gastos y cobros desde la obra o la oficina.
        </p>
        <div className="mt-10"><Button asChild size="lg"><Link to="/auth">Iniciar sesión</Link></Button></div>
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { icon: CalendarDays, t: "Calendario", d: "Trabajos diarios, semanales y mensuales." },
            { icon: Users, t: "Equipo", d: "Hasta 15 trabajadores con acceso desde el móvil." },
            { icon: PiggyBank, t: "Finanzas", d: "Gastos, cobros y resultado por obra." },
          ].map((f) => (
            <div key={f.t} className="border-l-2 border-sidebar-primary pl-4">
              <f.icon className="mb-2 size-5 text-sidebar-primary" />
              <p className="font-semibold text-sidebar-accent-foreground">{f.t}</p>
              <p className="text-sm text-sidebar-foreground/70">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
