import { NextResponse } from 'next/server';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateLogin } from '@uteq/shared';

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return NextResponse.json({ error: 'Faltan variables de Supabase en Railway.' }, { status: 500 });
  }

  let validHost = false;
  try {
    validHost = new URL(url).hostname.endsWith('.supabase.co');
  } catch {
    validHost = false;
  }

  if (!validHost || !key.startsWith('eyJ')) {
    return NextResponse.json(
      { error: 'URL debe ser https://xxxxx.supabase.co (NO .com). Revisa Railway.' },
      { status: 500 },
    );
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

  const { error } = await supabase.auth.signInWithPassword({
    email: email!.trim().toLowerCase(),
    password: password!,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 401 },
    );
  }

  const normalizedEmail = email!.trim().toLowerCase();

  // Asegura que exista perfil y lee rol de forma consistente
  // en el mismo request de login.
  let redirectTo = '/mapa';
  const { data: ensuredProfile, error: ensureError } = await supabase.rpc('ensure_my_profile');
  let role = (ensuredProfile as { role?: string } | null)?.role;

  // Fallback para cuentas semilla de roles cuando el RPC falle temporalmente
  // o el profile aún no esté disponible en esta solicitud.
  if (!role) {
    if (normalizedEmail === 'admin@uteq.edu.mx') role = 'admin_general';
    if (normalizedEmail === 'robos@uteq.edu.mx') role = 'responsable_robos';
    if (normalizedEmail === 'emergencias@uteq.edu.mx') role = 'responsable_accidentes';
    if (normalizedEmail === 'infraestructura@uteq.edu.mx') role = 'responsable_infraestructura';
  }

  if (
    role === 'admin_general' ||
    role === 'responsable_robos' ||
    role === 'responsable_accidentes' ||
    role === 'responsable_infraestructura'
  ) {
    redirectTo = '/dashboard';
  }

  // Si falla ensure_my_profile, no bloqueamos login; solo informativo para diagnóstico.
  return NextResponse.json({
    ok: true,
    redirectTo,
    role: role ?? 'estudiante',
    ensureProfileWarning: ensureError?.message ?? null,
  });
}
