import { NextResponse } from 'next/server';
import type { IncidentType } from '@uteq/shared';
import { dispatchNearbyValidationPush } from '@/lib/notifications/dispatch-push';
import { getRequestUser } from '@/lib/supabase/request-auth';

/** Dispara push de validación cercana tras crear un incidente vía RPC (app móvil). */
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

    if (!body.incidentId || !body.type || body.lat == null || body.lng == null) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    void dispatchNearbyValidationPush({
      incidentId: body.incidentId,
      type: body.type,
      description: body.description ?? '',
      lat: body.lat,
      lng: body.lng,
      createdBy: user.id,
    }).catch((e) => console.error('[push/incident-created]', e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al enviar push.' },
      { status: 500 },
    );
  }
}
