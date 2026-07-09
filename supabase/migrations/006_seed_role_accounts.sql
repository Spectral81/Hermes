-- Cuentas de prueba, una por rol.
-- Contraseña para TODAS: Hermes2026!
-- Ejecuta este script en Supabase → SQL Editor.
-- Es idempotente: si el correo ya existe, lo omite.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user RECORD;
  v_id UUID;
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('admin@uteq.edu.mx',          '0000000001', 'Admin',    'General',         '4420000001', 'admin_general'),
      ('robos@uteq.edu.mx',          '0000000002', 'Responsable', 'Robos',        '4420000002', 'responsable_robos'),
      ('emergencias@uteq.edu.mx',    '0000000003', 'Responsable', 'Emergencias',  '4420000003', 'responsable_accidentes'),
      ('infraestructura@uteq.edu.mx','0000000004', 'Responsable', 'Infraestructura','4420000004','responsable_infraestructura'),
      ('estudiante@uteq.edu.mx',     '0000000005', 'Estudiante', 'Demo',          '4420000005', 'estudiante')
    ) AS t(email, matricula, nombre, apellidos, telefono, role)
  LOOP
    -- Omitir si el correo ya existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_user.email) THEN
      -- Asegura el rol correcto aunque ya exista
      UPDATE public.profiles p
      SET role = v_user.role
      FROM auth.users u
      WHERE u.email = v_user.email AND p.id = u.id;
      CONTINUE;
    END IF;

    v_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      v_user.email,
      crypt('Hermes2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'matricula', v_user.matricula,
        'nombre', v_user.nombre,
        'apellidos', v_user.apellidos,
        'telefono', v_user.telefono
      ),
      now(), now(),
      '', '', '', ''
    );

    -- Identidad de email (requerida para login por contraseña)
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_user.email, 'email_verified', true),
      'email',
      v_user.email,
      now(), now(), now()
    );

    -- El trigger handle_new_user ya creó el perfil como 'estudiante';
    -- aquí ajustamos el rol correspondiente.
    UPDATE public.profiles SET role = v_user.role WHERE id = v_id;
  END LOOP;
END $$;
