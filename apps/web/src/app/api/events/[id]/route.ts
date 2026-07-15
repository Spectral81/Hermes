import { NextResponse } from 'next/server';
import type { CreateVendorApplicationInput, Profile } from '@uteq/shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestUser } from '@/lib/supabase/request-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await getRequestUser(request);
    const admin = createAdminClient();
    const { data: event, error } = await admin.from('campus_events').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });

    const { data: apps } = await admin
      .from('event_vendor_applications')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: false });

    const userIds = [...new Set((apps ?? []).map((a) => a.user_id as string))];
    const names = new Map<string, string>();
    if (userIds.length) {
      const { data: profiles } = await admin.from('profiles').select('id, nombre, apellidos').in('id', userIds);
      for (const p of profiles ?? []) {
        names.set(p.id, `${p.nombre} ${p.apellidos}`.trim());
      }
    }

    let myApplication = null;
    if (user) {
      const mine = (apps ?? []).find((a) => a.user_id === user.id);
      if (mine) {
        myApplication = {
          ...mine,
          author_nombre: names.get(mine.user_id as string) ?? null,
        };
      }
    }

    return NextResponse.json({
      event,
      applications: (apps ?? []).map((a) => ({
        ...a,
        author_nombre: names.get(a.user_id as string) ?? null,
      })),
      my_application: myApplication,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al cargar evento' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const p = profile as Profile | null;
    if (!p || p.role !== 'admin_general') {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 });
    }

    const body = (await request.json()) as { status?: 'abierto' | 'cerrado' };
    if (!body.status) return NextResponse.json({ error: 'status requerido' }, { status: 400 });

    const { data, error } = await admin
      .from('campus_events')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al actualizar' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = (await request.json()) as CreateVendorApplicationInput;
    if (!body.business_name?.trim() || !body.what_they_sell?.trim() || !body.category) {
      return NextResponse.json({ error: 'Completa el formulario' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: event } = await admin.from('campus_events').select('*').eq('id', id).maybeSingle();
    if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    if (event.status !== 'abierto') {
      return NextResponse.json({ error: 'El evento está cerrado' }, { status: 400 });
    }

    const { count } = await admin
      .from('event_vendor_applications')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'aceptado');

    if ((count ?? 0) >= (event.max_vendors as number)) {
      return NextResponse.json({ error: 'Ya no hay cupo de puestos' }, { status: 400 });
    }

    const { data: existing } = await admin
      .from('event_vendor_applications')
      .select('id, status')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const statusLabel =
        existing.status === 'aceptado'
          ? 'aceptada'
          : existing.status === 'pendiente'
            ? 'pendiente de revisión'
            : 'registrada';
      return NextResponse.json(
        { error: `Ya tienes una solicitud ${statusLabel} para este evento.` },
        { status: 409 },
      );
    }

    const { data, error } = await admin
      .from('event_vendor_applications')
      .insert({
        event_id: id,
        user_id: user.id,
        business_name: body.business_name.trim(),
        group_name: body.group_name?.trim() ?? '',
        what_they_sell: body.what_they_sell.trim(),
        category: body.category,
        status: 'pendiente',
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al postular' },
      { status: 500 },
    );
  }
}
