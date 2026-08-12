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

const waLastSentByRecipient = new Map<string, number>();

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeRecipientForRules(raw: string): string {
  const digits = digitsOnly(raw);
  if (!digits) return '';
  if (digits.startsWith('521') && digits.length === 13) return `52${digits.slice(3)}`;
  if (digits.startsWith('52') && digits.length === 12) return digits;
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

function parseRecipientAllowlist(): Set<string> {
  const raw = process.env.WHATSAPP_TEST_RECIPIENTS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((item) => normalizeRecipientForRules(item.trim()))
      .filter(Boolean),
  );
}

function parseCooldownMs(): number {
  const raw = process.env.WHATSAPP_MIN_INTERVAL_SECONDS?.trim();
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 10 * 60 * 1000; // 10 min default
  return parsed * 1000;
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
      const allowlist = parseRecipientAllowlist();
      const cooldownMs = parseCooldownMs();
      const now = Date.now();
      const eligible = withPhone.filter((u) => {
        const normalized = normalizeRecipientForRules(u.telefono!.trim());
        if (!normalized) return false;
        if (allowlist.size > 0 && !allowlist.has(normalized)) return false;
        const last = waLastSentByRecipient.get(normalized);
        if (typeof last === 'number' && now - last < cooldownMs) {
          console.info('[whatsapp/sos] omitido por cooldown', {
            phone: normalized,
            secondsLeft: Math.ceil((cooldownMs - (now - last)) / 1000),
          });
          return false;
        }
        return true;
      });
      console.info('[whatsapp/sos] destinatarios', {
        incidentId: input.incidentId,
        total: withPhone.length,
        elegibles: eligible.length,
        filtroPruebas: allowlist.size > 0,
        cooldownSeconds: Math.round(cooldownMs / 1000),
      });

      if (eligible.length === 0) {
        console.warn('[whatsapp/sos] sin destinatarios elegibles (allowlist/cooldown)');
      } else {
        const authorName = await resolveAuthorName(admin, input.createdBy, recipients);
        for (const user of eligible) {
          const phone = user.telefono!.trim();
          const e164 = phone.startsWith('+') ? phone : `+52${phone}`;
          const normalized = normalizeRecipientForRules(phone);
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
                return;
              }
              waLastSentByRecipient.set(normalized, Date.now());
            }),
          );
        }
      }
    }
  }

  await Promise.allSettled(tasks);
}
