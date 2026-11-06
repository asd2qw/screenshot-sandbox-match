export const MAX_WORKERS = 15;

export function canAddWorker(currentWorkerCount: number): boolean {
  return currentWorkerCount < MAX_WORKERS;
}

export type WorkerInput = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  canRegisterExpenses: boolean;
  canRegisterMaterials: boolean;
};

export function validateWorkerInput(input: WorkerInput): string | null {
  if (!input.fullName.trim() || input.fullName.length > 120) return "Indica un nombre válido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "Correo electrónico no válido.";
  if (input.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (input.phone && input.phone.length > 30) return "Teléfono no válido.";
  return null;
}
