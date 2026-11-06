import {
  Home, CalendarDays, ClipboardList, Users, Building2, HardHat, Package,
  Receipt, PiggyBank, Wallet, FileText, FileCheck2, Wrench, Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/inicio", label: "Inicio", icon: Home, ownerOnly: false },
  { to: "/calendario", label: "Calendario", icon: CalendarDays, ownerOnly: false },
  { to: "/trabajos", label: "Trabajos", icon: ClipboardList, ownerOnly: false },
  { to: "/clientes", label: "Clientes", icon: Users, ownerOnly: true },
  { to: "/obras", label: "Obras", icon: Building2, ownerOnly: false },
  { to: "/trabajadores", label: "Trabajadores", icon: HardHat, ownerOnly: true },
  { to: "/materiales", label: "Materiales", icon: Package, ownerOnly: false },
  { to: "/gastos", label: "Gastos", icon: Receipt, ownerOnly: false },
  { to: "/pagos", label: "Pagos", icon: Wallet, ownerOnly: true },
  { to: "/finanzas", label: "Finanzas", icon: PiggyBank, ownerOnly: true },
  { to: "/presupuestos", label: "Presupuestos", icon: FileText, ownerOnly: true },
  { to: "/facturas", label: "Facturas", icon: FileCheck2, ownerOnly: true },
  { to: "/equipos", label: "Equipos", icon: Wrench, ownerOnly: false },
  { to: "/configuracion", label: "Configuración", icon: Settings, ownerOnly: true },
] as const;
