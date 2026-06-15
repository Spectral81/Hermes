-- Perfiles vinculados a auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  matricula TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'estudiante'
    CHECK (role IN ('estudiante', 'admin_general', 'responsable_robos', 'responsable_accidentes', 'responsable_infraestructura')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_matricula_idx ON public.profiles(matricula);
CREATE INDEX profiles_email_idx ON public.profiles(email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuario ve/edita su propio perfil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins ven todos (por ahora solo admin_general)
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_general'
    )
  );

-- Trigger: crear perfil al registrarse (valida dominio @uteq.edu.mx)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  domain TEXT := 'uteq.edu.mx';
  user_email TEXT := lower(trim(NEW.email));
  matricula_val TEXT := trim(NEW.raw_user_meta_data->>'matricula');
  nombre_val TEXT := trim(NEW.raw_user_meta_data->>'nombre');
  apellidos_val TEXT := trim(NEW.raw_user_meta_data->>'apellidos');
  telefono_val TEXT := trim(NEW.raw_user_meta_data->>'telefono');
BEGIN
  IF user_email !~ ('@' || domain || '$') THEN
    RAISE EXCEPTION 'Solo se permiten correos institucionales @%.', domain;
  END IF;

  IF matricula_val IS NULL OR matricula_val = '' THEN
    RAISE EXCEPTION 'La matrícula es obligatoria.';
  END IF;

  IF nombre_val IS NULL OR nombre_val = '' OR apellidos_val IS NULL OR apellidos_val = '' THEN
    RAISE EXCEPTION 'Nombre y apellidos son obligatorios.';
  END IF;

  IF telefono_val IS NULL OR telefono_val = '' THEN
    RAISE EXCEPTION 'El teléfono es obligatorio.';
  END IF;

  INSERT INTO public.profiles (id, matricula, nombre, apellidos, telefono, email)
  VALUES (NEW.id, matricula_val, nombre_val, apellidos_val, telefono_val, user_email);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
