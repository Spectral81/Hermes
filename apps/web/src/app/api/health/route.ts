import { NextResponse } from 'next/server';
import { getBrevoStatus } from '@/lib/notifications/brevo';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = 'invalid';
  }

  const brevo = getBrevoStatus();

  return NextResponse.json({
    ok: true,
    supabaseHost: host,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    email: {
      brevoConfigured: brevo.configured,
      brevoApiKeyValid: brevo.apiKeyLooksValid,
      brevoFromEmail: brevo.fromEmail,
      brevoFromName: brevo.fromName,
      ready: brevo.configured && brevo.apiKeyLooksValid,
      hint: !brevo.configured
        ? 'Agrega BREVO_API_KEY y BREVO_FROM_EMAIL en Railway.'
        : !brevo.apiKeyLooksValid
          ? 'BREVO_API_KEY debe empezar con xkeysib- (API key, no SMTP).'
          : 'Verifica el remitente en Brevo → Senders y revisa spam.',
    },
  });
}
