import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestUser } from '@/lib/supabase/request-auth';

/** Eventos del usuario (aceptados o pendientes) próximos / de hoy. */
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: apps, error } = await admin
      .from('event_vendor_applications')
      .select('id, status, business_name, event_id')
      .eq('user_id', user.id)
      .in('status', ['pendiente', 'aceptado'])
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!apps?.length) return NextResponse.json([]);

    const eventIds = [...new Set(apps.map((a) => a.event_id as string))];
    const { data: events } = await admin.from('campus_events').select('*').in('id', eventIds);

    const eventsById = new Map((events ?? []).map((e) => [e.id as string, e]));
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const list = apps
      .map((app) => {
        const event = eventsById.get(app.event_id as string);
        if (!event) return null;
        return {
          application_id: app.id,
          application_status: app.status,
          business_name: app.business_name,
          event,
        };
      })
      .filter(Boolean)
      .filter((row) => {
        const startsAt = row!.event.starts_at as string | null;
        if (!startsAt) return true;
        return new Date(startsAt).getTime() >= startOfToday.getTime();
      })
      .sort((a, b) => {
        const ta = a!.event.starts_at ? new Date(a!.event.starts_at as string).getTime() : Infinity;
        const tb = b!.event.starts_at ? new Date(b!.event.starts_at as string).getTime() : Infinity;
        return ta - tb;
      });

    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al cargar eventos' },
      { status: 500 },
    );
  }
}
