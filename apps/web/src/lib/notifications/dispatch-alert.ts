import { INCIDENT_LABELS, isSosIncidentType, type IncidentType } from '@uteq/shared';
import { getPublicAppUrl } from '@/lib/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildIncidentEmailHtml } from '@/lib/notifications/email-templates';
import { isBrevoConfigured, sendBrevoEmail } from './brevo';
import { dispatchNearbyValidationPush } from './dispatch-push';
import { isSosWhatsAppReady, isWhatsAppConfigured, sendSosWhatsApp } from './whatsapp';

export interface DispatchAlertInput {
  incidentId: string;
  type: IncidentType;
  description: string;
  lat: number;
  lng: number;
  createdBy?: string;
}

async function resolveAuthorName(
  admin: ReturnType<typeof createAdminClient>,
  createdBy: string | undefined,
  recipients: { id: string; nombre?: string | null }[],
): Promise<string> {
  if (!createdBy) return 'Un usuario de HERMES';

  const fromList = recipients.find((r) => r.id === createdBy)?.nombre;
  if (fromList?.trim()) return fromList.trim();

  const { data } = await admin.from('profiles').select('nombre').eq('id', createdBy).maybeSingle();
  return data?.nombre?.trim() || 'Un usuario de HERMES';
}

/** Envía email, WhatsApp SOS (solo pánico) y push cercano tras crear un incidente (web o móvil). */
export async function dispatchIncidentAlerts(input: DispatchAlertInput): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  // Push cercano primero: no depende de perfiles/email/WhatsApp.
  // Robo y accidente → usuarios cerca reciben "Validar reporte".
  tasks.push(
    dispatchNearbyValidationPush({
      incidentId: input.incidentId,
      type: input.type,
      description: input.description,
      lat: input.lat,
      lng: input.lng,
      createdBy: input.createdBy,
    }).catch((e) => console.error('[push] nearby', e)),
  );

  const admin = createAdminClient();
  const { data: recipients } = await admin
    .from('profiles')
    .select('id, email, telefono, nombre')
    .eq('active', true)
    .limit(500);

  if (!recipients?.length) {
    console.warn('[dispatch] sin perfiles activos — push cercano igual se intentó');
    await Promise.allSettled(tasks);
    return;
  }

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

  if (isBrevoConfigured()) {
    for (const user of recipients) {
      if (!user.email) continue;
      tasks.push(
        sendBrevoEmail({ to: user.email, subject, html }).then((result) => {
          if (!result.ok) {
            console.error('[brevo] alert email failed', user.email, result.error);
          }
        }),
      );
    }
  }

  // WhatsApp: solo SOS/pánico — a TODOS con teléfono.
  if (isSosIncidentType(input.type) && isWhatsAppConfigured()) {
    if (!isSosWhatsAppReady()) {
      console.warn(
        '[whatsapp/sos] Configura WHATSAPP_TEMPLATE_NAME o WHATSAPP_ALLOW_TEXT=true para pruebas',
      );
    } else {
      const withPhone = recipients.filter((u) => Boolean(u.telefono?.trim()));
      console.info('[whatsapp/sos] destinatarios', {
        incidentId: input.incidentId,
        total: withPhone.length,
      });

      if (withPhone.length === 0) {
        console.warn('[whatsapp/sos] ningún perfil activo tiene telefono en Supabase');
      } else {
        const authorName = await resolveAuthorName(admin, input.createdBy, recipients);
        for (const user of withPhone) {
          const phone = user.telefono!.trim();
          const e164 = phone.startsWith('+') ? phone : `+52${phone}`;
          tasks.push(
            sendSosWhatsApp({
              toPhoneE164: e164,
              authorName,
              lat: input.lat,
              lng: input.lng,
              description: input.description,
            }).then((result) => {
              if (!result.ok && !result.skipped) {
                console.error('[whatsapp/sos] falló', phone, result.error);
              }
            }),
          );
        }
      }
    }
  }

  await Promise.allSettled(tasks);
}
