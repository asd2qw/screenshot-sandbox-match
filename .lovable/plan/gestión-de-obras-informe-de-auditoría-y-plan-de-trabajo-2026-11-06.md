# Gestión de Obras — Informe de auditoría y plan de trabajo

## 1. Informe de auditoría (código original, sin cambios)

### Estado general
- Pila: TanStack Start + React 19 + TypeScript + Tailwind 4 + Lovable Cloud. Drizzle para el esquema (`drizzle/schema.ts`) y las migraciones SQL (0000–0005).
- Pruebas: 6 archivos y 24 pruebas de vitest, todas superadas. También hay una prueba aislada de PostgreSQL para la fase 2 (`phase2-database.test.py`).
- Interfaz en español, importes en EUR y fechas en zona Europe/Madrid desde `src/lib/format.ts`.

### Módulos
| Módulo | Estado real |
|---|---|
| Acceso, primer propietario, recuperación | Terminado |
| Trabajadores (máx. 15, permisos, bloqueo, audit_log) | Terminado |
| Configuración de empresa | Terminado |
| Clientes, Obras, Trabajos, Calendario | Terminados. Solo verificados como propietario |
| Presupuestos | Terminado (solo propietario) |
| Gastos (+ lectura de tickets con IA) | Terminado. Sin verificar con una cuenta de trabajador |
| Pagos | Pantalla y reglas hechas. Faltan los filtros por cliente, obra y fecha. Sin pruebas de base de datos |
| Materiales / Almacén | Catálogo, movimientos, stock bajo y obra hechos. Sin pruebas de base de datos ni verificación |
| Finanzas, Facturas, Equipos | "Próximamente" |
| Horas, Fotos, Notificaciones, PWA | No existen |

### Migraciones
- 0000 (fase 1), 0001–0002 (fase 2), 0003 (presupuestos), 0004 (gastos), 0005 (materiales, pagos, recibos).
- 0005 está en el registro de Drizzle, pero no en CHANGELOG ni en DATABASE.md. No consta que se aplicara en el original.
- 0005 define políticas para el almacenamiento `receipts`, pero **no crea el bucket**. Sin el bucket, la subida de recibos falla.
- RLS: todas las tablas usan `company_id` con `current_company_id()` y las funciones `phase2_*` / `phase3_*` (security definer, fail-closed para inactivos). No he encontrado tablas de negocio sin RLS.

### Riesgos detectados
- El `.env` del ZIP apunta a la base de datos original. **No se copiará**: este proyecto usará solo su propia base nueva.
- El modelo de IA `openai/gpt-6-astra` hay que comprobarlo en el entorno nuevo.
- Ningún flujo de trabajador se ha probado nunca de extremo a extremo.

## 2. Plan de trabajo por fases (cada fase se aprueba por separado)

**Fase 0 — Copia exacta y base de desarrollo**
1. Copiar todo el código del ZIP en este proyecto, salvo `.env`, `.git` y dependencias.
2. Activar Lovable Cloud en este proyecto (base nueva y vacía). El proyecto original no se toca.
3. Aplicar las migraciones 0000→0005 en orden, sin cambios, y comprobar las tablas, RLS y funciones.
4. Añadir una migración 0006 que solo cree el bucket privado `receipts`.
5. Ejecutar las pruebas y crear una cuenta de propietario y otra de trabajador de prueba para verificar el acceso.

**Fase 1 — Cerrar Pagos y Materiales**
- Pagos: filtros por cliente, obra y rango de fechas, y totales pagado/pendiente filtrados.
- Verificar materiales como propietario y como trabajador con y sin permiso.
- Pruebas de reglas y de RLS (aislamiento entre empresas).

**Fase 2 — Finanzas:** ingresos, gastos, beneficio por obra y pendientes de cobro (solo propietario, comprobado en el servidor).

**Fase 3 — Facturas y PDF:** tabla de facturas con RLS, numeración según el prefijo de empresa y PDF de presupuestos y facturas.

**Fase 4 — Horas y Fotos:** registro de horas por obra/tarea y fotos en almacenamiento privado por empresa. Ambos con permisos nuevos por trabajador.

**Fase 5 — Equipos, notificaciones y PWA:** propuesta concreta antes de implementar y app instalable en el móvil.

En cada fase actualizaré HANDOFF, PROJECT_STATUS, DATABASE, CHANGELOG y roadmap.

## Detalles técnicos
- Las migraciones se aplican tal cual. Las nuevas solo añaden cambios, nunca destruyen.
- Las versiones de TanStack se mantienen como están en el original.
- Los permisos se aplican siempre en RLS y en las funciones de servidor, no solo ocultando botones.
