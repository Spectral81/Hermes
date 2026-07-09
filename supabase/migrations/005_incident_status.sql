-- Cambio de estado de incidentes con control por rol.
-- admin_general: cualquier tipo.
-- responsable_robos: robo.
-- responsable_accidentes (emergencias): accidente y panico (SOS).
-- responsable_infraestructura: infraestructura.

CREATE OR REPLACE FUNCTION public.set_incident_status(
  p_incident_id UUID,
  p_status TEXT
)
RETURNS public.incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  my_role TEXT;
  inc public.incidents;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_status NOT IN ('activo', 'en_proceso', 'cerrado', 'rechazado') THEN
    RAISE EXCEPTION 'Estado inválido: %', p_status;
  END IF;

  SELECT role INTO my_role FROM public.profiles WHERE id = uid;
  IF my_role IS NULL THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  SELECT * INTO inc FROM public.incidents WHERE id = p_incident_id;
  IF inc.id IS NULL THEN
    RAISE EXCEPTION 'Reporte no encontrado';
  END IF;

  IF my_role <> 'admin_general' THEN
    IF my_role = 'responsable_robos' AND inc.type <> 'robo' THEN
      RAISE EXCEPTION 'Sin permiso para gestionar este tipo de reporte';
    ELSIF my_role = 'responsable_accidentes' AND inc.type NOT IN ('accidente', 'panico') THEN
      RAISE EXCEPTION 'Sin permiso para gestionar este tipo de reporte';
    ELSIF my_role = 'responsable_infraestructura' AND inc.type <> 'infraestructura' THEN
      RAISE EXCEPTION 'Sin permiso para gestionar este tipo de reporte';
    ELSIF my_role = 'estudiante' THEN
      RAISE EXCEPTION 'Sin permiso para gestionar reportes';
    END IF;
  END IF;

  UPDATE public.incidents
  SET status = p_status
  WHERE id = p_incident_id
  RETURNING * INTO inc;

  RETURN inc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_incident_status(UUID, TEXT) TO authenticated;

-- Listado para panel: incluye reportes cerrados/rechazados (últimos 30 días),
-- con datos del autor. Cualquier autenticado puede leer; el filtrado por rol
-- se hace en el cliente/panel.
CREATE OR REPLACE FUNCTION public.list_incidents_admin()
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
  WHERE i.created_at > now() - INTERVAL '30 days'
  ORDER BY i.created_at DESC
  LIMIT 1000;
$$;

GRANT EXECUTE ON FUNCTION public.list_incidents_admin() TO authenticated;
