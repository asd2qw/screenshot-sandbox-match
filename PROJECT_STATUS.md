# Estado del proyecto

## Fase 1 — terminada
- Lovable Cloud: base de datos, autenticación.
- Inicio de sesión por correo/contraseña, recuperación de contraseña (/reset-password).
- Primera cuenta = propietario (crea la empresa). Registro público cerrado después.
- Trabajadores: crear (máx. 15), editar, permisos (gastos/materiales), activar/desactivar (bloquea el acceso), cambiar contraseña, eliminar. Historial en `audit_log`.
- Configuración: datos de empresa, prefijo de facturas, IVA por defecto.
- Navegación completa; módulos no hechos muestran "Próximamente".

## Pendiente
- Fase 2: SQL revisado preparado en `docs/phase2/phase2-schema.review.sql`, con asignaciones múltiples y acceso restringido a usuarios activos/autorizados. No aplicado; pendiente aprobación separada. Pruebas PostgreSQL aisladas y errores de activación/desactivación cubiertos; operaciones reales con trabajadores aún sin verificar.
- Fase 2: clientes hecho (alta, edición, búsqueda, baja). Obras, trabajos y calendario hechos (con asignación de varios trabajadores).
- Fase 3: presupuestos y gastos hechos. Pendiente: pagos, materiales, almacén.
- Fase 4: finanzas y facturas hechas (09/11/2026). Pendiente: PDF de presupuestos.
- Fase 5: horas, equipos, fotos, notificaciones.
- Fase 6: PWA instalable, pruebas, seguridad, GitHub.

## Arquitectura
TanStack Start (React 19) + Tailwind v4 + Lovable Cloud. Operaciones privilegiadas en funciones de servidor con verificación de rol.

## Fase 1 de la copia de desarrollo (06/11/2026) — terminada
- Pagos con filtros por cliente, obra y fechas; totales filtrados.
- Materiales y seguridad (RLS, aislamiento entre empresas, permisos de trabajador) verificados en base de datos.
- Sin verificar en pantalla con una cuenta real de trabajador (solo comprobado a nivel de base de datos).

## Finanzas y Facturas (09/11/2026) — terminado
- Finanzas (solo propietario): cobrado, gastos, saldo de caja, pendiente acumulado; filtros por cliente, obra y fechas; evolución mensual; pendientes; gastos por categoría.
- Facturas (solo propietario): borradores (desde presupuesto o manuales), emisión con número correlativo por año `PREFIJO-AAAA-NNN`, factura emitida inmutable con datos fiscales congelados, anulación sin cobros vinculados, cobros desde la factura, PDF.
- Emitir exige NIF y dirección fiscal de la empresa y del cliente.
- Sin verificar en pantalla: emisión real y descarga del PDF (la emisión está probada en base de datos).
