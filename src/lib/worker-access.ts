type AccessOperations = {
  setProfileActive: (active: boolean) => Promise<void>;
  setAuthActive: (active: boolean) => Promise<void>;
};

/** Fail closed: profile denial precedes a ban; access is granted only after unban. */
export async function changeWorkerAccess(active: boolean, operations: AccessOperations): Promise<void> {
  if (!active) {
    await operations.setProfileActive(false);
    await operations.setAuthActive(false);
    return;
  }
  await operations.setAuthActive(true);
  try {
    await operations.setProfileActive(true);
  } catch {
    try {
      await operations.setAuthActive(false);
    } catch {
      throw new Error("No se pudo activar el perfil ni restablecer el bloqueo de acceso. Reintenta desactivar la cuenta.");
    }
    throw new Error("No se pudo activar el perfil. La cuenta vuelve a estar bloqueada.");
  }
}