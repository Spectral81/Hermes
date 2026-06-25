import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json({ error: 'Sin perfil de demostración.' }, { status: 500 });
    }

    const { data: existing } = await admin
      .from('incident_votes')
      .select('incident_id')
      .eq('incident_id', id)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      await admin.from('incident_votes').delete().eq('incident_id', id).eq('user_id', profile.id);
    } else {
      await admin.from('incident_votes').insert({ incident_id: id, user_id: profile.id });
    }

    const { count } = await admin
      .from('incident_votes')
      .select('*', { count: 'exact', head: true })
      .eq('incident_id', id);

    const likes = count ?? 0;
    await admin.from('incidents').update({ likes_count: likes }).eq('id', id);

    return NextResponse.json({ likes_count: likes, liked: !existing });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al votar.' },
      { status: 500 },
    );
  }
}
