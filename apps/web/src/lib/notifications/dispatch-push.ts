import { INCIDENT_LABELS, type IncidentType } from '@uteq/shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { isFcmConfigured, sendFcmToTokens } from './fcm';

const VALIDATION_RADIUS_M = 1500;
const VALIDATION_TYPES: IncidentType[] = ['robo', 'accidente'];

export interface PushIncidentInput {
  incidentId: string;
  type: IncidentType;
  description: string;
  lat: number;
  lng: number;
  createdBy?: string;
}

/** Push a usuarios cercanos para validar un reporte (robo y accidente). */
export async function dispatchNearbyValidationPush(input: PushIncidentInput): Promise<void> {
  if (!isFcmConfigured()) {
    console.warn('[push] FCM no configurado en Railway — omitiendo push cercano');
    return;
  }
  if (!VALIDATION_TYPES.includes(input.type)) {
    console.info('[push] tipo no requiere validación cercana:', input.type);
    return;
  }

  const admin = createAdminClient();
  const { data: nearby, error } = await admin.rpc('nearby_device_tokens', {
    p_lat: input.lat,
    p_lng: input.lng,
    p_radius_m: VALIDATION_RADIUS_M,
  });

  if (error) {
    console.error('[push] nearby_device_tokens', error.message);
    return;
  }

  const rows = (nearby ?? []) as { token: string; user_id: string }[];
  const tokens = rows
    .filter((r) => !input.createdBy || r.user_id !== input.createdBy)
    .map((r) => r.token);

  if (tokens.length === 0) {
    console.warn('[push] sin tokens cercanos con GPS — revisa device_tokens en Supabase');
    return;
  }

  const typeLabel = INCIDENT_LABELS[input.type];
  const snippet = input.description.trim().slice(0, 80) || typeLabel;

  const result = await sendFcmToTokens(tokens, {
    title: `Validar reporte · ${typeLabel}`,
    body: `${snippet} — ¿Está cerca? Ayuda a confirmarlo.`,
    data: {
      incident_id: input.incidentId,
      action: 'validate',
      type: input.type,
    },
  });

  console.info('[push] nearby validation', {
    incidentId: input.incidentId,
    tokens: tokens.length,
    ...result,
  });
}

/** Push a todos los usuarios cuando un reporte alcanza 3 validaciones. */
export async function dispatchVerifiedPush(input: PushIncidentInput): Promise<void> {
  if (!isFcmConfigured()) return;

  const admin = createAdminClient();
  const { data, error } = await admin.from('device_tokens').select('token');

  if (error) {
    console.error('[push] device_tokens', error.message);
    return;
  }

  const tokens = (data ?? []).map((r) => r.token as string).filter(Boolean);
  if (tokens.length === 0) return;

  const typeLabel = INCIDENT_LABELS[input.type];
  const snippet = input.description.trim().slice(0, 80) || typeLabel;

  const result = await sendFcmToTokens(tokens, {
    title: `Alerta verificada · ${typeLabel}`,
    body: `La comunidad confirmó: "${snippet}"`,
    data: {
      incident_id: input.incidentId,
      action: 'verified',
      type: input.type,
    },
  });

  console.info('[push] verified broadcast', {
    incidentId: input.incidentId,
    tokens: tokens.length,
    ...result,
  });
}
