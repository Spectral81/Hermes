import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestUser } from '@/lib/supabase/request-auth';

function normalizeCode(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('wearable_devices')
      .select('id, device_code, label, active, last_sos_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al listar pulseras' },
      { status: 500 },
    );
  }
}

/** Vincular pulsera: el alumno escribe el código de la etiqueta / firmware. */
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = (await request.json()) as { device_code?: string; label?: string };
    const deviceCode = normalizeCode(body.device_code);
    if (!/^[A-Z0-9-]{4,32}$/.test(deviceCode)) {
      return NextResponse.json(
        { error: 'Código inválido. Usa 4–32 caracteres (A-Z, 0-9, guion).' },
        { status: 400 },
      );
    }

    const label = (body.label?.trim() || 'Pulsera SOS').slice(0, 60);
    const admin = createAdminClient();

    const { data: existing, error: findErr } = await admin
      .from('wearable_devices')
      .select('id, user_id')
      .eq('device_code', deviceCode)
      .maybeSingle();

    if (findErr) throw new Error(findErr.message);

    if (existing) {
      if (existing.user_id === user.id) {
        return NextResponse.json({ error: 'Esta pulsera ya está vinculada a tu cuenta.' }, { status: 409 });
      }
      return NextResponse.json(
        { error: 'Ese código ya está vinculado a otra cuenta.' },
        { status: 409 },
      );
    }

    const { data, error } = await admin
      .from('wearable_devices')
      .insert({
        device_code: deviceCode,
        user_id: user.id,
        label,
        active: true,
      })
      .select('id, device_code, label, active, last_sos_at, created_at')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al vincular pulsera' },
      { status: 500 },
    );
  }
}
