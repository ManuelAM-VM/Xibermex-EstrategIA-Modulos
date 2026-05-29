INSERT INTO colaboradores (id, nombre, email, activo, "createdAt")
VALUES
  (gen_random_uuid()::text, 'Victor Manuel Arredondo', 'victor@strategia.com', true, NOW()),
  (gen_random_uuid()::text, 'Oscar M. Navarro', 'oscar@strategia.com', true, NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO proyectos (id, nombre, activo, "createdAt")
VALUES
  (gen_random_uuid()::text, 'EstrategIA', true, NOW())
ON CONFLICT (nombre) DO NOTHING;
