# HANDOFF — traspaso del proyecto a otra IA / otro editor

Este archivo es el punto de entrada para cualquiera (humano o IA) que continúe el proyecto
fuera de Lovable. Léelo entero antes de tocar código. Los detalles están en
`AGENTS.md`, `PROJECT_STATUS.md`, `DATABASE.md`, `SETUP.md` y `CHANGELOG.md`.

## 1. Qué es la aplicación

Sistema de gestión para una empresa de reformas/construcción. Módulos previstos:
inicio, clientes, obras, trabajos, calendario, presupuestos, pagos, materiales, almacén,
gastos, finanzas, facturas (PDF), horas, equipos, fotos, notificaciones, trabajadores,
configuración. Interfaz en español.

## 2. Stack

- TanStack Start v1 (React 19, Vite 7) — enrutado por archivos en `src/routes`, server functions con `createServerFn`.
- Tailwind CSS v4 (`src/styles.css`, tokens semánticos; no hardcodear colores).
- Backend: Lovable Cloud (Supabase) — base de datos, autenticación, almacenamiento. No usar otra base de datos ni otro sistema de login.
- Pruebas: `bunx vitest run`.

## 3. Arranque local

1. `bun install`
2. Copiar `.env.example` a `.env` y poner los valores reales del proyecto (URL y clave publishable del backend; la clave `SUPABASE_SERVICE_ROLE_KEY` no está disponible en Lovable Cloud).
3. `bun run dev` → http://localhost:8080
4. `bunx vitest run`

## 4. Dónde está cada cosa

| Ruta | Contenido |
|---|---|
| `src/routes/index.tsx`, `auth.tsx`, `reset-password.tsx` | Registro del primer propietario, login, recuperación |
| `src/routes/_authenticated/*` | 13 secciones tras el login; las no hechas muestran `ComingSoon` |
| `src/lib/workers-rules.ts` | Reglas puras de trabajadores (límites, validaciones) |
| `src/lib/workers.functions.ts` | Server functions: crear/editar/bloquear/eliminar trabajadores |
| `src/lib/format.ts` | Fechas DD/MM/YYYY, zona Europe/Madrid, importes EUR |
| `src/test/` | Pruebas (reglas y enrutado) |
| `drizzle/migrations/0000_migration.sql` | Esquema completo de la base de datos |
| `supabase/` | Configuración del backend gestionado |

## 5. Reglas de negocio que no se pueden romper

- Primera cuenta = propietario (crea la empresa). El registro público queda cerrado después; los trabajadores **nunca** se auto-registran, solo los crea el propietario desde la app.
- Máximo **15 trabajadores** por empresa (validado en `workers-rules.ts`, en la app y por trigger en la base de datos).
- Contraseña mínima **8 caracteres**.
- Roles solo en `user_roles` (`owner` | `worker`), nunca en `profiles`.
- Toda tabla de negocio lleva `company_id` y RLS basada en `current_company_id()` / `is_company_owner()`.
- Un trabajador solo lee su perfil y su rol; no puede cambiar perfiles ni permisos.
- Operaciones privilegiadas (crear/eliminar/bloquear cuentas) solo en server functions que comprueban rol owner.
- Módulos no terminados: pantalla `ComingSoon`. Nunca simular datos ni funcionalidad falsa.
- Copys en español; fechas e importes siempre por `src/lib/format.ts`.

## 6. Estado actual (05/11/2026)

**Fase 1 — terminada:** autenticación, primer propietario, trabajadores (máx. 15, permisos, activar/desactivar, eliminar, `audit_log`), configuración de empresa.

**Fase 2 — terminada (verificada como propietario):**
- Clientes (solo propietario): alta, edición, búsqueda, baja.
- Obras: propietario crea/edita; asigna varios trabajadores (`work_assignments`). El trabajador solo ve obras donde participa.
- Trabajos (`work_tasks`): por obra, prioridad, fechas, varios asignados. El trabajador solo cambia el estado de los suyos.
- Calendario (`calendar_events`): vista mensual por días, ligado a obra/trabajo, varios asignados.
- Componentes comunes: `src/components/phase2-shared.tsx` (estados, selector de trabajadores, sincronización de asignaciones).

**Fase 3 — en curso:**
- Presupuestos (hecho, solo propietario): `quotes` + `quote_items`, numeración `P-AAAA-NNN`, IVA, estados. Reglas en `src/lib/quote-rules.ts`.
- Gastos (hecho): `expenses`. Propietario ve y edita todo; trabajador con permiso `can_register_expenses` registra y ve solo los suyos (no edita ni borra). Reglas en `src/lib/expense-rules.ts`.
- Pendiente: Pagos, Materiales, Almacén.

**Fase 4 (09/11/2026):** Pagos, Materiales, Finanzas y Facturas hechos (`invoice-rules.ts`, `finance-rules.ts`, `invoice-pdf.ts`). Pendiente: PDF de presupuestos.

**Siguientes fases:** 5 horas, equipos, fotos, notificaciones; 6 PWA, seguridad.

**Sin verificar:** flujos reales con una cuenta de trabajador (visibilidad por asignación, cambio de estado, registro de gastos).

## 7. Cambios en la base de datos

- Migraciones aplicadas en orden en `drizzle/migrations/`: `0000` (fase 1), `0001`–`0002` (fase 2), `0003` (presupuestos), `0004` (gastos), `0005` (materiales, pagos, recibos), `0007` (facturas).
- **No se aplican solas** al sincronizar con Git: en otro backend hay que ejecutarlas en orden.
- Funciones de acceso: `phase2_active_member`, `phase2_owner`, `phase2_work_visible`, `phase2_task_assigned`, `phase2_event_assigned`, `phase3_can_register_expenses` (security definer). Un trabajador inactivo no tiene acceso a nada.
- Tablas nuevas: `company_id`, GRANT, RLS y políticas en la misma migración; IDs de usuario como UUID sin FK a `auth.users`.
- No tocar esquemas `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.

## 8. Datos y copias de seguridad

El repositorio contiene **solo código**: ni los datos de las tablas ni los archivos subidos.
Para mover la app con datos reales hay que exportar las tablas y el almacenamiento por
separado desde el panel del backend, y aplicar antes el esquema en la base de datos nueva.
Los usuarios existentes eligen una contraseña nueva en su primera visita si se migra a otro
backend.

## 9. Siguiente paso sugerido (actualizado 09/11/2026: Pagos, Materiales, Finanzas y Facturas ya están hechos; siguiente: PDF de presupuestos y fase 5)

Fase 3 restante: **Pagos** (cobros de clientes por obra/presupuesto) y **Materiales/Almacén** (catálogo, stock, consumo por obra; trabajador con `can_register_materials`). Seguir el patrón de `gastos.tsx`: migración con RLS, reglas puras en `src/lib/*-rules.ts` con pruebas en `src/test/`, pantalla en español. Después, probar con una cuenta de trabajador real. Actualizar `PROJECT_STATUS.md`, `DATABASE.md`, `CHANGELOG.md` y este archivo al terminar.
