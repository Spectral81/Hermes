import { INCIDENT_LABELS, isCriticalIncidentType, type IncidentType } from '@uteq/shared';

interface WhatsAppInput {
  toPhoneE164: string;
  type: IncidentType;
  description: string;
  lat: number;
  lng: number;
}

/** WhatsApp solo para alertas críticas (robo y SOS/pánico). Requiere Meta Cloud API o Twilio. */
export async function sendCriticalWhatsApp(
  input: WhatsAppInput,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isCriticalIncidentType(input.type)) {
    return { ok: true, skipped: true };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneId) {
    return { ok: false, error: 'Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.' };
  }

  const label = INCIDENT_LABELS[input.type];
  const body = [
    `🚨 *HERMES UTEQ — ${label}*`,
    input.description || 'Sin descripción',
    `📍 ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}`,
    'Valida en la app si es real.',
  ].join('\n');

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: input.toPhoneE164.replace(/\D/g, ''),
      type: 'text',
      text: { body },
    }),
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
