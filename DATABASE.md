# Base de datos

| Tabla | Descripción |
|---|---|
| companies | Empresa (nombre, razón social, NIF/CIF, dirección, prefijo facturas, IVA por defecto) |
| profiles | Usuario: company_id, nombre, email, teléfono, activo, permisos `can_register_expenses`, `can_register_materials` |
| user_roles | Rol por usuario: `owner` o `worker` (tabla separada) |
| audit_log | Historial de cambios (quién, qué, cuándo) |

## Funciones
- `has_role(user, role)`, `current_company_id()`, `is_company_owner(company)` — security definer, usadas en RLS.
- `company_exists()` — pública, para mostrar el registro del primer propietario.
- Trigger `handle_new_user`: primer registro crea empresa + propietario; cuentas creadas por el propietario llevan `app_metadata.company_id` y reciben rol worker; resto rechazado.
- Trigger `enforce_worker_limit`: máximo 15 trabajadores por empresa.
- Trigger `profiles_guard`: impide cambiar la empresa de un perfil.

## Permisos (RLS)
- Trabajador: lee solo su perfil y su rol; no puede modificar perfiles ni permisos.
- Propietario: lee/edita perfiles de su empresa, edita la empresa, lee el historial.
- Crear/eliminar/bloquear cuentas: solo funciones de servidor que comprueban rol owner.

## Fase 2 — propuesta, no aplicada
- SQL de revisión: `docs/phase2/phase2-schema.review.sql`; fuera del conjunto de migraciones activo.
- Propone `clients`, `works`, `work_tasks`, `calendar_events` y tres tablas de asignaciones múltiples, todas aisladas por empresa y perfil activo.
- Clientes solo propietario; obras según autorización; tareas/eventos según asignación. Notas individuales por asignación.
- Eliminar perfiles retira asignaciones en cascada sin modificar entidades; UUID de creador conservado sin FK de perfil.
- Pruebas de PostgreSQL aisladas en `src/test/phase2-database.test.py`; no prueban las sesiones ni el borrado Auth reales.

## Fase 3
- `quotes` (presupuestos: número único por empresa, cliente/obra opcionales, estado, IVA) y `quote_items` (partidas). Solo propietario activo.
- `expenses` (gastos: fecha, categoría, importe, obra opcional, proveedor). Propietario: todo; trabajador con permiso: crea y lee los suyos.

## Base de desarrollo (06/11/2026)
- Aplicadas y verificadas: 0000–0005 y 0006 (comentario). Bucket `receipts` privado creado con la herramienta de almacenamiento (no por SQL).

## Facturas (0007)
- `invoices`: cliente obligatorio, obra/presupuesto opcionales (misma empresa y mismo cliente), partidas en JSON, estado `draft|issued|cancelled`. Solo propietario activo (RLS).
- Trigger `invoices_guard`: valida partidas y fechas; al emitir asigna `sequence`/`number` por empresa y año y congela emisor/cliente (`issuer`, `recipient`); emitida = inmutable; solo se borran borradores; anular solo si no hay cobros vinculados. Un presupuesto solo puede tener una factura no anulada.
- `payments.invoice_id` (opcional) + trigger `payment_invoice_guard`: el cobro debe coincidir con cliente/obra/presupuesto de una factura emitida.
- Prueba de seguridad: `src/test/invoice-rls-check.sql` (se deshace sola).
