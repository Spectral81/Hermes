import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchIncidentAlerts } from '@/lib/notifications/dispatch-alert';

const CAMPUS_FALLBACK = { lat: 20.6534, lng: -100.4045 };
const SOS_COOLDOWN_MS = 30_000;

function normalizeCode(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * Endpoint para ESP32 (pulsera SOS).
 * Auth: header X-Hermes-Device-Key = WEARABLE_SOS_KEY
 * Body: { device_code, lat?, lng? }
 */
export async function POST(request: Request) {
  try {
    const expectedKey = process.env.WEARABLE_SOS_KEY?.trim();
    if (!expectedKey) {
      return NextResponse.json(
        { error: 'Falta WEARABLE_SOS_KEY en el servidor.' },
        { status: 503 },
      );
    }

    const provided =
      request.headers.get('X-Hermes-Device-Key')?.trim() ||
      request.headers.get('x-hermes-device-key')?.trim() ||
      '';
    if (!provided || provided !== expectedKey) {
      return NextResponse.json({ error: 'Clave de dispositivo inválida' }, { status: 401 });
    }

    const body = (await request.json()) as {
      device_code?: string;
      lat?: number;
      lng?: number;
    };

    const deviceCode = normalizeCode(body.device_code);
    if (!deviceCode) {
      return NextResponse.json({ error: 'device_code requerido' }, { status: 400 });
    }

    let lat = Number(body.lat);
    let lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      lat = CAMPUS_FALLBACK.lat;
      lng = CAMPUS_FALLBACK.lng;
    }

    const admin = createAdminClient();
    const { data: device, error: deviceErr } = await admin
      .from('wearable_devices')
      .select('id, user_id, active, label, last_sos_at')
      .eq('device_code', deviceCode)
      .maybeSingle();

    if (deviceErr) throw new Error(deviceErr.message);
    if (!device) {
      return NextResponse.json(
        { error: 'Pulsera no vinculada. El alumno debe registrar el código en su perfil.' },
        { status: 404 },
      );
    }
    if (!device.active) {
      return NextResponse.json({ error: 'Pulsera desactivada' }, { status: 403 });
    }

    if (device.last_sos_at) {
      const elapsed = Date.now() - new Date(device.last_sos_at).getTime();
      if (elapsed < SOS_COOLDOWN_MS) {
        return NextResponse.json(
          { error: 'Espera unos segundos antes de enviar otro SOS.', retry_in_ms: SOS_COOLDOWN_MS - elapsed },
          { status: 429 },
        );
      }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id, nombre, apellidos, matricula')
      .eq('id', device.user_id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Cuenta del alumno no encontrada' }, { status: 404 });
    }

    const fullName = `${profile.nombre} ${profile.apellidos}`.trim();
    const description = `SOS desde pulsera (${device.label}). Alumno: ${fullName}${
      profile.matricula ? ` · ${profile.matricula}` : ''
    }.`;

    const { data: incident, error: incErr } = await admin
      .from('incidents')
      .insert({
        type: 'panico',
        description,
        lat,
        lng,
        created_by: device.user_id,
        status: 'activo',
      })
      .select('id, type, description, lat, lng, status, created_at, created_by')
      .single();

    if (incErr) throw new Error(incErr.message);

    await admin
      .from('wearable_devices')
      .update({ last_sos_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', device.id);

    void dispatchIncidentAlerts({
      incidentId: String(incident.id),
      type: 'panico',
      description,
      lat,
      lng,
      createdBy: device.user_id,
    }).catch((err) => console.error('[sos/device dispatch]', err));

    return NextResponse.json({
      ok: true,
      incident_id: incident.id,
      user: {
        id: profile.id,
        nombre: fullName,
        matricula: profile.matricula,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al registrar SOS' },
      { status: 500 },
    );
  }
}
