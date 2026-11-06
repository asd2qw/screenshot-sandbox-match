import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, OwnerOnly } from "@/components/page-helpers";

export const Route = createFileRoute("/_authenticated/finanzas")({
  head: () => pageHead("Finanzas", "Resumen financiero privado de la empresa."),
  component: () => <OwnerOnly><ComingSoon title="Finanzas" phase={4} /></OwnerOnly>,
});
