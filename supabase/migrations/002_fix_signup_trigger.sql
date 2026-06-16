-- Ejecutar si el registro falla con "Database error saving new user"
-- Repara trigger y permisos del perfil al registrarse

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  domain TEXT := 'uteq.edu.mx';
  user_email TEXT := lower(trim(NEW.email));
  matricula_val TEXT := trim(COALESCE(NEW.raw_user_meta_data->>'matricula', ''));
  nombre_val TEXT := trim(COALESCE(NEW.raw_user_meta_data->>'nombre', ''));
  apellidos_val TEXT := trim(COALESCE(NEW.raw_user_meta_data->>'apellidos', ''));
  telefono_val TEXT := trim(COALESCE(NEW.raw_user_meta_data->>'telefono', ''));
BEGIN
  IF user_email !~ ('@' || domain || '$') THEN
    RAISE EXCEPTION 'Solo se permiten correos institucionales @%.', domain
      USING ERRCODE = 'check_violation';
  END IF;

  IF matricula_val = '' THEN
    RAISE EXCEPTION 'La matrícula es obligatoria.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF nombre_val = '' OR apellidos_val = '' THEN
    RAISE EXCEPTION 'Nombre y apellidos son obligatorios.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF telefono_val = '' THEN
    RAISE EXCEPTION 'El teléfono es obligatorio.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.profiles (id, matricula, nombre, apellidos, telefono, email)
  VALUES (NEW.id, matricula_val, nombre_val, apellidos_val, telefono_val, user_email);

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Matrícula o correo ya registrado.'
      USING ERRCODE = 'unique_violation';
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
