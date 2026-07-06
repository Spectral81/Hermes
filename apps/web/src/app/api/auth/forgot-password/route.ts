import { NextResponse } from 'next/server';
import { isUteqEmail } from '@uteq/shared';
import { sendPasswordResetEmail } from '@/lib/auth/auth-email';
import { isBrevoConfigured } from '@/lib/notifications/brevo';

function requestOrigin(request: Request): string | undefined {
  const host = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host.split(',')[0].trim()}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isBrevoConfigured()) {
    return NextResponse.json(
      { error: 'Correo no configurado. Agrega BREVO_API_KEY y BREVO_FROM_EMAIL en Railway.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const email = String((body as { email?: string }).email ?? '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'El correo es obligatorio.' }, { status: 400 });
  }

  if (!isUteqEmail(email)) {
    return NextResponse.json({ error: 'Usa tu correo institucional @uteq.edu.mx.' }, { status: 400 });
  }

  const origin = requestOrigin(request);
  const result = await sendPasswordResetEmail({ to: email, requestOrigin: origin });

  if (!result.ok) {
    console.error('[forgot-password]', email, result.error);
    return NextResponse.json(
      { error: result.error ?? 'No se pudo enviar el correo.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId ?? null,
    message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
  });
}
