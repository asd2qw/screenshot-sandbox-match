export const EXPENSE_CATEGORIES: Record<string, string> = {
  materials: "Materiales", fuel: "Combustible", tools: "Herramientas", food: "Comidas",
  transport: "Transporte", subcontract: "Subcontratas", other: "Otros",
};
export const MAX_EXPENSE = 1_000_000;

/** Returns a Spanish error message or null. Mirrors DB checks. */
export function validateExpense(e: { description: string; amount: number; date: string }): string | null {
  if (!e.description.trim()) return "El concepto es obligatorio.";
  if (!e.date) return "La fecha es obligatoria.";
  if (!Number.isFinite(e.amount) || e.amount <= 0) return "El importe debe ser mayor que 0.";
  if (e.amount > MAX_EXPENSE) return "El importe máximo es 1.000.000 €.";
  return null;
}

export function sumExpenses(list: { amount: number | string }[]): number {
  return Math.round(list.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
}
