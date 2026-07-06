import { NextResponse } from 'next/server';
import { isUteqEmail } from '@uteq/shared';
import { getBrevoStatus, isBrevoConfigured, sendBrevoEmail } from '@/lib/notifications/brevo';
import { buildWelcomeEmailHtml } from '@/lib/notifications/email-templates';
import { getPublicAppUrl } from '@/lib/config';

export async function POST(request: Request) {
  const secret = process.env.EMAIL_TEST_SECRET?.trim();
  const headerSecret = request.headers.get('x-email-test-secret')?.trim();

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  if (!isBrevoConfigured()) {
    return NextResponse.json(
      { error: 'Brevo no configurado correctamente.', status: getBrevoStatus() },
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
    return NextResponse.json({ error: 'Indica email.' }, { status: 400 });
  }

  if (!isUteqEmail(email)) {
    return NextResponse.json({ error: 'Usa un correo @uteq.edu.mx.' }, { status: 400 });
  }

  const appUrl = getPublicAppUrl(new URL(request.url).origin);
  const result = await sendBrevoEmail({
    to: email,
    subject: 'Prueba HERMES UTEQ — correo de diagnóstico',
    html: buildWelcomeEmailHtml({ nombre: 'Prueba', appUrl }),
    text: `Correo de prueba HERMES UTEQ. Si lo ves, Brevo funciona. ${appUrl}`,
  });

  return NextResponse.json({
    ...result,
    brevoStatus: getBrevoStatus(),
  }, { status: result.ok ? 200 : 500 });
}
