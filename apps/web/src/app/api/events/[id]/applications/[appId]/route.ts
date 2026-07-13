import { NextResponse } from 'next/server';
import type { Profile, VendorApplicationStatus } from '@uteq/shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestUser } from '@/lib/supabase/request-auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  const { id, appId } = await params;
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const p = profile as Profile | null;
    if (!p || p.role !== 'admin_general') {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 });
    }

    const body = (await request.json()) as { status?: VendorApplicationStatus };
    if (!body.status || !['aceptado', 'rechazado', 'pendiente'].includes(body.status)) {
      return NextResponse.json({ error: 'status inválido' }, { status: 400 });
    }

    if (body.status === 'aceptado') {
      const { data: event } = await admin.from('campus_events').select('max_vendors').eq('id', id).maybeSingle();
      const { count } = await admin
        .from('event_vendor_applications')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)
        .eq('status', 'aceptado');
      if (event && (count ?? 0) >= (event.max_vendors as number)) {
        return NextResponse.json({ error: 'Cupo lleno' }, { status: 400 });
      }
    }

    const { data, error } = await admin
      .from('event_vendor_applications')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', appId)
      .eq('event_id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al revisar solicitud' },
      { status: 500 },
    );
  }
}
