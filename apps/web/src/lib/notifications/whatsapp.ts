import { isSosIncidentType, type IncidentType } from '@uteq/shared';

export interface SosWhatsAppInput {
  toPhoneE164: string;
  authorName: string;
  lat: number;
  lng: number;
  description?: string;
}

function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('52') && digits.length >= 12) return digits;
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Alerta SOS por WhatsApp — solo mensajes salientes (plantilla Meta).
 * No hay conversación: los usuarios solo reciben el aviso con ubicación.
 */
export async function sendSosWhatsApp(
  input: SosWhatsAppInput,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneId) {
    return { ok: false, error: 'Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.' };
  }

  const to = normalizePhoneE164(input.toPhoneE164);
  const location = mapsLink(input.lat, input.lng);
  const coords = formatCoords(input.lat, input.lng);
  const who = input.authorName.trim() || 'Un usuario de HERMES';
  const detail = (input.description?.trim() || 'Sin detalle adicional').slice(0, 200);

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'es_MX';
  const allowText = process.env.WHATSAPP_ALLOW_TEXT?.trim() === 'true';

  const bodyText = [
    '🚨 *ALERTA SOS — HERMES UTEQ*',
    '',
    `${who} está en peligro.`,
    detail !== 'Sin detalle adicional' ? detail : null,
    '',
    `📍 Ubicación: ${location}`,
    `Coordenadas: ${coords}`,
    '',
    'Este es un mensaje automático. No respondas a este chat.',
  ]
    .filter(Boolean)
    .join('\n');

  const payload = templateName
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: who },
                { type: 'text', text: location },
                { type: 'text', text: coords },
              ],
            },
          ],
        },
      }
    : allowText
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: bodyText },
        }
      : null;

  if (!payload) {
    return {
      ok: false,
      error:
        'Configura WHATSAPP_TEMPLATE_NAME (producción) o WHATSAPP_ALLOW_TEXT=true (solo pruebas).',
    };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err || `WhatsApp HTTP ${res.status}` };
  }

  return { ok: true };
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

export function isSosWhatsAppReady(): boolean {
  if (!isWhatsAppConfigured()) return false;
  return (
    Boolean(process.env.WHATSAPP_TEMPLATE_NAME?.trim()) ||
    process.env.WHATSAPP_ALLOW_TEXT?.trim() === 'true'
  );
}

/** @deprecated Usar sendSosWhatsApp — WhatsApp es solo para SOS. */
export async function sendCriticalWhatsApp(input: {
  toPhoneE164: string;
  type: IncidentType;
  description: string;
  lat: number;
  lng: number;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isSosIncidentType(input.type)) {
    return { ok: true, skipped: true };
  }
  return sendSosWhatsApp({
    toPhoneE164: input.toPhoneE164,
    authorName: 'Un usuario de HERMES',
    lat: input.lat,
    lng: input.lng,
    description: input.description,
  });
}
