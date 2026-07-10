import { NextResponse } from 'next/server';
import type { IncidentType } from '@uteq/shared';
import { dispatchVerifiedPush } from '@/lib/notifications/dispatch-push';
import { getRequestUser } from '@/lib/supabase/request-auth';

/** Dispara push a todos los usuarios cuando un reporte alcanza 3 validaciones. */
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = (await request.json()) as {
      incidentId?: string;
      type?: IncidentType;
      description?: string;
      lat?: number;
      lng?: number;
    };

    if (!body.incidentId || !body.type) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    void dispatchVerifiedPush({
      incidentId: body.incidentId,
      type: body.type,
      description: body.description ?? '',
      lat: body.lat ?? 0,
      lng: body.lng ?? 0,
    }).catch((e) => console.error('[push/incident-verified]', e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al enviar push.' },
      { status: 500 },
    );
  }
}
