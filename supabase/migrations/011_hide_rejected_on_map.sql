-- Ocultar incidentes rechazados del feed público del mapa (igual que cerrado).
-- list_incidents_admin() sigue mostrando rechazados para el panel admin.

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
  WHERE i.status NOT IN ('cerrado', 'rechazado')
  ORDER BY i.created_at DESC
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.list_incidents() TO authenticated;
