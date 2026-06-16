import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRegister } from '@uteq/shared';

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { url, key };
}

export async function POST(request: Request) {
  const { url, key } = getSupabaseEnv();

  if (!url || !key) {
    return NextResponse.json(
      { error: 'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en Railway.' },
      { status: 500 },
    );
  }

  if (!url.includes('supabase.co')) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL incorrecta. Debe ser https://xxxxx.supabase.co' },
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    ?? new URL(request.url).origin;
  const email = registerInput.email.trim().toLowerCase();

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: registerInput.password,
    options: {
      data: {
        matricula: registerInput.matricula.trim(),
        nombre: registerInput.nombre.trim(),
        apellidos: registerInput.apellidos.trim(),
        telefono: registerInput.telefono.trim(),
      },
      emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    },
  });

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
