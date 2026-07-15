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

/** Notifica al usuario que su solicitud fue aceptada. */
export async function dispatchApplicationAcceptedPush(input: {
  userId: string;
  eventId: string;
  eventTitle: string;
  businessName: string;
}): Promise<void> {
  if (!isFcmConfigured()) return;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('device_tokens')
    .select('token')
    .eq('user_id', input.userId);

  if (error) {
    console.error('[push/event-accepted]', error.message);
    return;
  }

  const tokens = (data ?? []).map((r) => r.token as string).filter(Boolean);
  if (tokens.length === 0) return;

  const result = await sendFcmToTokens(tokens, {
    title: '¡Participación aceptada! 🎉',
    body: `Tu negocio "${input.businessName}" fue aceptado en ${input.eventTitle}.`,
    data: {
      event_id: input.eventId,
      action: 'event_accepted',
    },
  });

  console.info('[push] event application accepted', {
    userId: input.userId,
    eventId: input.eventId,
    tokens: tokens.length,
    ...result,
  });
}

