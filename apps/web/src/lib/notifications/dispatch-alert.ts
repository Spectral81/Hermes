import { INCIDENT_LABELS, type IncidentType } from '@uteq/shared';
import { getPublicAppUrl } from '@/lib/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildIncidentEmailHtml } from '@/lib/notifications/email-templates';
import { isBrevoConfigured, sendBrevoEmail } from './brevo';
import { isWhatsAppConfigured, sendCriticalWhatsApp } from './whatsapp';

export interface DispatchAlertInput {
  incidentId: string;
  type: IncidentType;
  description: string;
  lat: number;
  lng: number;
}

/** Envía email (Brevo), push (pendiente) y WhatsApp crítico tras crear un incidente. */
export async function dispatchIncidentAlerts(input: DispatchAlertInput): Promise<void> {
  const admin = createAdminClient();
  const { data: recipients } = await admin
    .from('profiles')
    .select('email, telefono')
    .eq('active', true)
    .limit(200);

  if (!recipients?.length) return;

  const typeLabel = INCIDENT_LABELS[input.type];
  const appUrl = getPublicAppUrl();
  const subject = `HERMES UTEQ — Nueva alerta: ${typeLabel}`;
  const html = buildIncidentEmailHtml({
    typeLabel,
    description: input.description,
    lat: input.lat,
    lng: input.lng,
    appUrl,
  });

  const tasks: Promise<unknown>[] = [];

  if (isBrevoConfigured()) {
    for (const user of recipients) {
      if (!user.email) continue;
      tasks.push(
        sendBrevoEmail({ to: user.email, subject, html }).catch((e) => {
          console.error('[brevo]', user.email, e);
        }),
      );
    }
  }

  if (isWhatsAppConfigured()) {
    for (const user of recipients) {
      if (!user.telefono) continue;
      const e164 = user.telefono.startsWith('+') ? user.telefono : `+52${user.telefono}`;
      tasks.push(
        sendCriticalWhatsApp({
          toPhoneE164: e164,
          type: input.type,
          description: input.description,
          lat: input.lat,
          lng: input.lng,
        }).catch((e) => {
          console.error('[whatsapp]', user.telefono, e);
        }),
      );
    }
  }

  // Push: registrar tokens en tabla push_tokens + Expo Push API (próximo paso).
  await Promise.allSettled(tasks);
}
