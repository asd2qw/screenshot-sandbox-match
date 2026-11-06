import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut, Menu, X, HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { NAV_ITEMS } from "@/components/app-nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AppShell,
});

function AppShell() {
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((i) => !i.ownerOnly || user?.isOwner);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <HardHat className="size-5" />
      </div>
      <span className="font-display text-lg font-bold text-sidebar-accent-foreground">Gestión de Obras</span>
    </div>
  );

  const footer = (
    <div className="mt-auto border-t border-sidebar-border p-3">
      <div className="px-3 pb-2">
        <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{user?.fullName || user?.email}</p>
        <p className="text-xs text-sidebar-foreground/70">{user?.isOwner ? "Propietario" : "Trabajador"}</p>
      </div>
      <button
        onClick={signOut}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <LogOut className="size-4" /> Cerrar sesión
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-sidebar lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <aside className="flex w-72 flex-col overflow-y-auto bg-sidebar">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="text-sidebar-foreground">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
          <div className="flex-1 bg-foreground/40" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-sidebar px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menú" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <Menu className="size-5" />
          </Button>
          <span className="font-display font-bold text-sidebar-accent-foreground">Gestión de Obras</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
