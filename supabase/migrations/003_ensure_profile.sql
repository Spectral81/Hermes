-- Crear perfil faltante para usuarios ya registrados
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  u record;
  profile public.profiles;
  matricula_val text;
  nombre_val text;
  apellidos_val text;
  telefono_val text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO profile FROM public.profiles WHERE id = uid;
  IF FOUND THEN
    RETURN profile;
  END IF;

  SELECT id, email, raw_user_meta_data INTO u FROM auth.users WHERE id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  matricula_val := trim(COALESCE(u.raw_user_meta_data->>'matricula', ''));
  nombre_val := trim(COALESCE(u.raw_user_meta_data->>'nombre', ''));
  apellidos_val := trim(COALESCE(u.raw_user_meta_data->>'apellidos', ''));
  telefono_val := trim(COALESCE(u.raw_user_meta_data->>'telefono', ''));

  IF matricula_val = '' OR nombre_val = '' OR apellidos_val = '' OR telefono_val = '' THEN
    RAISE EXCEPTION 'Faltan datos del registro en metadata';
  END IF;

  INSERT INTO public.profiles (id, matricula, nombre, apellidos, telefono, email)
  VALUES (u.id, matricula_val, nombre_val, apellidos_val, telefono_val, lower(trim(u.email)))
  RETURNING * INTO profile;

  RETURN profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- Backfill usuarios existentes sin perfil
INSERT INTO public.profiles (id, matricula, nombre, apellidos, telefono, email)
SELECT
  u.id,
  trim(u.raw_user_meta_data->>'matricula'),
  trim(u.raw_user_meta_data->>'nombre'),
  trim(u.raw_user_meta_data->>'apellidos'),
  trim(u.raw_user_meta_data->>'telefono'),
  lower(trim(u.email))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND coalesce(trim(u.raw_user_meta_data->>'matricula'), '') <> ''
  AND coalesce(trim(u.raw_user_meta_data->>'nombre'), '') <> ''
  AND coalesce(trim(u.raw_user_meta_data->>'apellidos'), '') <> ''
  AND coalesce(trim(u.raw_user_meta_data->>'telefono'), '') <> ''
ON CONFLICT DO NOTHING;
