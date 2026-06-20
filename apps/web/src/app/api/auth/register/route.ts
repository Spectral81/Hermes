import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRegister } from '@uteq/shared';

function getRequestAppUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;

  const host = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host.split(',')[0].trim()}`;

  return new URL(request.url).origin;
}

function isValidSupabaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return NextResponse.json(
      { error: 'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en Railway.' },
      { status: 500 },
    );
  }

  if (!isValidSupabaseUrl(url)) {
    return NextResponse.json(
      { error: `URL incorrecta: "${url}". Debe ser https://azgcdrbkzfmnsimwqkwv.supabase.co (termina en .co, NO .com).` },
      { status: 500 },
    );
  }

  if (!key.startsWith('eyJ')) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY incorrecta. Usa el anon JWT (eyJ...).' },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const input = body as Record<string, string>;
  const registerInput = {
    matricula: input.matricula ?? '',
    nombre: input.nombre ?? '',
    apellidos: input.apellidos ?? '',
    telefono: input.telefono ?? '',
    email: input.email ?? '',
    password: input.password ?? '',
  };

  const validationError = validateRegister(registerInput);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const appUrl = getRequestAppUrl(request);
  const email = registerInput.email.trim().toLowerCase();

  const supabase = createClient(url, key);

  let data;
  let error;
  try {
    ({ data, error } = await supabase.auth.signUp({
    email,
    password: registerInput.password,
    options: {
      data: {
        matricula: registerInput.matricula.trim(),
        nombre: registerInput.nombre.trim(),
        apellidos: registerInput.apellidos.trim(),
        telefono: registerInput.telefono.trim(),
      },
      emailRedirectTo: `${appUrl}/auth/callback?next=/mapa`,
    },
  }));
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'Error de red';
    return NextResponse.json(
      { error: `No se pudo conectar a Supabase (${detail}). URL en Railway: ${url}` },
      { status: 502 },
    );
  }

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, status: error.status },
      { status: 400 },
    );
  }

  if (data.user?.identities?.length === 0) {
    return NextResponse.json({ error: 'Este correo ya está registrado.' }, { status: 409 });
  }

  return NextResponse.json({ ok: true, email });
}
