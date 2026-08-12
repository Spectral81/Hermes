import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestUser } from '@/lib/supabase/request-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Ctx) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const admin = createAdminClient();
    const { data: row } = await admin
      .from('wearable_devices')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (!row) return NextResponse.json({ error: 'Pulsera no encontrada' }, { status: 404 });
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { error } = await admin.from('wearable_devices').delete().eq('id', id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al desvincular' },
      { status: 500 },
    );
  }
}
