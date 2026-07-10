import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isFcmConfigured } from '@/lib/notifications/fcm';
import {
  isSosWhatsAppReady,
  isWhatsAppConfigured,
  whatsAppSendMode,
} from '@/lib/notifications/whatsapp';

/** Diagnóstico: FCM / WhatsApp SOS / teléfonos (sin exponer secretos). */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('device_tokens')
      .select('*', { count: 'exact', head: true });

    const { count: withGps } = await admin
      .from('device_tokens')
      .select('*', { count: 'exact', head: true })
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    const { count: profilesActive } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const { count: profilesWithPhone } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .not('telefono', 'is', null)
      .neq('telefono', '');

    const mode = whatsAppSendMode();

    let hint = 'OK';
    if (!isFcmConfigured()) {
      hint =
        'Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en Railway';
    } else if (!isWhatsAppConfigured()) {
      hint = 'WhatsApp SOS: faltan WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID';
    } else if (!isSosWhatsAppReady()) {
      hint =
        'WhatsApp SOS: configura WHATSAPP_TEMPLATE_NAME (producción) o WHATSAPP_ALLOW_TEXT=true (pruebas)';
    } else if ((profilesWithPhone ?? 0) === 0) {
      hint =
        'Ningún perfil tiene telefono — UPDATE profiles SET telefono = \'5512345678\' WHERE email = \'...\'';
    } else if (mode === 'template') {
      hint =
        'Modo plantilla: si está pendiente en Meta, pon WHATSAPP_ALLOW_TEXT=true para pruebas';
    } else if ((count ?? 0) === 0) {
      hint = 'No hay tokens push — abre la app en cada teléfono con sesión y GPS';
    }

    return NextResponse.json({
      fcmConfigured: isFcmConfigured(),
      whatsAppConfigured: isWhatsAppConfigured(),
      sosWhatsAppReady: isSosWhatsAppReady(),
      whatsAppMode: mode,
      profilesActive: profilesActive ?? 0,
      profilesWithPhone: profilesWithPhone ?? 0,
      deviceTokens: error ? null : count ?? 0,
      deviceTokensWithGps: withGps ?? 0,
      hint,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error de diagnóstico' },
      { status: 500 },
    );
  }
}
