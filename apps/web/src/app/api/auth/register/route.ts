import { NextResponse } from 'next/server';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateRegister } from '@uteq/shared';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createAuthUserWithAdmin,
  prepareRegistrationSlots,
} from '@/lib/auth/registration-slots';
import { sendWelcomeEmail } from '@/lib/auth/auth-email';

function isValidSupabaseUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.supabase.co');
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
      { error: `URL incorrecta: "${url}". Debe terminar en .supabase.co (NO .com).` },
      { status: 500 },
    );
  }

  if (!key.startsWith('eyJ')) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY incorrecta. Usa el anon JWT (eyJ...).' },
      { status: 400 },
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

  const email = registerInput.email.trim().toLowerCase();
  const password = registerInput.password;

  const slot = await prepareRegistrationSlots(email, registerInput.matricula.trim());
  if (!slot.ok) {
    return NextResponse.json({ error: slot.error, code: 'already_registered' }, { status: slot.status });
  }

  let userId: string | undefined;

  try {
    const admin = createAdminClient();
    const { data: created, error: createError } = await createAuthUserWithAdmin(admin, {
      email,
      password,
      matricula: registerInput.matricula,
      nombre: registerInput.nombre,
      apellidos: registerInput.apellidos,
      telefono: registerInput.telefono,
    });

    if (createError) {
      const msg = createError.message ?? 'No se pudo crear el usuario.';
      if (/already|registered|exists|duplicate/i.test(msg)) {
        return NextResponse.json(
          { error: 'Este correo ya está registrado. Inicia sesión.', code: 'already_registered' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: msg, code: createError.code }, { status: 400 });
    }

    userId = created.user?.id;
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Falta SUPABASE_SERVICE_ROLE_KEY en Railway.',
        code: 'confirm_failed',
      },
      { status: 503 },
    );
  }

  if (!userId) {
    return NextResponse.json({ error: 'No se pudo crear el usuario.' }, { status: 500 });
  }

  void sendWelcomeEmail({
    to: email,
    nombre: registerInput.nombre,
    requestOrigin: new URL(request.url).origin,
  }).catch((err) => console.error('[welcome-email]', err));

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll: ((cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // route handler can set cookies
        }
      }) satisfies SetAllCookies,
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    const loginMsg =
      signInError.message?.trim() ||
      'Cuenta creada pero no se pudo iniciar sesión. Prueba iniciar sesión manualmente.';
    return NextResponse.json(
      {
        error: loginMsg,
        code: signInError.code ?? 'login_after_register_failed',
        needsVerification: loginMsg.includes('Email not confirmed'),
        email,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true, email, autoLogin: true });
}
