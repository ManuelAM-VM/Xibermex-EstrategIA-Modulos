INSERT INTO proyectos (id, nombre, activo, "createdAt")
VALUES (gen_random_uuid()::text, 'MarIA', true, NOW())
ON CONFLICT (nombre) DO NOTHING;
