# Fase 2: SQL revisado para aprobación

El archivo `phase2-schema.review.sql` es un borrador, no una migración aplicada. Está fuera de `drizzle/migrations/` y no está registrado en el journal. No crea datos de demostración ni modifica Lovable Cloud durante las pruebas.

## Esquema propuesto

- `clients`: contactos, dirección y notas; acceso exclusivo del propietario activo.
- `works`: cliente opcional, dirección, descripción, estado y fechas. Trabajadores leen únicamente obras autorizadas por asignación directa o por una tarea/evento asignados.
- `work_tasks`: obra, instrucciones, prioridad, estado y fechas. El trabajador solo cambia estado; fecha de finalización normalizada por trigger.
- `calendar_events`: agenda, horario, obra/tarea opcional y estado; evento vinculado a una tarea debe pertenecer a su misma obra.
- `work_assignments`, `task_assignments`, `event_assignments`: varias personas por registro; cada trabajador ve y modifica únicamente sus propias notas, no las de otros trabajadores.

Todas las tablas tienen `company_id`, GRANT explícitos y RLS. Los helpers derivan identidad de `auth.uid()`, exigen perfil activo y rol en la misma empresa. Los helpers definer evitan recursión; no reciben una identidad arbitraria.

## Conservación y borrado

Eliminar una cuenta elimina en cascada sus asignaciones, no sus obras, tareas o eventos. No requiere un JWT de servicio dentro de los triggers. `created_by` es un UUID histórico sin clave foránea al perfil; no puede cambiar después del alta. El propietario crea registros bajo su propia identidad; un usuario eliminado puede seguir apareciendo por su UUID histórico, sin perfil resoluble. No se almacena copia de nombre o contacto.

Las entidades vinculadas no se borran mientras existan referencias de clientes/obras/tareas/eventos. Se cierran mediante estados o actividad, o se retiran antes las dependencias desde un flujo del propietario.

## Pruebas conservadas

```text
python3 src/test/phase2-database.test.py
bunx vitest run src/test/worker-access.test.ts src/test/workers-rules.test.ts src/test/app-routing.test.tsx
```

La prueba Python crea PostgreSQL 17 temporal bajo `/tmp`, elimina variables de conexión heredadas, solo escucha por socket local y lo destruye al finalizar. Requiere los ejecutables PostgreSQL y, si se ejecuta como root, el usuario local `lovable`. Nunca utiliza credenciales del proyecto.

El cambio de activación/desactivación ya comprueba la escritura de perfil, Auth y audit. Desactivación: primero denegar por perfil, después bloquear Auth. Activación: desbloquear Auth antes de conceder acceso por perfil; si falla el perfil, volver a bloquear. No hay transacción distribuida: los errores parciales se muestran y se pueden reintentar.

## Lo que aún no está verificado

- SQL y RLS no están en la base real. Las comprobaciones usan sesiones PostgreSQL simuladas, no validación de tokens reales.
- El propietario pudo abrir la página y el formulario de trabajadores sin errores, pero no hay trabajadores reales para comprobar activación/desactivación sin crear o alterar datos.
- El borrado Auth real, la activación real y el acceso tras desactivar necesitan verificación posterior a la aprobación.
- Pantallas de Fase 2, alertas de solapamientos y sincronización entre dispositivos siguen pendientes.

## Aplicación tras aprobación separada

Enviar el SQL exacto al instrumento de migraciones de Lovable Cloud. No copiarlo manualmente al journal. Después verificar tablas, políticas y lecturas con propietario/trabajador antes de implementar las pantallas.