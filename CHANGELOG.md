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
