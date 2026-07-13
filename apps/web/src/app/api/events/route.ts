import { NextResponse } from 'next/server';
import type { CreateCampusEventInput, Profile } from '@uteq/shared';
import { dispatchEventCreatedPush } from '@/lib/notifications/dispatch-event';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestUser } from '@/lib/supabase/request-auth';

async function requireProfile(userId: string): Promise<Profile | null> {
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: events, error } = await admin
      .from('campus_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    const ids = (events ?? []).map((e) => e.id as string);
    const counts = new Map<string, { accepted: number; pending: number }>();
    if (ids.length) {
      const { data: apps } = await admin
        .from('event_vendor_applications')
        .select('event_id, status')
        .in('event_id', ids);
      for (const a of apps ?? []) {
        const cur = counts.get(a.event_id as string) ?? { accepted: 0, pending: 0 };
        if (a.status === 'aceptado') cur.accepted += 1;
        if (a.status === 'pendiente') cur.pending += 1;
        counts.set(a.event_id as string, cur);
      }
    }

    const list = (events ?? []).map((e) => {
      const c = counts.get(e.id as string) ?? { accepted: 0, pending: 0 };
      return {
        ...e,
        accepted_count: c.accepted,
        pending_count: c.pending,
      };
    });

    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al cargar eventos' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const profile = await requireProfile(user.id);
    if (!profile || profile.role !== 'admin_general') {
      return NextResponse.json({ error: 'Solo admin general puede crear eventos' }, { status: 403 });
    }

    const body = (await request.json()) as CreateCampusEventInput;
    if (!body.title?.trim() || body.lat == null || body.lng == null || !body.max_vendors) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('campus_events')
      .insert({
        title: body.title.trim(),
        description: body.description?.trim() ?? '',
        lat: body.lat,
        lng: body.lng,
        location_label: body.location_label?.trim() ?? '',
        max_vendors: body.max_vendors,
        starts_at: body.starts_at ?? null,
        ends_at: body.ends_at ?? null,
        created_by: user.id,
        status: 'abierto',
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    void dispatchEventCreatedPush({
      eventId: data.id,
      title: data.title,
      locationLabel: data.location_label,
    }).catch((err) => console.error('[dispatchEventCreatedPush]', err));

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear evento' },
      { status: 500 },
    );
  }
}
