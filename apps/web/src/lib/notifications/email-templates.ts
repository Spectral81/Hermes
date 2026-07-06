function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(title: string, body: string, appUrl: string): string {
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(appUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:#1d4ed8;padding:24px 28px;">
              <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">HERMES UTEQ</div>
              <div style="color:#dbeafe;font-size:13px;margin-top:4px;">Seguridad en campus</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;color:#6b7280;font-size:12px;line-height:1.6;">
              Este correo fue enviado por HERMES UTEQ. Si no solicitaste esta acción, ignóralo.
              <br />
              <a href="${safeUrl}" style="color:#1d4ed8;">${safeUrl}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  const safeLabel = escapeHtml(label);
  const safeHref = escapeHtml(href);
  return `<a href="${safeHref}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;margin-top:8px;">${safeLabel}</a>`;
}

export function buildWelcomeEmailHtml(input: { nombre: string; appUrl: string }): string {
  const nombre = escapeHtml(input.nombre.trim() || 'Estudiante');
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">¡Bienvenido, ${nombre}!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Tu cuenta en HERMES UTEQ ya está activa. Puedes reportar incidentes, validar alertas y consultar el mapa del campus.
    </p>
    ${ctaButton('Abrir HERMES', `${input.appUrl}/mapa`)}
  `;
  return layout('Bienvenido a HERMES UTEQ', body, input.appUrl);
}

export function buildVerificationEmailHtml(input: { link: string; appUrl: string }): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Confirma tu correo</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Para activar tu cuenta institucional, confirma tu correo @uteq.edu.mx con el botón de abajo.
    </p>
    ${ctaButton('Confirmar correo', input.link)}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
      <span style="word-break:break-all;">${escapeHtml(input.link)}</span>
    </p>
  `;
  return layout('Confirma tu correo — HERMES UTEQ', body, input.appUrl);
}

export function buildPasswordResetEmailHtml(input: { link: string; appUrl: string }): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Restablece tu contraseña</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Recibimos una solicitud para cambiar la contraseña de tu cuenta HERMES UTEQ.
      El enlace expira en poco tiempo por seguridad.
    </p>
    ${ctaButton('Crear nueva contraseña', input.link)}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
      Si no solicitaste este cambio, puedes ignorar este correo.
    </p>
  `;
  return layout('Restablece tu contraseña — HERMES UTEQ', body, input.appUrl);
}

export function buildIncidentEmailHtml(input: {
  typeLabel: string;
  description: string;
  lat: number;
  lng: number;
  appUrl: string;
}): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Nueva alerta en campus</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;">
      <strong>Tipo:</strong> ${escapeHtml(input.typeLabel)}
    </p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;">
      <strong>Descripción:</strong> ${escapeHtml(input.description || 'Sin descripción')}
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      <strong>Ubicación:</strong> ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}
    </p>
    ${ctaButton('Ver en el mapa', `${input.appUrl}/mapa`)}
  `;
  return layout('Nueva alerta — HERMES UTEQ', body, input.appUrl);
}
