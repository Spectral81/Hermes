-- Incidentes (reportes) + votos tipo "like" estilo Waze

CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('robo', 'accidente', 'infraestructura', 'panico')),
  category TEXT CHECK (category IN ('agua', 'electricidad', 'internet', 'instalaciones', 'equipamiento')),
  severity TEXT CHECK (severity IN ('leve', 'moderado', 'grave')),
  description TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'en_proceso', 'cerrado', 'rechazado')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidents_status_idx ON public.incidents(status);
CREATE INDEX IF NOT EXISTS incidents_type_idx ON public.incidents(type);
CREATE INDEX IF NOT EXISTS incidents_created_at_idx ON public.incidents(created_at DESC);

CREATE TABLE IF NOT EXISTS public.incident_votes (
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (incident_id, user_id)
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_votes ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados ven incidentes
DROP POLICY IF EXISTS "incidents_select_all" ON public.incidents;
CREATE POLICY "incidents_select_all"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (true);

-- Crear su propio reporte
DROP POLICY IF EXISTS "incidents_insert_own" ON public.incidents;
CREATE POLICY "incidents_insert_own"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Borrar su propio reporte
DROP POLICY IF EXISTS "incidents_delete_own" ON public.incidents;
CREATE POLICY "incidents_delete_own"
  ON public.incidents FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Votos
DROP POLICY IF EXISTS "votes_select_all" ON public.incident_votes;
CREATE POLICY "votes_select_all"
  ON public.incident_votes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "votes_insert_own" ON public.incident_votes;
CREATE POLICY "votes_insert_own"
  ON public.incident_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "votes_delete_own" ON public.incident_votes;
CREATE POLICY "votes_delete_own"
  ON public.incident_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Crear reporte (devuelve la fila creada)
CREATE OR REPLACE FUNCTION public.create_incident(
  p_type TEXT,
  p_description TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_category TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL
)
RETURNS public.incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  row public.incidents;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  INSERT INTO public.incidents (type, category, severity, description, lat, lng, created_by)
  VALUES (
    p_type,
    NULLIF(p_category, ''),
    NULLIF(p_severity, ''),
    COALESCE(p_description, ''),
    p_lat,
    p_lng,
    uid
  )
  RETURNING * INTO row;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_incident(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT) TO authenticated;

-- Dar / quitar like; devuelve nuevo conteo y estado
CREATE OR REPLACE FUNCTION public.toggle_incident_like(p_incident_id UUID)
RETURNS TABLE (likes_count INT, liked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  exists_vote BOOLEAN;
  new_count INT;
  now_liked BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.incident_votes v
    WHERE v.incident_id = p_incident_id AND v.user_id = uid
  ) INTO exists_vote;

  IF exists_vote THEN
    DELETE FROM public.incident_votes
    WHERE incident_id = p_incident_id AND user_id = uid;
    now_liked := false;
  ELSE
    INSERT INTO public.incident_votes (incident_id, user_id)
    VALUES (p_incident_id, uid)
    ON CONFLICT DO NOTHING;
    now_liked := true;
  END IF;

  SELECT count(*)::INT INTO new_count
  FROM public.incident_votes
  WHERE incident_id = p_incident_id;

  UPDATE public.incidents
  SET likes_count = new_count
  WHERE id = p_incident_id;

  RETURN QUERY SELECT new_count, now_liked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_incident_like(UUID) TO authenticated;

-- Listar incidentes activos con datos del autor y si el usuario actual dio like
CREATE OR REPLACE FUNCTION public.list_incidents()
RETURNS TABLE (
  id UUID,
  type TEXT,
  category TEXT,
  severity TEXT,
  description TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT,
  likes_count INT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  author_nombre TEXT,
  liked_by_me BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.type, i.category, i.severity, i.description,
    i.lat, i.lng, i.status, i.likes_count, i.created_at, i.created_by,
    p.nombre AS author_nombre,
    EXISTS (
      SELECT 1 FROM public.incident_votes v
      WHERE v.incident_id = i.id AND v.user_id = auth.uid()
    ) AS liked_by_me
  FROM public.incidents i
  LEFT JOIN public.profiles p ON p.id = i.created_by
  WHERE i.status <> 'cerrado'
  ORDER BY i.created_at DESC
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.list_incidents() TO authenticated;
