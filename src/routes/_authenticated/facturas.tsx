import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, OwnerOnly } from "@/components/page-helpers";

export const Route = createFileRoute("/_authenticated/facturas")({
  head: () => pageHead("Facturas", "Facturacion y documentos de la empresa."),
  component: () => <OwnerOnly><ComingSoon title="Facturas" phase={4} /></OwnerOnly>,
});
