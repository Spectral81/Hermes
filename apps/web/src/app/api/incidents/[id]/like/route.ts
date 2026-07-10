import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { dispatchVerifiedPush } from '@/lib/notifications/dispatch-push';
import { createClient } from '@/lib/supabase/server';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

async function getUserSupabase(request: Request): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error('Faltan variables de Supabase.');

  let accessToken = extractBearerToken(request);
  if (!accessToken) {
    const ssr = await createClient();
    const {
      data: { session },
    } = await ssr.auth.getSession();
    accessToken = session?.access_token ?? null;
  }

  return createSupabaseClient(url, anonKey, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const supabase = await getUserSupabase(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: rpcRows, error } = await supabase.rpc('toggle_incident_like', {
      p_incident_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as {
      likes_count?: number;
      liked?: boolean;
      verified?: boolean;
      verified_now?: boolean;
    } | null;

    const likesCount = row?.likes_count ?? 0;
    const liked = row?.liked ?? false;
    const verified = row?.verified ?? false;
    const verifiedNow = row?.verified_now ?? false;

    if (verifiedNow) {
      const { data: incident } = await supabase
        .from('incidents')
        .select('type, description, lat, lng')
        .eq('id', id)
        .maybeSingle();

      if (incident) {
        void dispatchVerifiedPush({
          incidentId: id,
          type: incident.type,
          description: incident.description ?? '',
          lat: incident.lat,
          lng: incident.lng,
        }).catch((e) => console.error('[push/verified]', e));
      }
    }

    return NextResponse.json({
      likes_count: likesCount,
      liked,
      verified,
      verified_now: verifiedNow,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al votar.' },
      { status: 500 },
    );
  }
}
