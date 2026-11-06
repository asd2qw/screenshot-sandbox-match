# Instalación local
1. `bun install`
2. Copia `.env.example` a `.env` y rellena los valores del proyecto.
3. `bun run dev` → http://localhost:8080
4. Pruebas: `bunx vitest run`
5. Migraciones SQL: carpeta `drizzle/migrations/`; aplícalas en orden en la base de datos de destino.

## Copias de seguridad
El código en GitHub NO incluye la base de datos ni los archivos subidos. Exporta los datos (tablas) y los archivos del almacenamiento por separado desde el panel de Lovable Cloud antes de migrar.
