import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isFcmConfigured } from '@/lib/notifications/fcm';
import { isSosWhatsAppReady, isWhatsAppConfigured } from '@/lib/notifications/whatsapp';

/** Diagnóstico: FCM configurado y tokens registrados (sin exponer secretos). */
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

    return NextResponse.json({
      fcmConfigured: isFcmConfigured(),
      whatsAppConfigured: isWhatsAppConfigured(),
      sosWhatsAppReady: isSosWhatsAppReady(),
      deviceTokens: error ? null : count ?? 0,
      deviceTokensWithGps: withGps ?? 0,
      hint: !isFcmConfigured()
        ? 'Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en Railway'
        : !isWhatsAppConfigured()
          ? 'WhatsApp SOS: faltan WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID'
          : !isSosWhatsAppReady()
            ? 'WhatsApp SOS: configura WHATSAPP_TEMPLATE_NAME (producción) o WHATSAPP_ALLOW_TEXT=true (pruebas)'
            : (count ?? 0) === 0
              ? 'No hay tokens — abre la app en cada teléfono con sesión y GPS'
              : 'OK',
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error de diagnóstico' },
      { status: 500 },
    );
  }
}
