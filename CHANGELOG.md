# Changelog
## Fase 1
- Base de datos, autenticación, roles, gestión de trabajadores, configuración de empresa, navegación.

## Preparación Fase 2 — pendiente aprobación SQL
- Nuevo SQL de revisión fuera de migraciones activas: permisos de usuario activo, obras autorizadas y asignaciones múltiples.
- Borrado propuesto conserva tareas/eventos e identidad histórica del creador; solo elimina asignaciones.
- Activación/desactivación: comprueba errores y filas afectadas; orden seguro y bloqueo compensatorio ante fallo.
- Pruebas persistentes en PostgreSQL temporal y tests de fallos de activación; descripciones únicas en todas las páginas.
- Lovable Cloud no modificado. Pantallas y verificación real de operaciones Fase 2 pendientes.

## Fase 3 (parcial)
- Presupuestos: partidas, IVA, numeración P-AAAA-NNN, estados.
- Obras, Trabajos y Calendario con asignación de varios trabajadores.
- Gastos: registro por propietario y trabajadores con permiso, filtro por mes y obra, total.

## 06/11/2026 — Copia de desarrollo (Fase 0)
- Código copiado tal cual desde el proyecto original a un proyecto nuevo con base de datos de desarrollo propia (sin `.env` ni datos del original).
- Migraciones 0000–0005 aplicadas sin cambios en la base nueva; comprobado: 17 tablas, todas con RLS y políticas.
- 0006: solo comentario de documentación (no cambia el esquema).
- Bucket privado `receipts` (10 MB) creado; lo exigían las políticas de 0005 y no existía.
- Inicio de sesión por correo activado. Pruebas: 24/24 superadas.
