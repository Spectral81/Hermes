import { isSosIncidentType, type IncidentType } from '@uteq/shared';

export interface SosWhatsAppInput {
  toPhoneE164: string;
  authorName: string;
  lat: number;
  lng: number;
  description?: string;
}

/**
 * Formato para el campo `to` de Cloud API.
 * En MX la lista de prueba de Meta suele validar 52 + 10 dígitos (ej. 524427807590).
 * El wa_id del webhook puede ser 521…; eso es interno y no siempre sirve como `to`.
 */
function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // 521XXXXXXXXXX (wa_id) → 52XXXXXXXXXX para el envío
  if (digits.startsWith('521') && digits.length === 13) {
    return `52${digits.slice(3)}`;
  }
  // Ya es 52 + 10 dígitos
  if (digits.startsWith('52') && digits.length === 12) return digits;
  // 10 dígitos locales
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function buildTemplatePayload(
  to: string,
  templateName: string,
  templateLang: string,
  who: string,
  location: string,
  coords: string,
): Record<string, unknown> {
  // hello_world (plantilla de prueba de Meta) no lleva variables.
  const isHelloWorld = templateName === 'hello_world';

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: isHelloWorld ? 'en_US' : templateLang },
      ...(isHelloWorld
        ? {}
        : {
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
          }),
    },
  };
}

/**
 * Alerta SOS por WhatsApp — solo mensajes salientes.
 * Prioriza plantilla (es lo que Meta entrega de verdad).
 * Texto libre solo como fallback: Meta a menudo lo acepta (200) pero no lo entrega.
 */
export async function sendSosWhatsApp(
  input: SosWhatsAppInput,
): Promise<{ ok: boolean; skipped?: boolean; error?: string; mode?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneId) {
    return { ok: false, error: 'Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.' };
  }

  const to = normalizePhoneE164(input.toPhoneE164);
  if (!to || to.length < 10) {
    return { ok: false, error: `Teléfono inválido: ${input.toPhoneE164}` };
  }

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

  let mode: 'text' | 'template';
  let payload: Record<string, unknown>;

  // Plantilla primero: el test de Meta (hello_world) llega; el texto libre a menudo no.
  if (templateName) {
    mode = 'template';
    payload = buildTemplatePayload(to, templateName, templateLang, who, location, coords);
  } else if (allowText) {
    mode = 'text';
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: bodyText },
    };
  } else {
    return {
      ok: false,
      error:
        'Configura WHATSAPP_TEMPLATE_NAME (ej. hello_world o hermes_sos_alerta).',
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
    console.error('[whatsapp/sos] Meta error', { to, mode, templateName, err });
    return { ok: false, error: err || `WhatsApp HTTP ${res.status}`, mode };
  }

  const data = (await res.json().catch(() => null)) as {
    messages?: { id?: string }[];
  } | null;
  const messageId = data?.messages?.[0]?.id;

  console.info('[whatsapp/sos] enviado', { to, mode, templateName, messageId });
  return { ok: true, mode };
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

export function whatsAppSendMode(): 'text' | 'template' | 'none' {
  if (!isWhatsAppConfigured()) return 'none';
  if (process.env.WHATSAPP_TEMPLATE_NAME?.trim()) return 'template';
  if (process.env.WHATSAPP_ALLOW_TEXT?.trim() === 'true') return 'text';
  return 'none';
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
