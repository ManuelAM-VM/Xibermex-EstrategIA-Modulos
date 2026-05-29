-- Actualizar el enum TipoTarea

-- 1. Quitar el default de la columna
ALTER TABLE modulos ALTER COLUMN "tipoTarea" DROP DEFAULT;

-- 2. Cambiar la columna a TEXT temporalmente
ALTER TABLE modulos ALTER COLUMN "tipoTarea" TYPE TEXT;

-- 3. Eliminar el enum viejo con CASCADE
DROP TYPE IF EXISTS "TipoTarea" CASCADE;

-- 4. Crear el nuevo enum
CREATE TYPE "TipoTarea" AS ENUM ('DESARROLLO', 'ACTUALIZACION', 'CONFIGURACION', 'OPTIMIZACION');

-- 5. Restaurar la columna con el nuevo enum
ALTER TABLE modulos
  ALTER COLUMN "tipoTarea" TYPE "TipoTarea"
  USING (
    CASE
      WHEN "tipoTarea" IN ('DESARROLLO', 'ACTUALIZACION', 'CONFIGURACION', 'OPTIMIZACION')
        THEN "tipoTarea"::"TipoTarea"
      ELSE 'DESARROLLO'::"TipoTarea"
    END
  );

-- 6. Restaurar el default
ALTER TABLE modulos ALTER COLUMN "tipoTarea" SET DEFAULT 'DESARROLLO'::"TipoTarea";
