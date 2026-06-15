INSERT INTO configuracion (id, clave, valor, "updatedAt")
VALUES
  (gen_random_uuid()::text, 'tarifa_extra', '550', NOW()),
  (gen_random_uuid()::text, 'horas_bloque_extra', '2', NOW())
ON CONFLICT (clave) DO NOTHING;

UPDATE configuracion SET valor = '350' WHERE clave = 'tarifa_dia';
UPDATE configuracion SET valor = '6' WHERE clave = 'horas_dia';
