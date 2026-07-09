-- Corrige/forza roles de cuentas seed por correo.
-- Útil cuando el usuario existe en auth.users pero su profile quedó como estudiante.
-- Ejecutar en Supabase SQL Editor después de 006_seed_role_accounts.sql.

WITH seed(email, matricula, nombre, apellidos, telefono, role) AS (
  VALUES
    ('admin@uteq.edu.mx',           '0000000001', 'Admin',       'General',          '4420000001', 'admin_general'),
    ('robos@uteq.edu.mx',           '0000000002', 'Responsable', 'Robos',            '4420000002', 'responsable_robos'),
    ('emergencias@uteq.edu.mx',     '0000000003', 'Responsable', 'Emergencias',      '4420000003', 'responsable_accidentes'),
    ('infraestructura@uteq.edu.mx', '0000000004', 'Responsable', 'Infraestructura',  '4420000004', 'responsable_infraestructura'),
    ('estudiante@uteq.edu.mx',      '0000000005', 'Estudiante',  'Demo',             '4420000005', 'estudiante')
),
users_seed AS (
  SELECT
    u.id,
    lower(u.email) AS email,
    s.matricula,
    s.nombre,
    s.apellidos,
    s.telefono,
    s.role
  FROM auth.users u
  JOIN seed s ON lower(u.email) = s.email
)
INSERT INTO public.profiles (id, matricula, nombre, apellidos, telefono, email, role)
SELECT
  us.id,
  us.matricula,
  us.nombre,
  us.apellidos,
  us.telefono,
  us.email,
  us.role
FROM users_seed us
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  matricula = COALESCE(NULLIF(public.profiles.matricula, ''), EXCLUDED.matricula),
  nombre = COALESCE(NULLIF(public.profiles.nombre, ''), EXCLUDED.nombre),
  apellidos = COALESCE(NULLIF(public.profiles.apellidos, ''), EXCLUDED.apellidos),
  telefono = COALESCE(NULLIF(public.profiles.telefono, ''), EXCLUDED.telefono),
  email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email);

