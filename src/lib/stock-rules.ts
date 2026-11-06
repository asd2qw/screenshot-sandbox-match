export type Movement = { kind: "in" | "out" | string; quantity: number | string };

export function stockFrom(movements: Movement[]): number {
  return Math.round(movements.reduce((s, m) => s + (m.kind === "in" ? 1 : -1) * Number(m.quantity), 0) * 1000) / 1000;
}

export const isLowStock = (stock: number, minStock: number) => minStock > 0 && stock <= minStock;

/** Spanish error or null. Outgoing quantity cannot exceed available stock (also enforced in DB). */
export function validateMovement(kind: string, quantity: number, available: number): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return "La cantidad debe ser mayor que 0.";
  if (kind === "out" && quantity > available) return `Stock insuficiente (disponible: ${available}).`;
  return null;
}
