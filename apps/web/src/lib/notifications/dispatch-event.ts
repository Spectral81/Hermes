import { INCIDENT_LABELS, type IncidentType } from '@uteq/shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { isFcmConfigured, sendFcmToTokens } from './fcm';

/** Notifica a todos los dispositivos un nuevo evento de campus. */
export async function dispatchEventCreatedPush(input: {
  eventId: string;
  title: string;
  locationLabel?: string;
}): Promise<void> {
  if (!isFcmConfigured()) return;

  const admin = createAdminClient();
  const { data, error } = await admin.from('device_tokens').select('token');
  if (error) {
    console.error('[push/event]', error.message);
    return;
  }

  const tokens = (data ?? []).map((r) => r.token as string).filter(Boolean);
  if (tokens.length === 0) return;

  const result = await sendFcmToTokens(tokens, {
    title: `Nuevo evento · ${input.title}`,
    body: input.locationLabel
      ? `${input.locationLabel} — Abre Eventos para participar.`
      : 'Abre Eventos para ver detalles y participar.',
    data: {
      event_id: input.eventId,
      action: 'event',
    },
  });

  console.info('[push] event created', { eventId: input.eventId, tokens: tokens.length, ...result });
}

/** Re-export for typing convenience in routes. */
export type { IncidentType };
export { INCIDENT_LABELS };
