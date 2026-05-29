INSERT INTO configuracion (id, clave, valor, "updatedAt")
VALUES
  (gen_random_uuid()::text, 'tarifa_dia', '500', NOW()),
  (gen_random_uuid()::text, 'horas_dia', '4', NOW()),
  (gen_random_uuid()::text, 'anthropic_api_key', '', NOW())
ON CONFLICT (clave) DO NOTHING;
