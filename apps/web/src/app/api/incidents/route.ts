import { NextResponse } from 'next/server';
import type { CreateIncidentInput } from '@uteq/shared';
import { createAdminClient } from '@/lib/supabase/admin';

function normalizeIncident(raw: Record<string, unknown>) {
  return {
    id: String(raw.id),
    type: raw.type,
    category: raw.category ?? null,
    severity: raw.severity ?? null,
    description: String(raw.description ?? ''),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    status: raw.status ?? 'activo',
    likes_count: Number(raw.likes_count ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    created_by: String(raw.created_by),
    author_nombre: (raw.author_nombre as string | null) ?? null,
    liked_by_me: false,
  };
}

async function listIncidentsFromDb() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('incidents')
    .select(
      'id, type, category, severity, description, lat, lng, status, likes_count, created_at, created_by',
    )
    .neq('status', 'cerrado')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const authorIds = [...new Set(rows.map((r) => String(r.created_by)).filter(Boolean))];

  const namesById = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, nombre').in('id', authorIds);
    for (const profile of profiles ?? []) {
      namesById.set(String(profile.id), profile.nombre);
    }
  }

  return rows.map((row) =>
    normalizeIncident({
      ...row,
      author_nombre: namesById.get(String(row.created_by)) ?? null,
    }),
  );
}

export async function GET() {
  try {
    const incidents = await listIncidentsFromDb();
    return NextResponse.json(incidents);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al cargar reportes.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateIncidentInput;
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json(
        { error: 'No hay perfiles en la base de datos para asociar el reporte.' },
        { status: 500 },
      );
    }

    const { data, error } = await admin
      .from('incidents')
      .insert({
        type: body.type,
        description: body.description ?? '',
        lat: body.lat,
        lng: body.lng,
        category: body.category ?? null,
        severity: body.severity ?? null,
        created_by: profile.id,
        status: 'activo',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: author } = await admin
      .from('profiles')
      .select('nombre')
      .eq('id', profile.id)
      .maybeSingle();

    return NextResponse.json(
      normalizeIncident({
        ...(data as Record<string, unknown>),
        author_nombre: author?.nombre ?? null,
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear reporte.' },
      { status: 500 },
    );
  }
}
