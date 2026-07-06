import { getPublicAppUrl } from '@/lib/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { isBrevoConfigured, sendBrevoEmail } from '@/lib/notifications/brevo';
import {
  buildPasswordResetEmailHtml,
  buildVerificationEmailHtml,
  buildWelcomeEmailHtml,
} from '@/lib/notifications/email-templates';

function authRedirectUrl(requestOrigin?: string): string {
  const appUrl = getPublicAppUrl(requestOrigin);
  return `${appUrl}/auth/callback?next=/mapa`;
}

async function generateEmailActionLink(
  email: string,
  requestOrigin?: string,
): Promise<{ link: string | null; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: email.trim().toLowerCase(),
    options: { redirectTo: authRedirectUrl(requestOrigin) },
  });

  if (error) return { link: null, error: error.message };
  const link = data.properties?.action_link ?? null;
  return link ? { link } : { link: null, error: 'No se pudo generar el enlace de verificación.' };
}

async function generateRecoveryLink(
  email: string,
  requestOrigin?: string,
): Promise<{ link: string | null; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim().toLowerCase(),
    options: { redirectTo: authRedirectUrl(requestOrigin) },
  });

  if (error) return { link: null, error: error.message };
  const link = data.properties?.action_link ?? null;
  return link ? { link } : { link: null, error: 'No se pudo generar el enlace de recuperación.' };
}

export async function sendWelcomeEmail(input: {
  to: string;
  nombre: string;
  requestOrigin?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isBrevoConfigured()) {
    return { ok: false, skipped: true, error: 'Brevo no configurado.' };
  }

  const appUrl = getPublicAppUrl(input.requestOrigin);
  return sendBrevoEmail({
    to: input.to,
    subject: 'Bienvenido a HERMES UTEQ',
    html: buildWelcomeEmailHtml({ nombre: input.nombre, appUrl }),
    text: `Bienvenido a HERMES UTEQ. Tu cuenta ya está activa. Abre ${appUrl}/mapa`,
  });
}

export async function sendVerificationEmail(input: {
  to: string;
  requestOrigin?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isBrevoConfigured()) {
    return { ok: false, skipped: true, error: 'Brevo no configurado.' };
  }

  const { link, error: linkError } = await generateEmailActionLink(input.to, input.requestOrigin);
  if (!link) {
    return { ok: false, error: linkError ?? 'No se pudo generar el enlace.' };
  }

  const appUrl = getPublicAppUrl(input.requestOrigin);
  return sendBrevoEmail({
    to: input.to,
    subject: 'Confirma tu correo — HERMES UTEQ',
    html: buildVerificationEmailHtml({ link, appUrl }),
    text: `Confirma tu correo en HERMES UTEQ: ${link}`,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  requestOrigin?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isBrevoConfigured()) {
    return { ok: false, skipped: true, error: 'Brevo no configurado.' };
  }

  const { link, error: linkError } = await generateRecoveryLink(input.to, input.requestOrigin);
  if (!link) {
    return { ok: false, error: linkError ?? 'No se pudo generar el enlace.' };
  }

  const appUrl = getPublicAppUrl(input.requestOrigin);
  return sendBrevoEmail({
    to: input.to,
    subject: 'Restablece tu contraseña — HERMES UTEQ',
    html: buildPasswordResetEmailHtml({ link, appUrl }),
    text: `Restablece tu contraseña en HERMES UTEQ: ${link}`,
  });
}
