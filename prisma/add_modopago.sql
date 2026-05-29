-- Agregar columnas de modo de pago a la tabla modulos
ALTER TABLE modulos
  ADD COLUMN IF NOT EXISTS "modoPago"  TEXT NOT NULL DEFAULT 'POR_HORA',
  ADD COLUMN IF NOT EXISTS "montoFijo" DOUBLE PRECISION;

-- Actualizar tarifaHora a 500 (base por hora)
UPDATE modulos SET "tarifaHora" = 500 WHERE "tarifaHora" = 125;

-- Recalcular montoTotal con la nueva tarifa para módulos POR_HORA
UPDATE modulos
SET "montoTotal" = "horasEstimadas" * 500
WHERE "modoPago" = 'POR_HORA' AND "horasEstimadas" > 0;
