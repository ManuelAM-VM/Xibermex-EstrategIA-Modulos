-- Convertir columnas de enum a TEXT en PostgreSQL
-- Esto elimina la validación a nivel DB y deja Prisma manejar la lógica

-- tipoTarea
ALTER TABLE modulos ALTER COLUMN "tipoTarea" DROP DEFAULT;
ALTER TABLE modulos ALTER COLUMN "tipoTarea" TYPE TEXT USING "tipoTarea"::TEXT;
ALTER TABLE modulos ALTER COLUMN "tipoTarea" SET DEFAULT 'DESARROLLO';
DROP TYPE IF EXISTS "TipoTarea" CASCADE;

-- complejidad
ALTER TABLE modulos ALTER COLUMN complejidad DROP DEFAULT;
ALTER TABLE modulos ALTER COLUMN complejidad TYPE TEXT USING complejidad::TEXT;
ALTER TABLE modulos ALTER COLUMN complejidad SET DEFAULT 'MEDIA';
DROP TYPE IF EXISTS "Complejidad" CASCADE;

-- estado
ALTER TABLE modulos ALTER COLUMN estado DROP DEFAULT;
ALTER TABLE modulos ALTER COLUMN estado TYPE TEXT USING estado::TEXT;
ALTER TABLE modulos ALTER COLUMN estado SET DEFAULT 'PENDIENTE';
DROP TYPE IF EXISTS "EstadoModulo" CASCADE;
