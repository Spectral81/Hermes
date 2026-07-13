-- Eventos de campus (ferias) y solicitudes de puestos/negocios
CREATE TABLE public.campus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_label TEXT NOT NULL DEFAULT '',
  max_vendors INTEGER NOT NULL DEFAULT 20 CHECK (max_vendors > 0),
  status TEXT NOT NULL DEFAULT 'abierto'
    CHECK (status IN ('abierto', 'cerrado')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX campus_events_status_idx ON public.campus_events(status);
CREATE INDEX campus_events_created_at_idx ON public.campus_events(created_at DESC);

CREATE TABLE public.event_vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.campus_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  what_they_sell TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'comida'
    CHECK (category IN ('comida', 'snacks', 'bebidas', 'postres', 'otro')),
  status TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'aceptado', 'rechazado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX event_apps_event_idx ON public.event_vendor_applications(event_id);
CREATE INDEX event_apps_status_idx ON public.event_vendor_applications(status);

ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vendor_applications ENABLE ROW LEVEL SECURITY;

-- Lectura abierta autenticada
CREATE POLICY "events_select_auth"
  ON public.campus_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "events_insert_admin"
  ON public.campus_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_general' AND p.active
    )
  );

CREATE POLICY "events_update_admin"
  ON public.campus_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_general' AND p.active
    )
  );

CREATE POLICY "apps_select_auth"
  ON public.event_vendor_applications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_general' AND p.active
    )
    OR (
      status = 'aceptado'
      AND EXISTS (
        SELECT 1 FROM public.campus_events e WHERE e.id = event_id
      )
    )
  );

CREATE POLICY "apps_insert_own"
  ON public.event_vendor_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "apps_update_admin"
  ON public.event_vendor_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_general' AND p.active
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.campus_events TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.event_vendor_applications TO authenticated, service_role;
