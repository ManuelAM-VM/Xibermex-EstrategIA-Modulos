-- Script de configuración inicial para EstrategIA
-- Ejecutar en PostgreSQL antes de iniciar la app

-- Crear tipos enum
CREATE TYPE "TipoTarea" AS ENUM ('DESARROLLO', 'DISEÑO', 'QA', 'DEVOPS', 'REUNION', 'DOCUMENTACION', 'OTRO');
CREATE TYPE "Complejidad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'MUY_ALTA');
CREATE TYPE "EstadoModulo" AS ENUM ('PENDIENTE', 'EN_CURSO', 'ENTREGADO', 'APROBADO', 'RECHAZADO');

-- Tabla colaboradores
CREATE TABLE IF NOT EXISTS "colaboradores" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nombre" TEXT NOT NULL,
  "email" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "colaboradores_email_key" UNIQUE ("email")
);

-- Tabla proyectos
CREATE TABLE IF NOT EXISTS "proyectos" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nombre" TEXT NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "proyectos_nombre_key" UNIQUE ("nombre")
);

-- Tabla modulos
CREATE TABLE IF NOT EXISTS "modulos" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipoTarea" "TipoTarea" NOT NULL DEFAULT 'DESARROLLO',
  "complejidad" "Complejidad" NOT NULL DEFAULT 'MEDIA',
  "horasEstimadas" DOUBLE PRECISION NOT NULL,
  "horasReales" DOUBLE PRECISION,
  "estado" "EstadoModulo" NOT NULL DEFAULT 'PENDIENTE',
  "tarifaHora" DOUBLE PRECISION NOT NULL DEFAULT 125,
  "montoTotal" DOUBLE PRECISION,
  "pagado" BOOLEAN NOT NULL DEFAULT false,
  "montoPagado" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fechaEntrega" TIMESTAMP(3),
  "notasIA" TEXT,
  "alertaHoras" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "colaboradorId" TEXT NOT NULL,
  "proyectoId" TEXT NOT NULL,
  CONSTRAINT "modulos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "modulos_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "modulos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Tabla pagos
CREATE TABLE IF NOT EXISTS "pagos" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "monto" DOUBLE PRECISION NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notas" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "moduloId" TEXT NOT NULL,
  "colaboradorId" TEXT NOT NULL,
  CONSTRAINT "pagos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pagos_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "modulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pagos_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Tabla configuracion
CREATE TABLE IF NOT EXISTS "configuracion" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clave" TEXT NOT NULL,
  "valor" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "configuracion_clave_key" UNIQUE ("clave")
);

-- Datos iniciales
INSERT INTO "colaboradores" ("id", "nombre", "email") VALUES
  (gen_random_uuid()::text, 'Victor Manuel Arredondo', 'victor@strategia.com'),
  (gen_random_uuid()::text, 'Oscar M. Navarro', 'oscar@strategia.com')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "proyectos" ("id", "nombre") VALUES
  (gen_random_uuid()::text, 'EstrategIA')
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "configuracion" ("id", "clave", "valor") VALUES
  (gen_random_uuid()::text, 'tarifa_dia', '500'),
  (gen_random_uuid()::text, 'horas_dia', '4'),
  (gen_random_uuid()::text, 'anthropic_api_key', '')
ON CONFLICT ("clave") DO NOTHING;
