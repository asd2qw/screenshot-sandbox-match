import type { ReactNode } from "react";
import { Construction, Lock } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="overflow-hidden rounded-lg border bg-card shadow-card">
        <div className="hazard-stripe h-2" />
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <Construction className="mb-4 size-10 text-primary" />
          <h2 className="text-lg font-semibold">Próximamente</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Este módulo todavía no está disponible. Se desarrollará en la fase {phase}.
          </p>
        </div>
      </div>
    </div>
  );
}

export function OwnerOnly({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!user?.isOwner)
    return (
      <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-14 text-center">
        <Lock className="mb-3 size-8 text-muted-foreground" />
        <h2 className="font-semibold">Sin acceso</h2>
        <p className="mt-1 text-sm text-muted-foreground">Esta sección solo está disponible para el propietario.</p>
      </div>
    );
  return <>{children}</>;
}
