interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendBrevoEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
  const fromName = process.env.BREVO_FROM_NAME?.trim() ?? 'HERMES UTEQ';

  if (!apiKey || !fromEmail) {
    return { ok: false, error: 'Faltan BREVO_API_KEY o BREVO_FROM_EMAIL.' };
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

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body || `Brevo HTTP ${res.status}` };
  }

  return { ok: true };
}

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim() && process.env.BREVO_FROM_EMAIL?.trim());
}

export function getBrevoSmtpSettings() {
  return {
    host: process.env.BREVO_SMTP_HOST?.trim() || 'smtp-relay.brevo.com',
    port: Number(process.env.BREVO_SMTP_PORT?.trim() || '587'),
    user: process.env.BREVO_SMTP_USER?.trim() || '',
    key: process.env.BREVO_SMTP_KEY?.trim() || '',
  };
}
