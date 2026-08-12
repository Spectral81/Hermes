-- Pulseras / ESP32 de pánico vinculadas a un alumno

CREATE TABLE IF NOT EXISTS public.wearable_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Pulsera SOS',
  active BOOLEAN NOT NULL DEFAULT true,
  last_sos_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wearable_devices_code_format CHECK (device_code ~ '^[A-Z0-9-]{4,32}$')
);

CREATE INDEX IF NOT EXISTS wearable_devices_user_idx ON public.wearable_devices(user_id);
CREATE INDEX IF NOT EXISTS wearable_devices_code_idx ON public.wearable_devices(device_code);

ALTER TABLE public.wearable_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wearables_select_own" ON public.wearable_devices;
CREATE POLICY "wearables_select_own"
  ON public.wearable_devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wearables_insert_own" ON public.wearable_devices;
CREATE POLICY "wearables_insert_own"
  ON public.wearable_devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wearables_update_own" ON public.wearable_devices;
CREATE POLICY "wearables_update_own"
  ON public.wearable_devices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wearables_delete_own" ON public.wearable_devices;
CREATE POLICY "wearables_delete_own"
  ON public.wearable_devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wearables_select_admin" ON public.wearable_devices;
CREATE POLICY "wearables_select_admin"
  ON public.wearable_devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_general'
    )
  );
