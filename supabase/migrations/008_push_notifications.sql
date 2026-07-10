-- Push notifications (FCM): tokens de dispositivo + estado "verificado"
-- Ejecutar en Supabase SQL Editor después de 004_incidents.sql.

-- 1) Tabla de tokens de dispositivo (uno o varios por usuario).
CREATE TABLE IF NOT EXISTS public.device_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON public.device_tokens(user_id);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_tokens_select_own" ON public.device_tokens;
CREATE POLICY "device_tokens_select_own"
  ON public.device_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_tokens_modify_own" ON public.device_tokens;
CREATE POLICY "device_tokens_modify_own"
  ON public.device_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Alta/actualización del token del usuario actual (llamado por la app).
CREATE OR REPLACE FUNCTION public.upsert_device_token(
  p_token TEXT,
  p_platform TEXT DEFAULT 'android',
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  INSERT INTO public.device_tokens (token, user_id, platform, lat, lng, updated_at)
  VALUES (p_token, uid, COALESCE(p_platform, 'android'), p_lat, p_lng, now())
  ON CONFLICT (token) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      platform = EXCLUDED.platform,
      lat = COALESCE(EXCLUDED.lat, public.device_tokens.lat),
      lng = COALESCE(EXCLUDED.lng, public.device_tokens.lng),
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_device_token(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- 3) Estado "verificado" del incidente (cuando alcanza 3 validaciones).
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 4) toggle_incident_like ahora marca verified al llegar a 3 y lo devuelve.
-- Postgres no permite cambiar el tipo de retorno con CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.toggle_incident_like(UUID);

CREATE FUNCTION public.toggle_incident_like(p_incident_id UUID)
RETURNS TABLE (likes_count INT, liked BOOLEAN, verified BOOLEAN, verified_now BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  exists_vote BOOLEAN;
  new_count INT;
  now_liked BOOLEAN;
  was_verified BOOLEAN;
  is_verified BOOLEAN;
  just_verified BOOLEAN := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT i.verified INTO was_verified FROM public.incidents i WHERE i.id = p_incident_id;

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

  is_verified := COALESCE(was_verified, false);
  IF new_count >= 3 AND NOT COALESCE(was_verified, false) THEN
    is_verified := true;
    just_verified := true;
  END IF;

  UPDATE public.incidents
  SET likes_count = new_count,
      verified = is_verified,
      verified_at = CASE WHEN just_verified THEN now() ELSE verified_at END
  WHERE id = p_incident_id;

  RETURN QUERY SELECT new_count, now_liked, is_verified, just_verified;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_incident_like(UUID) TO authenticated;

-- 5) Tokens cercanos a una coordenada (haversine), para el envío server-side.
CREATE OR REPLACE FUNCTION public.nearby_device_tokens(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 1500
)
RETURNS TABLE (token TEXT, user_id UUID, distance_m DOUBLE PRECISION)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.token, t.user_id, t.distance_m
  FROM (
    SELECT
      d.token,
      d.user_id,
      (6371000 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(p_lat)) * cos(radians(d.lat)) *
          cos(radians(d.lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(d.lat))
        ))
      )) AS distance_m
    FROM public.device_tokens d
    WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL
  ) t
  WHERE t.distance_m <= p_radius_m
  ORDER BY t.distance_m ASC
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_device_tokens(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, service_role;
