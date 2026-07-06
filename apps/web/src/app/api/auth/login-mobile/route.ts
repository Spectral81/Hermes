import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateLogin } from '@uteq/shared';

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return NextResponse.json({ error: 'Faltan variables de Supabase en el servidor.' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const { email, password } = body as { email?: string; password?: string };
  const validationError = validateLogin({ email: email ?? '', password: password ?? '' });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email!.trim().toLowerCase(),
    password: password!,
  });

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 401 });
  }

  if (!data.session) {
    return NextResponse.json({ error: 'No se pudo crear la sesión.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
