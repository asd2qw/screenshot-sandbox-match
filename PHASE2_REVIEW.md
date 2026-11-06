# Revisión del borrador de Fase 2

Fecha: 28/10/2026. Estado: revisión terminada; no aprobado ni aplicado.

## Verificaciones realizadas

- Lectura de las funciones reales de Lovable Cloud: `current_company_id()` e `is_company_owner()` no comprueban `profiles.active`.
- Versión de Lovable Cloud: PostgreSQL 17.11. Las cuatro tablas de Fase 2 todavía no existen.
- El SQL original del archivo adjunto se ejecutó correctamente en PostgreSQL 17.9 temporal y aislado. No se modificó Lovable Cloud.
- Con un trabajador y claims simulados, `clients` devuelve cero filas; las tareas y eventos asignados se leen. Cambiar el título de una tarea se rechaza.
- Tras marcar su perfil como inactivo, el trabajador sigue leyendo obras, tareas y eventos con los mismos claims. Riesgo reproducido.
- Una obra sin asignación al trabajador sigue visible. Contradice el requisito original de no mostrar obras sin acceso.
- El borrador solo permite un `assigned_to` por tarea/evento, mientras el requisito original permite uno o varios trabajadores.
- El borrado de usuario sin claim `service_role` falla: las acciones referenciales `SET NULL` ejecutan los guards de tareas/eventos, que rechazan cambios de `assigned_to` y `created_by`.
- Con claim explícito `service_role`, el borrado de prueba funciona: conserva tareas/eventos y `company_id`, anulando referencias al perfil eliminado.

Estos resultados de borrado pertenecen al entorno aislado: no verifican el contexto JWT que usa el servicio Auth real al ejecutar `auth.admin.deleteUser()`.

## Cambios necesarios antes de aprobar

1. Añadir una comprobación de perfil activo en todas las políticas de Fase 2, sin confiar en el bloqueo del inicio de sesión ni en ocultar botones.
2. Limitar la lectura de obras a propietario y trabajadores autorizados, conforme al prompt original. Proponer asignaciones múltiples antes de consolidar el esquema.
3. Definir un camino de borrado que conserve registros y no dependa de claims accidentales. No permitir cambios de asignación a trabajadores ni usar `pg_trigger_depth()` como autorización.
4. Comprobar errores de escritura del perfil al activar/desactivar; actualmente se ignoran. No informar éxito si falla.
5. Aplicar SQL aprobado únicamente mediante la herramienta de migraciones de Lovable Cloud; no editar el journal ni mover manualmente SQL al conjunto activo.
6. Mantener CREATE TABLE → GRANT → RLS → políticas para cada nueva tabla. Las comprobaciones de fechas relativas entre columnas son válidas; no dependen de `now()`.

## Resultado de la preparación aprobada

- SQL revisado: `docs/phase2/phase2-schema.review.sql`; explicación y límites en `docs/phase2/README.md`.
- 37 pruebas PostgreSQL en entorno aislado pasan: acceso activo, aislamiento, asignaciones múltiples, notas individuales, campos protegidos, cascadas y conservación de registros al borrar perfiles sin claims de servicio.
- 10 pruebas Vitest pasan (7 de cambios de acceso, 2 de límites/contraseña, 1 de navegación).
- Activación/desactivación comprueba errores de perfil, Auth y audit y compensa el fallo de activación con bloqueo. No se ejecutaron cambios de cuentas reales.
- Página y formulario de trabajadores verificados con sesión real del propietario, sin errores y sin guardar datos. No había trabajadores existentes para probar sus cambios de acceso.
- Todas las páginas tienen título y metadatos propios. Comprobación de compilación: correcta.

## Pendiente tras aprobación separada del SQL

Aplicar el SQL exacto por la herramienta gestionada, verificar políticas con sesiones reales y el flujo de eliminación; construir las pantallas. Fase 2 no está terminada y Lovable Cloud no se modificó.