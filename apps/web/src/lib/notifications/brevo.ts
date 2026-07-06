interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendBrevoResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  brevoCode?: string;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function getBrevoStatus() {
  const apiKey = process.env.BREVO_API_KEY?.trim() ?? '';
  const fromEmail = process.env.BREVO_FROM_EMAIL?.trim() ?? '';
  return {
    configured: Boolean(apiKey && fromEmail),
    fromEmail: fromEmail ? maskEmail(fromEmail) : null,
    apiKeyLooksValid: apiKey.startsWith('xkeysib-'),
    fromName: process.env.BREVO_FROM_NAME?.trim() ?? 'HERMES UTEQ',
  };
}

export async function sendBrevoEmail(input: SendEmailInput): Promise<SendBrevoResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
  const fromName = process.env.BREVO_FROM_NAME?.trim() ?? 'HERMES UTEQ';

  if (!apiKey || !fromEmail) {
    return { ok: false, error: 'Faltan BREVO_API_KEY o BREVO_FROM_EMAIL en Railway.' };
  }

  if (!apiKey.startsWith('xkeysib-')) {
    return {
      ok: false,
      error:
        'BREVO_API_KEY incorrecta. Usa la API key (xkeysib-...), NO la contraseña SMTP de Brevo.',
    };
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: input.to.trim().toLowerCase() }],
      subject: input.subject,
      htmlContent: input.html,
      ...(input.text ? { textContent: input.text } : {}),
    }),
  });

  const raw = await res.text();
  let parsed: { messageId?: string; message?: string; code?: string } | null = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const msg = parsed?.message ?? raw ?? `Brevo HTTP ${res.status}`;
    console.error('[brevo] send failed', res.status, msg);
    return { ok: false, error: msg, brevoCode: parsed?.code };
  }

  console.info('[brevo] sent', { to: maskEmail(input.to), messageId: parsed?.messageId });
  return { ok: true, messageId: parsed?.messageId };
}

export function isBrevoConfigured(): boolean {
  return getBrevoStatus().configured && getBrevoStatus().apiKeyLooksValid;
}

export function getBrevoSmtpSettings() {
  return {
    host: process.env.BREVO_SMTP_HOST?.trim() || 'smtp-relay.brevo.com',
    port: Number(process.env.BREVO_SMTP_PORT?.trim() || '587'),
    user: process.env.BREVO_SMTP_USER?.trim() || '',
    key: process.env.BREVO_SMTP_KEY?.trim() || '',
  };
}
