import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/page-helpers";

export const Route = createFileRoute("/_authenticated/equipos")({
  head: () => pageHead("Equipos", "Gestion de equipos de trabajo de la empresa."),
  component: () => <ComingSoon title="Equipos" phase={5} />,
});
